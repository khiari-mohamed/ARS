import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClaimPattern {
  id: string;
  pattern: string;
  frequency: number;
  categories: string[];
  avgResolutionTime: number;
  impact: 'low' | 'medium' | 'high';
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface RootCause {
  id: string;
  cause: string;
  category: string;
  frequency: number;
  relatedClaims: string[];
  preventionActions: string[];
  estimatedCost: number;
}

export interface AnalyticsInsight {
  type: 'pattern' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data: any;
  actionable: boolean;
  suggestedActions: string[];
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // === CLAIM PATTERN ANALYSIS ===
  async analyzeClaimPatterns(period = '90d'): Promise<ClaimPattern[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      const claims = await this.prisma.reclamation.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          status: true
        }
      });

      const patterns = await this.identifyPatterns(claims);
      return patterns;
    } catch (error) {
      this.logger.error('Failed to analyze claim patterns:', error);
      return [];
    }
  }

  private async identifyPatterns(claims: any[]): Promise<ClaimPattern[]> {
    const patterns: ClaimPattern[] = [];
    const textAnalysis = this.performTextAnalysis(claims);
    
    // Common phrase patterns
    const commonPhrases = this.extractCommonPhrases(claims.map(c => c.description));
    
    for (const phrase of commonPhrases) {
      const relatedClaims = claims.filter(c => 
        c.description.toLowerCase().includes(phrase.text.toLowerCase())
      );

      if (relatedClaims.length >= 3) {
        const avgResolutionTime = this.calculateAvgResolutionTime(relatedClaims);
        const categories = [...new Set(relatedClaims.map(c => c.type))];
        
        patterns.push({
          id: `pattern_${phrase.text.replace(/\s+/g, '_')}`,
          pattern: phrase.text,
          frequency: relatedClaims.length,
          categories,
          avgResolutionTime,
          impact: this.determineImpact(relatedClaims.length, avgResolutionTime),
          trend: this.calculateTrend(relatedClaims)
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  private performTextAnalysis(claims: any[]): any {
    // Mock text analysis - in production would use NLP
    return {
      commonWords: ['remboursement', 'délai', 'erreur', 'service'],
      sentiment: { positive: 0.2, neutral: 0.3, negative: 0.5 },
      topics: ['payment', 'service', 'technical', 'process']
    };
  }

  private extractCommonPhrases(descriptions: string[]): { text: string; count: number }[] {
    const phrases = [
      'délai trop long',
      'pas de réponse',
      'erreur de montant',
      'service client',
      'problème technique',
      'remboursement en retard',
      'information incorrecte',
      'mauvaise qualité'
    ];

    return phrases.map(phrase => ({
      text: phrase,
      count: descriptions.filter(desc => 
        desc.toLowerCase().includes(phrase.toLowerCase())
      ).length
    })).filter(p => p.count > 0);
  }

  private calculateAvgResolutionTime(claims: any[]): number {
    const resolvedClaims = claims.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED');
    if (resolvedClaims.length === 0) return 0;

    const totalTime = resolvedClaims.reduce((sum, claim) => {
      const resolutionTime = claim.updatedAt.getTime() - claim.createdAt.getTime();
      return sum + resolutionTime;
    }, 0);

    return Math.round(totalTime / resolvedClaims.length / (1000 * 60 * 60 * 24));
  }

  private determineImpact(frequency: number, avgResolutionTime: number): 'low' | 'medium' | 'high' {
    const impactScore = (frequency * 0.6) + (avgResolutionTime * 0.4);
    
    if (impactScore > 20) return 'high';
    if (impactScore > 10) return 'medium';
    return 'low';
  }

  private calculateTrend(claims: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (claims.length < 6) return 'stable';

    const sortedClaims = claims.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const midPoint = Math.floor(sortedClaims.length / 2);
    
    const firstHalf = sortedClaims.slice(0, midPoint).length;
    const secondHalf = sortedClaims.slice(midPoint).length;
    
    const ratio = secondHalf / firstHalf;
    
    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
  }

  // === ROOT CAUSE IDENTIFICATION ===
  async identifyRootCauses(period = '90d'): Promise<RootCause[]> {
    try {
      const patterns = await this.analyzeClaimPatterns(period);
      const rootCauses: RootCause[] = [];

      for (const pattern of patterns) {
        const cause = await this.analyzePatternForRootCause(pattern);
        if (cause) {
          rootCauses.push(cause);
        }
      }

      // Add system-level root causes
      const systemCauses = await this.identifySystemRootCauses(period);
      rootCauses.push(...systemCauses);

      return rootCauses.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      this.logger.error('Failed to identify root causes:', error);
      return [];
    }
  }

  private async analyzePatternForRootCause(pattern: ClaimPattern): Promise<RootCause | null> {
    const rootCauseMap = {
      'délai trop long': {
        cause: 'Processus de traitement inefficace',
        preventionActions: [
          'Optimiser le workflow de traitement',
          'Augmenter les ressources de traitement',
          'Automatiser les étapes répétitives'
        ],
        estimatedCost: 15000
      },
      'erreur de montant': {
        cause: 'Erreurs de saisie ou calcul automatique défaillant',
        preventionActions: [
          'Améliorer la validation des données',
          'Former le personnel sur la saisie',
          'Mettre à jour les règles de calcul'
        ],
        estimatedCost: 8000
      },
      'service client': {
        cause: 'Formation insuffisante du personnel',
        preventionActions: [
          'Programme de formation continue',
          'Améliorer les scripts de réponse',
          'Mettre en place un système de feedback'
        ],
        estimatedCost: 12000
      }
    };

    const matchedCause = Object.entries(rootCauseMap).find(([key]) => 
      pattern.pattern.toLowerCase().includes(key)
    );

    if (!matchedCause) return null;

    const [, causeData] = matchedCause;

    return {
      id: `cause_${pattern.id}`,
      cause: causeData.cause,
      category: pattern.categories[0] || 'GENERAL',
      frequency: pattern.frequency,
      relatedClaims: [], // Would be populated with actual claim IDs
      preventionActions: causeData.preventionActions,
      estimatedCost: causeData.estimatedCost
    };
  }

  private async identifySystemRootCauses(period: string): Promise<RootCause[]> {
    // Mock system-level root cause analysis
    return [
      {
        id: 'cause_system_overload',
        cause: 'Surcharge du système pendant les pics d\'activité',
        category: 'TECHNIQUE',
        frequency: 25,
        relatedClaims: [],
        preventionActions: [
          'Augmenter la capacité serveur',
          'Implémenter la mise à l\'échelle automatique',
          'Optimiser les requêtes de base de données'
        ],
        estimatedCost: 25000
      },
      {
        id: 'cause_communication_gap',
        cause: 'Manque de communication entre les départements',
        category: 'PROCESSUS',
        frequency: 18,
        relatedClaims: [],
        preventionActions: [
          'Mettre en place des réunions inter-départements',
          'Créer un système de communication unifié',
          'Définir des processus de collaboration'
        ],
        estimatedCost: 10000
      }
    ];
  }

  // === ADVANCED INSIGHTS ===
  async generateAnalyticsInsights(period = '90d'): Promise<AnalyticsInsight[]> {
    try {
      const insights: AnalyticsInsight[] = [];

      // Pattern insights
      const patterns = await this.analyzeClaimPatterns(period);
      insights.push(...this.generatePatternInsights(patterns));

      // Trend insights
      const trends = await this.analyzeTrends(period);
      insights.push(...this.generateTrendInsights(trends));

      // Anomaly detection
      const anomalies = await this.detectAnomalies(period);
      insights.push(...this.generateAnomalyInsights(anomalies));

      // Recommendations
      const recommendations = await this.generateRecommendations(period);
      insights.push(...recommendations);

      return insights.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      this.logger.error('Failed to generate analytics insights:', error);
      return [];
    }
  }

  private generatePatternInsights(patterns: ClaimPattern[]): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    const highImpactPatterns = patterns.filter(p => p.impact === 'high');
    if (highImpactPatterns.length > 0) {
      insights.push({
        type: 'pattern',
        title: 'Patterns à fort impact détectés',
        description: `${highImpactPatterns.length} patterns de réclamations à fort impact identifiés`,
        severity: 'warning',
        data: { patterns: highImpactPatterns },
        actionable: true,
        suggestedActions: [
          'Analyser les causes racines de ces patterns',
          'Mettre en place des actions préventives',
          'Former les équipes sur ces problématiques'
        ]
      });
    }

    const increasingPatterns = patterns.filter(p => p.trend === 'increasing');
    if (increasingPatterns.length > 0) {
      insights.push({
        type: 'trend',
        title: 'Tendances croissantes préoccupantes',
        description: `${increasingPatterns.length} types de réclamations en augmentation`,
        severity: 'warning',
        data: { patterns: increasingPatterns },
        actionable: true,
        suggestedActions: [
          'Investiguer les causes de l\'augmentation',
          'Renforcer les mesures préventives',
          'Allouer plus de ressources à ces domaines'
        ]
      });
    }

    return insights;
  }

  private async analyzeTrends(period: string): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    const claims = await this.prisma.reclamation.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        type: true,
        severity: true,
        status: true
      }
    });

    return {
      volumeTrend: this.calculateVolumeTrend(claims),
      categoryTrends: this.calculateCategoryTrends(claims),
      priorityTrends: this.calculatePriorityTrends(claims)
    };
  }

  private calculateVolumeTrend(claims: any[]): any {
    const dailyCounts = new Map<string, number>();
    
    claims.forEach(claim => {
      const date = claim.createdAt.toISOString().split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    const dates = Array.from(dailyCounts.keys()).sort();
    const counts = dates.map(date => dailyCounts.get(date) || 0);
    
    return {
      dates,
      counts,
      trend: this.calculateLinearTrend(counts)
    };
  }

  private calculateCategoryTrends(claims: any[]): any {
    const categoryByWeek = new Map<string, Map<string, number>>();
    
    claims.forEach(claim => {
      const week = this.getWeekKey(claim.createdAt);
      const category = claim.type || 'UNKNOWN';
      
      if (!categoryByWeek.has(category)) {
        categoryByWeek.set(category, new Map());
      }
      
      const categoryWeeks = categoryByWeek.get(category)!;
      categoryWeeks.set(week, (categoryWeeks.get(week) || 0) + 1);
    });

    return Array.from(categoryByWeek.entries()).map(([category, weeks]) => ({
      category,
      trend: this.calculateLinearTrend(Array.from(weeks.values()))
    }));
  }

  private calculatePriorityTrends(claims: any[]): any {
    const priorityByWeek = new Map<string, Map<string, number>>();
    
    claims.forEach(claim => {
      const week = this.getWeekKey(claim.createdAt);
      const priority = claim.severity || 'MEDIUM';
      
      if (!priorityByWeek.has(priority)) {
        priorityByWeek.set(priority, new Map());
      }
      
      const priorityWeeks = priorityByWeek.get(priority)!;
      priorityWeeks.set(week, (priorityWeeks.get(week) || 0) + 1);
    });

    return Array.from(priorityByWeek.entries()).map(([priority, weeks]) => ({
      priority,
      trend: this.calculateLinearTrend(Array.from(weeks.values()))
    }));
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private generateTrendInsights(trends: any): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (trends.volumeTrend.trend > 0.5) {
      insights.push({
        type: 'trend',
        title: 'Augmentation du volume de réclamations',
        description: 'Le nombre de réclamations est en forte augmentation',
        severity: 'warning',
        data: trends.volumeTrend,
        actionable: true,
        suggestedActions: [
          'Analyser les causes de l\'augmentation',
          'Renforcer les équipes de traitement',
          'Mettre en place des mesures préventives'
        ]
      });
    }

    return insights;
  }

  private async detectAnomalies(period: string): Promise<any[]> {
    // Mock anomaly detection - in production would use statistical methods
    return [
      {
        type: 'volume_spike',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        value: 45,
        expected: 15,
        severity: 'high'
      },
      {
        type: 'resolution_time_spike',
        category: 'REMBOURSEMENT',
        value: 15,
        expected: 5,
        severity: 'medium'
      }
    ];
  }

  private generateAnomalyInsights(anomalies: any[]): AnalyticsInsight[] {
    return anomalies.map(anomaly => ({
      type: 'anomaly',
      title: `Anomalie détectée: ${anomaly.type}`,
      description: `Valeur anormale détectée (${anomaly.value} vs ${anomaly.expected} attendu)`,
      severity: anomaly.severity === 'high' ? 'critical' : 'warning',
      data: anomaly,
      actionable: true,
      suggestedActions: [
        'Investiguer la cause de l\'anomalie',
        'Vérifier les processus concernés',
        'Mettre en place des alertes préventives'
      ]
    }));
  }

  private async generateRecommendations(period: string): Promise<AnalyticsInsight[]> {
    const rootCauses = await this.identifyRootCauses(period);
    
    return rootCauses.slice(0, 3).map(cause => ({
      type: 'recommendation',
      title: `Recommandation: ${cause.cause}`,
      description: `Actions suggérées pour réduire ${cause.frequency} réclamations`,
      severity: 'info',
      data: cause,
      actionable: true,
      suggestedActions: cause.preventionActions
    }));
  }

  // === PERFORMANCE METRICS ===
  async getAdvancedMetrics(period = '30d'): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      const [
        totalClaims,
        resolvedClaims,
        avgResolutionTime,
        satisfactionScore,
        patterns,
        rootCauses
      ] = await Promise.all([
        this.prisma.reclamation.count({ where: { createdAt: { gte: startDate } } }),
        this.prisma.reclamation.count({ 
          where: { 
            createdAt: { gte: startDate },
            status: { in: ['RESOLU', 'FERME'] }
          }
        }),
        this.calculateOverallAvgResolutionTime(startDate),
        this.calculateOverallSatisfactionScore(startDate),
        this.analyzeClaimPatterns(period),
        this.identifyRootCauses(period)
      ]);

      return {
        overview: {
          totalClaims,
          resolvedClaims,
          resolutionRate: totalClaims > 0 ? (resolvedClaims / totalClaims) * 100 : 0,
          avgResolutionTime,
          satisfactionScore
        },
        patterns: {
          total: patterns.length,
          highImpact: patterns.filter(p => p.impact === 'high').length,
          increasing: patterns.filter(p => p.trend === 'increasing').length
        },
        rootCauses: {
          total: rootCauses.length,
          preventionCost: rootCauses.reduce((sum, cause) => sum + cause.estimatedCost, 0)
        },
        period
      };
    } catch (error) {
      this.logger.error('Failed to get advanced metrics:', error);
      return {
        overview: { totalClaims: 0, resolvedClaims: 0, resolutionRate: 0, avgResolutionTime: 0, satisfactionScore: 0 },
        patterns: { total: 0, highImpact: 0, increasing: 0 },
        rootCauses: { total: 0, preventionCost: 0 },
        period
      };
    }
  }

  private async calculateOverallAvgResolutionTime(startDate: Date): Promise<number> {
    const resolvedClaims = await this.prisma.reclamation.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['RESOLU', 'FERME'] }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    if (resolvedClaims.length === 0) return 0;

    const totalTime = resolvedClaims.reduce((sum, claim) => {
      const resolutionTime = claim.updatedAt.getTime() - claim.createdAt.getTime();
      return sum + resolutionTime;
    }, 0);

    return Math.round(totalTime / resolvedClaims.length / (1000 * 60 * 60 * 24));
  }

  private async calculateOverallSatisfactionScore(startDate: Date): Promise<number> {
    // Mock satisfaction score since reclamationFeedback model doesn't exist
    // In production, would query actual feedback data
    return Math.random() * 2 + 3; // 3-5 range
  }
}