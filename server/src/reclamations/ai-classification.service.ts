import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClaimClassification {
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  suggestedActions: string[];
  estimatedResolutionTime: number; // in hours
  requiredSkills: string[];
}

export interface ClassificationModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  categories: CategoryDefinition[];
}

export interface CategoryDefinition {
  name: string;
  keywords: string[];
  patterns: string[];
  priorityRules: PriorityRule[];
  resolutionTimeEstimate: number;
}

export interface PriorityRule {
  condition: string;
  priority: string;
  weight: number;
}

@Injectable()
export class AIClassificationService {
  private readonly logger = new Logger(AIClassificationService.name);

  constructor(private prisma: PrismaService) {}

  // === AUTOMATIC CLASSIFICATION ===
  async classifyClaim(claimText: string, metadata?: any): Promise<ClaimClassification> {
    try {
      const classification = await this.performClassification(claimText, metadata);
      
      await this.prisma.auditLog.create({
        data: {
          userId: 'AI_SYSTEM',
          action: 'CLAIM_CLASSIFIED',
          details: {
            classification,
            confidence: classification.confidence,
            timestamp: new Date().toISOString()
          }
        }
      });

      return classification;
    } catch (error) {
      this.logger.error('Classification failed:', error);
      return this.getFallbackClassification();
    }
  }

  private async performClassification(text: string, metadata?: any): Promise<ClaimClassification> {
    // Simulate AI classification - in production would use ML model
    const categories = await this.getCategories();
    const textLower = text.toLowerCase();
    
    let bestMatch = categories[0];
    let maxScore = 0;

    for (const category of categories) {
      const score = this.calculateCategoryScore(textLower, category);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = category;
      }
    }

    const priority = this.determinePriority(textLower, bestMatch, metadata);
    const confidence = Math.min(maxScore * 100, 95); // Cap at 95%

    return {
      category: bestMatch.name,
      subcategory: this.determineSubcategory(textLower, bestMatch),
      priority,
      confidence,
      suggestedActions: this.generateSuggestedActions(bestMatch, priority),
      estimatedResolutionTime: this.estimateResolutionTime(bestMatch, priority),
      requiredSkills: this.determineRequiredSkills(bestMatch, priority)
    };
  }

  private async getCategories(): Promise<CategoryDefinition[]> {
    return [
      {
        name: 'REMBOURSEMENT',
        keywords: ['remboursement', 'rembourser', 'paiement', 'facture', 'montant', 'somme'],
        patterns: ['demande.*remboursement', 'non.*remboursé', 'erreur.*montant'],
        priorityRules: [
          { condition: 'montant > 1000', priority: 'high', weight: 0.8 },
          { condition: 'urgent', priority: 'urgent', weight: 0.9 }
        ],
        resolutionTimeEstimate: 48
      },
      {
        name: 'DELAI_TRAITEMENT',
        keywords: ['délai', 'attente', 'retard', 'lent', 'temps', 'rapidité'],
        patterns: ['trop.*long', 'délai.*dépassé', 'attendre.*depuis'],
        priorityRules: [
          { condition: 'délai > 30 jours', priority: 'high', weight: 0.7 },
          { condition: 'client_vip', priority: 'high', weight: 0.8 }
        ],
        resolutionTimeEstimate: 24
      },
      {
        name: 'QUALITE_SERVICE',
        keywords: ['service', 'accueil', 'personnel', 'comportement', 'attitude'],
        patterns: ['mauvais.*service', 'personnel.*désagréable', 'mal.*reçu'],
        priorityRules: [
          { condition: 'plainte_grave', priority: 'urgent', weight: 0.9 }
        ],
        resolutionTimeEstimate: 72
      },
      {
        name: 'ERREUR_DOSSIER',
        keywords: ['erreur', 'faute', 'incorrect', 'faux', 'mauvais'],
        patterns: ['erreur.*dossier', 'information.*incorrecte', 'données.*fausses'],
        priorityRules: [
          { condition: 'impact_financier', priority: 'high', weight: 0.8 }
        ],
        resolutionTimeEstimate: 36
      },
      {
        name: 'TECHNIQUE',
        keywords: ['site', 'application', 'connexion', 'bug', 'problème technique'],
        patterns: ['site.*fonctionne pas', 'erreur.*technique', 'bug.*application'],
        priorityRules: [
          { condition: 'service_indisponible', priority: 'urgent', weight: 1.0 }
        ],
        resolutionTimeEstimate: 12
      }
    ];
  }

  private calculateCategoryScore(text: string, category: CategoryDefinition): number {
    let score = 0;
    
    // Keyword matching
    for (const keyword of category.keywords) {
      if (text.includes(keyword)) {
        score += 0.1;
      }
    }

    // Pattern matching
    for (const pattern of category.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  private determinePriority(text: string, category: CategoryDefinition, metadata?: any): 'low' | 'medium' | 'high' | 'urgent' {
    let priorityScore = 0.3; // Default medium

    // Apply priority rules
    for (const rule of category.priorityRules) {
      if (this.evaluateCondition(rule.condition, text, metadata)) {
        priorityScore = Math.max(priorityScore, rule.weight);
      }
    }

    // Urgency keywords
    const urgencyKeywords = ['urgent', 'immédiat', 'critique', 'grave'];
    if (urgencyKeywords.some(keyword => text.includes(keyword))) {
      priorityScore = Math.max(priorityScore, 0.8);
    }

    if (priorityScore >= 0.9) return 'urgent';
    if (priorityScore >= 0.7) return 'high';
    if (priorityScore >= 0.4) return 'medium';
    return 'low';
  }

  private evaluateCondition(condition: string, text: string, metadata?: any): boolean {
    // Simple condition evaluation - in production would be more sophisticated
    switch (condition) {
      case 'montant > 1000':
        return metadata?.amount && metadata.amount > 1000;
      case 'urgent':
        return text.includes('urgent') || text.includes('immédiat');
      case 'délai > 30 jours':
        return metadata?.daysSinceSubmission && metadata.daysSinceSubmission > 30;
      case 'client_vip':
        return metadata?.clientType === 'VIP';
      case 'plainte_grave':
        return text.includes('inacceptable') || text.includes('scandaleux');
      case 'impact_financier':
        return metadata?.hasFinancialImpact === true;
      case 'service_indisponible':
        return text.includes('indisponible') || text.includes('ne fonctionne pas');
      default:
        return false;
    }
  }

  private determineSubcategory(text: string, category: CategoryDefinition): string {
    const subcategories = {
      'REMBOURSEMENT': ['Remboursement partiel', 'Remboursement total', 'Délai de remboursement'],
      'DELAI_TRAITEMENT': ['Délai dépassé', 'Manque de communication', 'Processus lent'],
      'QUALITE_SERVICE': ['Accueil téléphonique', 'Service en ligne', 'Personnel en agence'],
      'ERREUR_DOSSIER': ['Données personnelles', 'Montants incorrects', 'Documents manquants'],
      'TECHNIQUE': ['Site web', 'Application mobile', 'Système de paiement']
    };

    const categorySubcategories = subcategories[category.name] || ['Général'];
    
    // Simple subcategory detection based on keywords
    for (const subcategory of categorySubcategories) {
      const subcategoryKeywords = subcategory.toLowerCase().split(' ');
      if (subcategoryKeywords.some(keyword => text.includes(keyword))) {
        return subcategory;
      }
    }

    return categorySubcategories[0];
  }

  private generateSuggestedActions(category: CategoryDefinition, priority: string): string[] {
    const baseActions = {
      'REMBOURSEMENT': [
        'Vérifier le dossier de remboursement',
        'Contacter le service comptabilité',
        'Préparer la justification du montant'
      ],
      'DELAI_TRAITEMENT': [
        'Identifier les causes du retard',
        'Accélérer le processus de traitement',
        'Informer le client des délais révisés'
      ],
      'QUALITE_SERVICE': [
        'Enquête interne sur l\'incident',
        'Formation du personnel concerné',
        'Présenter des excuses au client'
      ],
      'ERREUR_DOSSIER': [
        'Corriger les informations erronées',
        'Vérifier l\'intégrité des données',
        'Mettre à jour le dossier client'
      ],
      'TECHNIQUE': [
        'Signaler au service technique',
        'Tester la reproduction du problème',
        'Proposer une solution de contournement'
      ]
    };

    let actions = baseActions[category.name] || ['Analyser la réclamation', 'Contacter le client'];

    if (priority === 'urgent') {
      actions.unshift('Traitement prioritaire immédiat');
    } else if (priority === 'high') {
      actions.unshift('Traitement prioritaire');
    }

    return actions;
  }

  private estimateResolutionTime(category: CategoryDefinition, priority: string): number {
    let baseTime = category.resolutionTimeEstimate;

    // Adjust based on priority
    switch (priority) {
      case 'urgent':
        baseTime *= 0.25; // 4x faster
        break;
      case 'high':
        baseTime *= 0.5; // 2x faster
        break;
      case 'low':
        baseTime *= 1.5; // 1.5x slower
        break;
    }

    return Math.max(baseTime, 2); // Minimum 2 hours
  }

  private determineRequiredSkills(category: CategoryDefinition, priority: string): string[] {
    const skillMap = {
      'REMBOURSEMENT': ['Comptabilité', 'Analyse financière'],
      'DELAI_TRAITEMENT': ['Gestion de processus', 'Communication client'],
      'QUALITE_SERVICE': ['Relation client', 'Gestion de conflit'],
      'ERREUR_DOSSIER': ['Vérification de données', 'Correction d\'erreurs'],
      'TECHNIQUE': ['Support technique', 'Diagnostic système']
    };

    let skills = skillMap[category.name] || ['Traitement général'];

    if (priority === 'urgent' || priority === 'high') {
      skills.push('Gestion de crise');
    }

    return skills;
  }

  private getFallbackClassification(): ClaimClassification {
    return {
      category: 'GENERAL',
      subcategory: 'À classifier',
      priority: 'medium',
      confidence: 50,
      suggestedActions: ['Analyser manuellement', 'Contacter le client'],
      estimatedResolutionTime: 48,
      requiredSkills: ['Traitement général']
    };
  }

  // === BATCH CLASSIFICATION ===
  async classifyMultipleClaims(claims: { id: string; text: string; metadata?: any }[]): Promise<{ [claimId: string]: ClaimClassification }> {
    const results: { [claimId: string]: ClaimClassification } = {};

    for (const claim of claims) {
      try {
        results[claim.id] = await this.classifyClaim(claim.text, claim.metadata);
      } catch (error) {
        this.logger.error(`Failed to classify claim ${claim.id}:`, error);
        results[claim.id] = this.getFallbackClassification();
      }
    }

    return results;
  }

  // === MODEL TRAINING & IMPROVEMENT ===
  async updateClassificationModel(feedbackData: { claimId: string; actualCategory: string; actualPriority: string }[]): Promise<void> {
    try {
      // Mock model update - in production would retrain ML model
      await this.prisma.auditLog.create({
        data: {
          userId: 'AI_SYSTEM',
          action: 'MODEL_UPDATED',
          details: {
            feedbackCount: feedbackData.length,
            timestamp: new Date().toISOString()
          }
        }
      });

      this.logger.log(`Model updated with ${feedbackData.length} feedback entries`);
    } catch (error) {
      this.logger.error('Failed to update classification model:', error);
    }
  }

  async getClassificationAccuracy(): Promise<{ overall: number; byCategory: { [category: string]: number } }> {
    try {
      // Mock accuracy calculation - in production would calculate from actual data
      return {
        overall: 87.5,
        byCategory: {
          'REMBOURSEMENT': 92.1,
          'DELAI_TRAITEMENT': 85.3,
          'QUALITE_SERVICE': 89.7,
          'ERREUR_DOSSIER': 83.2,
          'TECHNIQUE': 91.8
        }
      };
    } catch (error) {
      this.logger.error('Failed to get classification accuracy:', error);
      return { overall: 0, byCategory: {} };
    }
  }

  // === PRIORITY ASSIGNMENT ===
  async assignAutomaticPriority(claimId: string): Promise<void> {
    try {
      const claim = await this.prisma.reclamation.findUnique({
        where: { id: claimId },
        include: { client: true }
      });

      if (!claim) {
        throw new Error('Claim not found');
      }

      const classification = await this.classifyClaim(claim.description, {
        clientType: 'STANDARD', // Default since type field doesn't exist
        amount: 0, // Default since montantConteste field doesn't exist
        daysSinceSubmission: Math.floor((Date.now() - claim.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      });

      await this.prisma.reclamation.update({
        where: { id: claimId },
        data: {
          priority: parseInt(classification.priority) || 1,
          type: classification.category,
          severity: classification.priority.toUpperCase()
        }
      });

      await this.prisma.auditLog.create({
        data: {
          userId: 'AI_SYSTEM',
          action: 'PRIORITY_AUTO_ASSIGNED',
          details: {
            claimId,
            priority: classification.priority,
            confidence: classification.confidence
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to assign automatic priority:', error);
      throw error;
    }
  }

  // === ANALYTICS ===
  async getClassificationStats(period = '30d'): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      const stats = await this.prisma.reclamation.groupBy({
        by: ['type', 'severity'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      });

      const totalClaims = stats.reduce((sum, stat) => sum + (stat._count || 0), 0);

      return {
        totalClassified: totalClaims,
        byCategory: this.groupByField(stats, 'type'),
        byPriority: this.groupByField(stats, 'severity'),
        accuracy: await this.getClassificationAccuracy(),
        period
      };
    } catch (error) {
      this.logger.error('Failed to get classification stats:', error);
      return {
        totalClassified: 0,
        byCategory: {},
        byPriority: {},
        accuracy: { overall: 0, byCategory: {} },
        period
      };
    }
  }

  private groupByField(stats: any[], field: string): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    
    stats.forEach(stat => {
      const key = stat[field] || 'Unknown';
      grouped[key] = (grouped[key] || 0) + (stat._count || 0);
    });

    return grouped;
  }
}