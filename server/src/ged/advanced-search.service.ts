import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchFacet {
  field: string;
  label: string;
  values: { value: string; count: number; label?: string }[];
}

export interface SearchQuery {
  query?: string;
  filters?: { [key: string]: string[] };
  facets?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  page?: number;
  size?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  size: number;
  path: string;
  score: number;
  highlights: { [key: string]: string[] };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: SearchFacet[];
  suggestions: string[];
  took: number;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);

  constructor(private prisma: PrismaService) {}

  async search(query: SearchQuery, userId?: string, userRole?: string): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Build search filters from real database
      const searchFilters = await this.buildSearchFilters(query, userId, userRole);
      
      // Execute search with real data
      const results = await this.executeSearch(query, searchFilters);
      
      // Get real facets from database
      const facets = await this.getFacets(query, searchFilters);
      
      // Get intelligent suggestions
      const suggestions = await this.getSuggestions(query.query);
      
      // CRITICAL FIX #1: Log search for analytics and suggestions
      if (userId) {
        await this.logSearch(userId, query, results.total);
      }
      
      const took = Date.now() - startTime;
      
      return {
        results: results.items,
        total: results.total,
        facets,
        suggestions,
        took
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      return {
        results: [],
        total: 0,
        facets: [],
        suggestions: [],
        took: Date.now() - startTime
      };
    }
  }

  // CRITICAL FIX #1: Log search for analytics
  private async logSearch(userId: string, query: SearchQuery, resultCount: number): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DOCUMENT_SEARCH',
          details: {
            query: query.query || '',
            resultCount,
            filters: query.filters || {},
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.warn('Failed to log search:', error);
    }
  }

  // CRITICAL FIX #3: Role-based access control
  private async buildSearchFilters(
    query: SearchQuery, 
    userId?: string, 
    userRole?: string
  ): Promise<Prisma.DocumentWhereInput> {
    const filters: Prisma.DocumentWhereInput = {};
    
    // Apply role-based filtering
    if (userId && userRole) {
      if (userRole === 'GESTIONNAIRE') {
        // GESTIONNAIRE sees only documents from bordereaux assigned to them
        const bordereaux = await this.prisma.bordereau.findMany({
          where: {
            OR: [
              { assignedToUserId: userId },
              { currentHandlerId: userId },
              { chargeCompteId: userId }
            ],
            archived: false
          },
          select: { id: true }
        });
        filters.bordereauId = { in: bordereaux.map(b => b.id) };
      } else if (userRole === 'GESTIONNAIRE_SENIOR') {
        // GESTIONNAIRE_SENIOR sees documents from bordereaux where client or contract is assigned
        const bordereaux = await this.prisma.bordereau.findMany({
          where: {
            archived: false,
            OR: [
              { client: { chargeCompteId: userId } },
              { contract: { teamLeaderId: userId } }
            ]
          },
          select: { id: true }
        });
        filters.bordereauId = { in: bordereaux.map(b => b.id) };
      } else if (userRole === 'CHEF_EQUIPE') {
        // CHEF_EQUIPE sees documents from their team's bordereaux
        const teamBordereaux = await this.prisma.bordereau.findMany({
          where: {
            contract: { teamLeaderId: userId },
            archived: false
          },
          select: { id: true }
        });
        filters.bordereauId = { in: teamBordereaux.map(b => b.id) };
      }
      // SUPER_ADMIN and ADMINISTRATEUR see all documents (no filter)
    }
    
    // Apply user-provided filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([field, values]) => {
        if (values.length > 0) {
          switch (field) {
            case 'type':
              filters.type = { in: values as any[] };
              break;
            case 'status':
              filters.status = { in: values as any[] };
              break;
            case 'uploadedById':
              filters.uploadedById = { in: values };
              break;
            case 'assignedToUserId':
              filters.assignedToUserId = { in: values };
              break;
            case 'bordereauId':
              // Merge with existing bordereauId filter if role-based filter exists
              const currentBordereauFilter = filters.bordereauId;
              if (currentBordereauFilter && typeof currentBordereauFilter === 'object' && 'in' in currentBordereauFilter) {
                const existingIds = currentBordereauFilter.in as string[];
                const requestedIds = values;
                filters.bordereauId = { in: existingIds.filter(id => requestedIds.includes(id)) };
              } else {
                filters.bordereauId = { in: values };
              }
              break;
          }
        }
      });
    }
    
    return filters;
  }

  private async executeSearch(
    query: SearchQuery, 
    filters: Prisma.DocumentWhereInput
  ): Promise<{ items: SearchResult[]; total: number }> {
    const page = query.page || 1;
    const size = query.size || 20;
    const skip = (page - 1) * size;
    
    // Build text search condition with full-text search optimization
    const textSearchCondition: Prisma.DocumentWhereInput = {};
    if (query.query && query.query.trim()) {
      const searchTerm = query.query.trim();
      
      // Use PostgreSQL full-text search if available (performance optimization)
      // Falls back to ILIKE if full-text search fails
      try {
        // Try full-text search first (requires tsvector index)
        const tsQuery = searchTerm.split(/\s+/).join(' & ');
        
        // Use raw SQL for full-text search on name and ocrText
        const documentIds = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "Document"
          WHERE to_tsvector('french', COALESCE(name, '') || ' ' || COALESCE("ocrText", '')) @@ to_tsquery('french', ${tsQuery})
          LIMIT 1000
        `;
        
        if (documentIds.length > 0) {
          textSearchCondition.id = { in: documentIds.map(d => d.id) };
        } else {
          // No results from full-text search, use fallback
          textSearchCondition.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { ocrText: { contains: searchTerm, mode: 'insensitive' } },
            { path: { contains: searchTerm, mode: 'insensitive' } }
          ];
        }
      } catch (ftsError) {
        // Full-text search not available or failed, use ILIKE fallback
        this.logger.warn('Full-text search failed, using ILIKE fallback:', ftsError);
        textSearchCondition.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { ocrText: { contains: searchTerm, mode: 'insensitive' } },
          { path: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }
    
    // Combine filters with text search
    const whereClause: Prisma.DocumentWhereInput = {
      AND: [
        filters,
        textSearchCondition
      ]
    };
    
    // Execute query with relations
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          bordereau: {
            select: {
              id: true,
              reference: true,
              client: {
                select: {
                  name: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: this.buildOrderBy(query.sort),
        skip,
        take: size
      }),
      this.prisma.document.count({ where: whereClause })
    ]);
    
    // Transform to SearchResult format
    const items: SearchResult[] = documents.map(doc => {
      const score = this.calculateRelevanceScore(doc, query.query);
      const highlights = this.generateHighlights(doc, query.query);
      
      return {
        id: doc.id,
        title: doc.name,
        content: doc.ocrText || '',
        type: doc.type,
        category: doc.bordereau?.client?.name || 'Uncategorized',
        tags: this.extractTags(doc),
        createdAt: doc.uploadedAt,
        updatedAt: doc.uploadedAt,
        author: doc.uploader?.fullName || doc.uploader?.email || 'Unknown',
        size: 0,
        path: doc.path,
        score,
        highlights
      };
    });
    
    return { items, total };
  }

  private buildOrderBy(sort?: { field: string; direction: 'asc' | 'desc' }): Prisma.DocumentOrderByWithRelationInput {
    if (!sort) {
      return { uploadedAt: 'desc' };
    }
    
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    
    switch (sort.field) {
      case 'createdAt':
      case 'uploadedAt':
        orderBy.uploadedAt = sort.direction;
        break;
      case 'title':
      case 'name':
        orderBy.name = sort.direction;
        break;
      case 'type':
        orderBy.type = sort.direction;
        break;
      case 'author':
        orderBy.uploader = { fullName: sort.direction };
        break;
      default:
        orderBy.uploadedAt = 'desc';
    }
    
    return orderBy;
  }

  private calculateRelevanceScore(doc: any, searchQuery?: string): number {
    if (!searchQuery) return 1.0;
    
    const query = searchQuery.toLowerCase();
    let score = 0;
    
    // Title match (highest weight)
    if (doc.name.toLowerCase().includes(query)) {
      score += 0.5;
      if (doc.name.toLowerCase() === query) {
        score += 0.3;
      }
    }
    
    // OCR text match (medium weight)
    if (doc.ocrText && doc.ocrText.toLowerCase().includes(query)) {
      score += 0.3;
    }
    
    // Path match (low weight)
    if (doc.path.toLowerCase().includes(query)) {
      score += 0.1;
    }
    
    // Recency bonus
    const daysSinceUpload = (Date.now() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpload < 7) {
      score += 0.1;
    } else if (daysSinceUpload < 30) {
      score += 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  // CRITICAL FIX #4: Escape regex special characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateHighlights(doc: any, searchQuery?: string): { [key: string]: string[] } {
    const highlights: { [key: string]: string[] } = {};
    
    if (!searchQuery) return highlights;
    
    const query = searchQuery.toLowerCase();
    const terms = query.split(/\s+/).filter(t => t.length > 0);
    
    // Highlight in title
    if (doc.name.toLowerCase().includes(query)) {
      let highlightedName = doc.name;
      terms.forEach(term => {
        const escapedTerm = this.escapeRegex(term);
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        highlightedName = highlightedName.replace(regex, '<em>$1</em>');
      });
      highlights.title = [highlightedName];
    }
    
    // Highlight in OCR text (show context)
    if (doc.ocrText && doc.ocrText.toLowerCase().includes(query)) {
      const index = doc.ocrText.toLowerCase().indexOf(query);
      const start = Math.max(0, index - 50);
      const end = Math.min(doc.ocrText.length, index + query.length + 50);
      let snippet = doc.ocrText.substring(start, end);
      
      terms.forEach(term => {
        const escapedTerm = this.escapeRegex(term);
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        snippet = snippet.replace(regex, '<em>$1</em>');
      });
      
      highlights.content = [(start > 0 ? '...' : '') + snippet + (end < doc.ocrText.length ? '...' : '')];
    }
    
    return highlights;
  }

  private extractTags(doc: any): string[] {
    const tags: string[] = [];
    
    if (doc.type) tags.push(doc.type);
    if (doc.status) tags.push(doc.status);
    if (doc.bordereau?.client?.name) tags.push(doc.bordereau.client.name);
    if (doc.bordereau?.reference) tags.push(doc.bordereau.reference);
    
    return tags;
  }

  private async getFacets(query: SearchQuery, filters: Prisma.DocumentWhereInput): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];
    
    try {
      const baseWhere = { ...filters };
      
      // Type facet
      const typeGroups = await this.prisma.document.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: { id: true }
      });
      
      facets.push({
        field: 'type',
        label: 'Type de Document',
        values: typeGroups.map(g => ({
          value: g.type,
          count: g._count.id,
          label: this.getTypeLabel(g.type)
        }))
      });
      
      // Status facet
      const statusGroups = await this.prisma.document.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true }
      });
      
      facets.push({
        field: 'status',
        label: 'Statut',
        values: statusGroups
          .filter(g => g.status !== null)
          .map(g => ({
            value: g.status!,
            count: g._count.id,
            label: this.getStatusLabel(g.status!)
          }))
      });
      
      // Author facet (top 10)
      const authorGroups = await this.prisma.document.groupBy({
        by: ['uploadedById'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      });
      
      const authorIds = authorGroups.map(g => g.uploadedById);
      const authors = await this.prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, fullName: true, email: true }
      });
      
      const authorMap = new Map(authors.map(a => [a.id, a.fullName || a.email]));
      
      facets.push({
        field: 'uploadedById',
        label: 'Auteur',
        values: authorGroups.map(g => ({
          value: g.uploadedById,
          count: g._count.id,
          label: authorMap.get(g.uploadedById) || 'Unknown'
        }))
      });
      
      // CRITICAL FIX #2: Date range facet instead of year (performance)
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const [count7d, count30d, count90d, countOlder] = await Promise.all([
        this.prisma.document.count({ where: { ...baseWhere, uploadedAt: { gte: last7Days } } }),
        this.prisma.document.count({ where: { ...baseWhere, uploadedAt: { gte: last30Days, lt: last7Days } } }),
        this.prisma.document.count({ where: { ...baseWhere, uploadedAt: { gte: last90Days, lt: last30Days } } }),
        this.prisma.document.count({ where: { ...baseWhere, uploadedAt: { lt: last90Days } } })
      ]);
      
      facets.push({
        field: 'dateRange',
        label: 'Période',
        values: [
          { value: '7d', count: count7d, label: 'Derniers 7 jours' },
          { value: '30d', count: count30d, label: '8-30 jours' },
          { value: '90d', count: count90d, label: '31-90 jours' },
          { value: 'older', count: countOlder, label: 'Plus de 90 jours' }
        ].filter(v => v.count > 0)
      });
      
    } catch (error) {
      this.logger.error('Failed to generate facets:', error);
    }
    
    return facets;
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'BULLETIN_SOIN': 'Bulletin de Soin',
      'ADHESION': 'Adhésion',
      'COMPLEMENT_INFORMATION': 'Complément d\'Information',
      'CONTRAT_AVENANT': 'Contrat/Avenant',
      'RECLAMATION': 'Réclamation',
      'DEMANDE_RESILIATION': 'Demande de Résiliation',
      'CONVENTION_TIERS_PAYANT': 'Convention Tiers Payant'
    };
    return labels[type] || type;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'UPLOADED': 'Téléchargé',
      'SCANNE': 'Scanné',
      'EN_COURS': 'En Cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté',
      'RETOUR_ADMIN': 'Retour Admin',
      'RETOURNER_AU_SCAN': 'Retour au Scan'
    };
    return labels[status] || status;
  }

  private async getSuggestions(query?: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    try {
      // CRITICAL FIX: Use raw SQL for JSON search (Prisma doesn't support string_contains on JSON)
      const recentSearches = await this.prisma.$queryRaw<Array<{ details: any }>>`
        SELECT details
        FROM "AuditLog"
        WHERE action = 'DOCUMENT_SEARCH'
          AND details::text ILIKE ${'%' + query + '%'}
        ORDER BY timestamp DESC
        LIMIT 10
      `;
      
      const suggestions = new Set<string>();
      
      recentSearches.forEach(log => {
        const searchQuery = log.details?.query;
        if (searchQuery && typeof searchQuery === 'string' && searchQuery.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(searchQuery);
        }
      });
      
      // Also suggest from document names using full-text search if available
      // Fallback to ILIKE for compatibility
      const documents = await this.prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name
        FROM "Document"
        WHERE name ILIKE ${'%' + query + '%'}
        LIMIT 5
      `;
      
      documents.forEach(doc => {
        suggestions.add(doc.name);
      });
      
      return Array.from(suggestions).slice(0, 5);
    } catch (error) {
      this.logger.error('Failed to get suggestions:', error);
      // Fallback to simple document name search
      try {
        const documents = await this.prisma.document.findMany({
          where: {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: { name: true },
          take: 5
        });
        return documents.map(d => d.name);
      } catch (fallbackError) {
        this.logger.error('Fallback suggestions also failed:', fallbackError);
        return [];
      }
    }
  }

  async indexDocument(document: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: document.uploadedById || 'SYSTEM',
          action: 'DOCUMENT_INDEXED',
          details: {
            documentId: document.id,
            title: document.name,
            type: document.type,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.logger.log(`Document indexed: ${document.id}`);
    } catch (error) {
      this.logger.error('Document indexing failed:', error);
    }
  }

  async removeFromIndex(documentId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'DOCUMENT_REMOVED_FROM_INDEX',
          details: {
            documentId,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.logger.log(`Document removed from index: ${documentId}`);
    } catch (error) {
      this.logger.error('Document removal from index failed:', error);
    }
  }

  async getSearchAnalytics(): Promise<any> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const searchLogs = await this.prisma.auditLog.findMany({
        where: {
          action: 'DOCUMENT_SEARCH',
          timestamp: { gte: last30Days }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      const queryAnalysis = this.analyzeSearchQueries(searchLogs);
      
      return {
        totalSearches: searchLogs.length,
        uniqueQueries: queryAnalysis.uniqueQueries,
        topQueries: queryAnalysis.topQueries,
        avgResultsPerQuery: queryAnalysis.avgResults,
        searchTrends: queryAnalysis.trends
      };
    } catch (error) {
      this.logger.error('Failed to get search analytics:', error);
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        topQueries: [],
        avgResultsPerQuery: 0,
        searchTrends: []
      };
    }
  }

  private analyzeSearchQueries(logs: any[]): any {
    const queryMap = new Map<string, number>();
    let totalResults = 0;
    
    logs.forEach(log => {
      const details = log.details as any;
      const query = details?.query;
      if (query && typeof query === 'string') {
        queryMap.set(query, (queryMap.get(query) || 0) + 1);
      }
      if (typeof details?.resultCount === 'number') {
        totalResults += details.resultCount;
      }
    });

    const topQueries = Array.from(queryMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      uniqueQueries: queryMap.size,
      topQueries,
      avgResults: logs.length > 0 ? totalResults / logs.length : 0,
      trends: this.calculateSearchTrends(logs)
    };
  }

  private calculateSearchTrends(logs: any[]): any[] {
    const dailySearches = new Map<string, number>();
    
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      dailySearches.set(date, (dailySearches.get(date) || 0) + 1);
    });

    return Array.from(dailySearches.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }
}
