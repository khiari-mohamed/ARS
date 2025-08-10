import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Build search filters
      const searchFilters = this.buildSearchFilters(query);
      
      // Execute search with ranking
      const results = await this.executeSearch(query, searchFilters);
      
      // Get facets
      const facets = await this.getFacets(query, searchFilters);
      
      // Get suggestions
      const suggestions = await this.getSuggestions(query.query);
      
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

  private buildSearchFilters(query: SearchQuery): any {
    const filters: any = {};
    
    if (query.filters) {
      Object.entries(query.filters).forEach(([field, values]) => {
        if (values.length > 0) {
          filters[field] = { in: values };
        }
      });
    }
    
    return filters;
  }

  private async executeSearch(query: SearchQuery, filters: any): Promise<{ items: SearchResult[]; total: number }> {
    const page = query.page || 1;
    const size = query.size || 20;
    const skip = (page - 1) * size;
    
    // Mock search implementation - in production would use Elasticsearch or similar
    const mockResults: SearchResult[] = [
      {
        id: 'doc_001',
        title: 'Contrat Assurance Santé - Client ABC',
        content: 'Contrat d\'assurance santé pour le client ABC avec couverture complète...',
        type: 'CONTRACT',
        category: 'ASSURANCE_SANTE',
        tags: ['contrat', 'santé', 'abc'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
        author: 'Jean Dupont',
        size: 2048576,
        path: '/documents/contracts/2024/contract_abc_001.pdf',
        score: 0.95,
        highlights: {
          title: ['<em>Contrat</em> Assurance Santé - Client <em>ABC</em>'],
          content: ['<em>Contrat</em> d\'assurance santé pour le client <em>ABC</em>']
        }
      },
      {
        id: 'doc_002',
        title: 'Bulletin de Soin - Janvier 2024',
        content: 'Bulletin de soin pour les prestations de janvier 2024...',
        type: 'BS',
        category: 'BULLETIN_SOIN',
        tags: ['bs', 'janvier', '2024'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15'),
        author: 'Marie Martin',
        size: 1024768,
        path: '/documents/bs/2024/01/bs_janvier_2024.pdf',
        score: 0.87,
        highlights: {
          title: ['<em>Bulletin</em> de Soin - Janvier 2024'],
          content: ['<em>Bulletin</em> de soin pour les prestations']
        }
      }
    ];

    // Apply text search if query provided
    let filteredResults = mockResults;
    if (query.query) {
      const searchTerm = query.query.toLowerCase();
      filteredResults = mockResults.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (Object.keys(filters).length > 0) {
      filteredResults = filteredResults.filter(doc => {
        return Object.entries(filters).every(([field, condition]: [string, any]) => {
          if (condition.in) {
            return condition.in.includes(doc[field as keyof SearchResult]);
          }
          return true;
        });
      });
    }

    // Apply sorting
    if (query.sort) {
      filteredResults.sort((a, b) => {
        const aVal = a[query.sort!.field as keyof SearchResult];
        const bVal = b[query.sort!.field as keyof SearchResult];
        const direction = query.sort!.direction === 'desc' ? -1 : 1;
        
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    } else {
      // Default sort by score
      filteredResults.sort((a, b) => b.score - a.score);
    }

    const total = filteredResults.length;
    const items = filteredResults.slice(skip, skip + size);

    return { items, total };
  }

  private async getFacets(query: SearchQuery, filters: any): Promise<SearchFacet[]> {
    // Mock facets - in production would aggregate from search results
    return [
      {
        field: 'type',
        label: 'Type de Document',
        values: [
          { value: 'CONTRACT', count: 45, label: 'Contrats' },
          { value: 'BS', count: 123, label: 'Bulletins de Soin' },
          { value: 'FACTURE', count: 67, label: 'Factures' },
          { value: 'COURRIER', count: 89, label: 'Courriers' }
        ]
      },
      {
        field: 'category',
        label: 'Catégorie',
        values: [
          { value: 'ASSURANCE_SANTE', count: 78, label: 'Assurance Santé' },
          { value: 'ASSURANCE_AUTO', count: 56, label: 'Assurance Auto' },
          { value: 'ASSURANCE_HABITATION', count: 34, label: 'Assurance Habitation' }
        ]
      },
      {
        field: 'author',
        label: 'Auteur',
        values: [
          { value: 'Jean Dupont', count: 23 },
          { value: 'Marie Martin', count: 45 },
          { value: 'Pierre Durand', count: 12 }
        ]
      },
      {
        field: 'createdAt',
        label: 'Date de Création',
        values: [
          { value: '2024', count: 156, label: '2024' },
          { value: '2023', count: 234, label: '2023' },
          { value: '2022', count: 123, label: '2022' }
        ]
      }
    ];
  }

  private async getSuggestions(query?: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    // Mock suggestions - in production would use search engine suggestions
    const suggestions = [
      'contrat assurance santé',
      'bulletin de soin janvier',
      'facture client abc',
      'courrier réclamation',
      'contrat automobile',
      'assurance habitation'
    ];

    return suggestions.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }

  async indexDocument(document: any): Promise<void> {
    try {
      // Mock document indexing - in production would index to Elasticsearch
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'DOCUMENT_INDEXED',
          details: {
            documentId: document.id,
            title: document.title,
            type: document.type,
            timestamp: new Date().toISOString()
          }
        }
      });
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

      // Analyze search patterns
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
    
    logs.forEach(log => {
      const query = log.details?.query;
      if (query) {
        queryMap.set(query, (queryMap.get(query) || 0) + 1);
      }
    });

    const topQueries = Array.from(queryMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      uniqueQueries: queryMap.size,
      topQueries,
      avgResults: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.details?.resultCount || 0), 0) / logs.length : 0,
      trends: this.calculateSearchTrends(logs)
    };
  }

  private calculateSearchTrends(logs: any[]): any[] {
    const dailySearches = new Map<string, number>();
    
    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      dailySearches.set(date, (dailySearches.get(date) || 0) + 1);
    });

    return Array.from(dailySearches.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }
}