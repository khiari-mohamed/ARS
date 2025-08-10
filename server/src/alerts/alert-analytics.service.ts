import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AlertEffectivenessMetrics {
  alertType: string;
  totalAlerts: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

export interface FalsePositiveAnalysis {
  alertId: string;
  alertType: string;
  timestamp: Date;
  reason: string;
  category: 'threshold_too_low' | 'data_anomaly' | 'system_maintenance' | 'configuration_error' | 'other';
  impact: 'low' | 'medium' | 'high';
  preventable: boolean;
  suggestedFix: string;
}

export interface AlertTrend {
  date: string;
  alertType: string;
  count: number;
  severity: string;
  avgResolutionTime: number;
  falsePositiveRate: number;
}

export interface AlertPerformanceReport {
  period: string;
  overview: {
    totalAlerts: number;
    resolvedAlerts: number;
    avgResolutionTime: number;
    falsePositiveRate: number;
    escalationRate: number;
  };
  effectiveness: AlertEffectivenessMetrics[];
  trends: AlertTrend[];
  falsePositives: FalsePositiveAnalysis[];
  recommendations: AlertRecommendation[];
}

export interface AlertRecommendation {
  type: 'threshold_adjustment' | 'rule_modification' | 'new_alert' | 'alert_removal';
  alertType: string;
  description: string;
  expectedImpact: string;
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: string;
}

@Injectable()
export class AlertAnalyticsService {
  private readonly logger = new Logger(AlertAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // === ALERT EFFECTIVENESS METRICS ===
  async calculateAlertEffectiveness(alertType?: string, period = '30d'): Promise<AlertEffectivenessMetrics[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      // Mock effectiveness calculation - in production would analyze actual alert data
      const alertTypes = alertType ? [alertType] : [
        'SLA_BREACH',
        'SYSTEM_DOWN',
        'HIGH_VOLUME',
        'PROCESSING_DELAY',
        'ERROR_RATE_HIGH',
        'DISK_SPACE_LOW'
      ];

      const metrics: AlertEffectivenessMetrics[] = [];

      for (const type of alertTypes) {
        const totalAlerts = Math.floor(Math.random() * 100) + 50;
        const truePositives = Math.floor(totalAlerts * (0.7 + Math.random() * 0.2)); // 70-90%
        const falsePositives = totalAlerts - truePositives;
        const trueNegatives = Math.floor(Math.random() * 200) + 100;
        const falseNegatives = Math.floor(Math.random() * 10) + 2;

        const precision = truePositives / (truePositives + falsePositives);
        const recall = truePositives / (truePositives + falseNegatives);
        const f1Score = 2 * (precision * recall) / (precision + recall);
        const accuracy = (truePositives + trueNegatives) / (truePositives + trueNegatives + falsePositives + falseNegatives);

        metrics.push({
          alertType: type,
          totalAlerts,
          truePositives,
          falsePositives,
          trueNegatives,
          falseNegatives,
          precision: Math.round(precision * 1000) / 10, // Convert to percentage with 1 decimal
          recall: Math.round(recall * 1000) / 10,
          f1Score: Math.round(f1Score * 1000) / 10,
          accuracy: Math.round(accuracy * 1000) / 10
        });
      }

      return metrics.sort((a, b) => b.f1Score - a.f1Score);
    } catch (error) {
      this.logger.error('Failed to calculate alert effectiveness:', error);
      return [];
    }
  }

  // === FALSE POSITIVE TRACKING ===
  async trackFalsePositive(
    alertId: string, 
    reason: string, 
    category: FalsePositiveAnalysis['category'],
    userId: string
  ): Promise<void> {
    try {
      const falsePositive: FalsePositiveAnalysis = {
        alertId,
        alertType: await this.getAlertType(alertId),
        timestamp: new Date(),
        reason,
        category,
        impact: this.calculateFalsePositiveImpact(category),
        preventable: this.isFalsePositivePreventable(category),
        suggestedFix: this.generateSuggestedFix(category, reason)
      };

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'FALSE_POSITIVE_TRACKED',
          details: falsePositive
        }
      });

      // Update alert effectiveness metrics
      await this.updateEffectivenessMetrics(falsePositive.alertType, 'false_positive');
    } catch (error) {
      this.logger.error('Failed to track false positive:', error);
      throw error;
    }
  }

  async getFalsePositiveAnalysis(period = '30d'): Promise<FalsePositiveAnalysis[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      // Mock false positive data
      const falsePositives: FalsePositiveAnalysis[] = [
        {
          alertId: 'alert_001',
          alertType: 'SLA_BREACH',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          reason: 'Threshold set too low for weekend processing',
          category: 'threshold_too_low',
          impact: 'medium',
          preventable: true,
          suggestedFix: 'Adjust threshold to 48 hours for weekends'
        },
        {
          alertId: 'alert_002',
          alertType: 'SYSTEM_DOWN',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reason: 'Scheduled maintenance not excluded from monitoring',
          category: 'system_maintenance',
          impact: 'high',
          preventable: true,
          suggestedFix: 'Add maintenance window exclusion rule'
        },
        {
          alertId: 'alert_003',
          alertType: 'HIGH_VOLUME',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          reason: 'Data spike due to batch processing',
          category: 'data_anomaly',
          impact: 'low',
          preventable: false,
          suggestedFix: 'Implement batch processing detection logic'
        }
      ];

      return falsePositives.filter(fp => fp.timestamp >= startDate);
    } catch (error) {
      this.logger.error('Failed to get false positive analysis:', error);
      return [];
    }
  }

  async getFalsePositiveStats(period = '30d'): Promise<any> {
    try {
      const falsePositives = await this.getFalsePositiveAnalysis(period);
      
      const totalFalsePositives = falsePositives.length;
      const preventableFalsePositives = falsePositives.filter(fp => fp.preventable).length;
      
      const byCategory = falsePositives.reduce((acc, fp) => {
        acc[fp.category] = (acc[fp.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const byImpact = falsePositives.reduce((acc, fp) => {
        acc[fp.impact] = (acc[fp.impact] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const byAlertType = falsePositives.reduce((acc, fp) => {
        acc[fp.alertType] = (acc[fp.alertType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      return {
        totalFalsePositives,
        preventableFalsePositives,
        preventableRate: totalFalsePositives > 0 ? (preventableFalsePositives / totalFalsePositives) * 100 : 0,
        byCategory,
        byImpact,
        byAlertType,
        period
      };
    } catch (error) {
      this.logger.error('Failed to get false positive stats:', error);
      return {
        totalFalsePositives: 0,
        preventableFalsePositives: 0,
        preventableRate: 0,
        byCategory: {},
        byImpact: {},
        byAlertType: {},
        period
      };
    }
  }

  // === ALERT TRENDS ANALYSIS ===
  async getAlertTrends(period = '30d'): Promise<AlertTrend[]> {
    try {
      const days = parseInt(period.replace('d', ''));
      const trends: AlertTrend[] = [];

      const alertTypes = ['SLA_BREACH', 'SYSTEM_DOWN', 'HIGH_VOLUME', 'PROCESSING_DELAY'];
      const severities = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        for (const alertType of alertTypes) {
          const severity = severities[Math.floor(Math.random() * severities.length)];
          const count = Math.floor(Math.random() * 20) + 1;
          const avgResolutionTime = Math.random() * 120 + 30; // 30-150 minutes
          const falsePositiveRate = Math.random() * 15; // 0-15%

          trends.push({
            date: dateStr,
            alertType,
            count,
            severity,
            avgResolutionTime,
            falsePositiveRate
          });
        }
      }

      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      this.logger.error('Failed to get alert trends:', error);
      return [];
    }
  }

  async detectAlertAnomalies(period = '7d'): Promise<any[]> {
    try {
      const trends = await this.getAlertTrends(period);
      const anomalies: any[] = [];

      // Group by alert type
      const trendsByType = trends.reduce((acc, trend) => {
        if (!acc[trend.alertType]) acc[trend.alertType] = [];
        acc[trend.alertType].push(trend);
        return acc;
      }, {} as { [key: string]: AlertTrend[] });

      // Detect anomalies for each alert type
      Object.entries(trendsByType).forEach(([alertType, typeTrends]) => {
        const counts = typeTrends.map(t => t.count);
        const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        const stdDev = Math.sqrt(counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length);

        typeTrends.forEach(trend => {
          const zScore = Math.abs(trend.count - avgCount) / stdDev;
          if (zScore > 2) { // More than 2 standard deviations
            anomalies.push({
              date: trend.date,
              alertType: trend.alertType,
              actualCount: trend.count,
              expectedCount: Math.round(avgCount),
              deviation: Math.round((trend.count - avgCount) / avgCount * 100),
              severity: zScore > 3 ? 'high' : 'medium',
              type: trend.count > avgCount ? 'spike' : 'drop'
            });
          }
        });
      });

      return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      this.logger.error('Failed to detect alert anomalies:', error);
      return [];
    }
  }

  // === COMPREHENSIVE PERFORMANCE REPORT ===
  async generatePerformanceReport(period = '30d'): Promise<AlertPerformanceReport> {
    try {
      const [effectiveness, trends, falsePositives, recommendations] = await Promise.all([
        this.calculateAlertEffectiveness(undefined, period),
        this.getAlertTrends(period),
        this.getFalsePositiveAnalysis(period),
        this.generateRecommendations(period)
      ]);

      const totalAlerts = effectiveness.reduce((sum, e) => sum + e.totalAlerts, 0);
      const totalResolved = effectiveness.reduce((sum, e) => sum + e.truePositives, 0);
      const totalFalsePositives = effectiveness.reduce((sum, e) => sum + e.falsePositives, 0);

      const avgResolutionTime = trends.reduce((sum, t) => sum + t.avgResolutionTime, 0) / trends.length;
      const falsePositiveRate = totalAlerts > 0 ? (totalFalsePositives / totalAlerts) * 100 : 0;
      const escalationRate = Math.random() * 20 + 5; // Mock escalation rate 5-25%

      return {
        period,
        overview: {
          totalAlerts,
          resolvedAlerts: totalResolved,
          avgResolutionTime: Math.round(avgResolutionTime),
          falsePositiveRate: Math.round(falsePositiveRate * 10) / 10,
          escalationRate: Math.round(escalationRate * 10) / 10
        },
        effectiveness,
        trends,
        falsePositives,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      return {
        period,
        overview: {
          totalAlerts: 0,
          resolvedAlerts: 0,
          avgResolutionTime: 0,
          falsePositiveRate: 0,
          escalationRate: 0
        },
        effectiveness: [],
        trends: [],
        falsePositives: [],
        recommendations: []
      };
    }
  }

  // === RECOMMENDATIONS ENGINE ===
  async generateRecommendations(period = '30d'): Promise<AlertRecommendation[]> {
    try {
      const [effectiveness, falsePositives, trends] = await Promise.all([
        this.calculateAlertEffectiveness(undefined, period),
        this.getFalsePositiveAnalysis(period),
        this.getAlertTrends(period)
      ]);

      const recommendations: AlertRecommendation[] = [];

      // Analyze effectiveness and suggest improvements
      effectiveness.forEach(metric => {
        if (metric.precision < 70) {
          recommendations.push({
            type: 'threshold_adjustment',
            alertType: metric.alertType,
            description: `Adjust thresholds for ${metric.alertType} to reduce false positives (current precision: ${metric.precision}%)`,
            expectedImpact: `Reduce false positives by ~${Math.round((70 - metric.precision) / 2)}%`,
            priority: metric.precision < 50 ? 'high' : 'medium',
            estimatedEffort: '2-4 hours'
          });
        }

        if (metric.recall < 80) {
          recommendations.push({
            type: 'rule_modification',
            alertType: metric.alertType,
            description: `Modify detection rules for ${metric.alertType} to catch more true positives (current recall: ${metric.recall}%)`,
            expectedImpact: `Improve detection rate by ~${Math.round((80 - metric.recall) / 2)}%`,
            priority: metric.recall < 60 ? 'high' : 'medium',
            estimatedEffort: '4-8 hours'
          });
        }
      });

      // Analyze false positives for specific recommendations
      const fpByCategory = falsePositives.reduce((acc, fp) => {
        acc[fp.category] = (acc[fp.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      Object.entries(fpByCategory).forEach(([category, count]) => {
        if (count > 3) {
          recommendations.push({
            type: 'rule_modification',
            alertType: 'MULTIPLE',
            description: `Address recurring ${category.replace('_', ' ')} issues causing ${count} false positives`,
            expectedImpact: `Eliminate ${count} false positives per month`,
            priority: count > 10 ? 'high' : 'medium',
            estimatedEffort: '1-2 days'
          });
        }
      });

      // Analyze trends for new alert opportunities
      const trendsByType = trends.reduce((acc, trend) => {
        if (!acc[trend.alertType]) acc[trend.alertType] = [];
        acc[trend.alertType].push(trend);
        return acc;
      }, {} as { [key: string]: AlertTrend[] });

      Object.entries(trendsByType).forEach(([alertType, typeTrends]) => {
        const avgResolutionTime = typeTrends.reduce((sum, t) => sum + t.avgResolutionTime, 0) / typeTrends.length;
        
        if (avgResolutionTime > 120) { // More than 2 hours
          recommendations.push({
            type: 'new_alert',
            alertType: alertType,
            description: `Create early warning alert for ${alertType} to reduce resolution time (current avg: ${Math.round(avgResolutionTime)} min)`,
            expectedImpact: `Reduce resolution time by 30-50%`,
            priority: 'medium',
            estimatedEffort: '1-2 days'
          });
        }
      });

      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  // === HELPER METHODS ===
  private async getAlertType(alertId: string): Promise<string> {
    // Mock alert type retrieval
    const alertTypes = ['SLA_BREACH', 'SYSTEM_DOWN', 'HIGH_VOLUME', 'PROCESSING_DELAY'];
    return alertTypes[Math.floor(Math.random() * alertTypes.length)];
  }

  private calculateFalsePositiveImpact(category: FalsePositiveAnalysis['category']): 'low' | 'medium' | 'high' {
    const impactMap = {
      'threshold_too_low': 'medium',
      'data_anomaly': 'low',
      'system_maintenance': 'high',
      'configuration_error': 'high',
      'other': 'medium'
    };
    return impactMap[category] as 'low' | 'medium' | 'high';
  }

  private isFalsePositivePreventable(category: FalsePositiveAnalysis['category']): boolean {
    const preventableCategories = ['threshold_too_low', 'system_maintenance', 'configuration_error'];
    return preventableCategories.includes(category);
  }

  private generateSuggestedFix(category: FalsePositiveAnalysis['category'], reason: string): string {
    const fixMap = {
      'threshold_too_low': 'Adjust alert thresholds based on historical data analysis',
      'data_anomaly': 'Implement anomaly detection to filter out expected data spikes',
      'system_maintenance': 'Add maintenance window exclusions to alert rules',
      'configuration_error': 'Review and correct alert configuration parameters',
      'other': 'Investigate root cause and implement appropriate fix'
    };
    return fixMap[category];
  }

  private async updateEffectivenessMetrics(alertType: string, eventType: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'EFFECTIVENESS_METRICS_UPDATED',
          details: {
            alertType,
            eventType,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update effectiveness metrics:', error);
    }
  }

  // === ALERT OPTIMIZATION ===
  async optimizeAlertThresholds(alertType: string): Promise<any> {
    try {
      const effectiveness = await this.calculateAlertEffectiveness(alertType);
      const falsePositives = await this.getFalsePositiveAnalysis();
      
      const alertMetrics = effectiveness.find(e => e.alertType === alertType);
      const alertFPs = falsePositives.filter(fp => fp.alertType === alertType);

      if (!alertMetrics) {
        throw new Error('Alert type not found');
      }

      // Analyze current performance
      const currentPrecision = alertMetrics.precision;
      const currentRecall = alertMetrics.recall;
      const fpRate = (alertMetrics.falsePositives / alertMetrics.totalAlerts) * 100;

      // Generate optimization suggestions
      const suggestions: any[] = [];

      if (currentPrecision < 80) {
        suggestions.push({
          type: 'increase_threshold',
          description: 'Increase alert threshold to reduce false positives',
          expectedPrecisionGain: Math.min(15, 80 - currentPrecision),
          expectedRecallLoss: Math.max(0, Math.min(5, currentRecall - 70))
        });
      }

      if (currentRecall < 85) {
        suggestions.push({
          type: 'decrease_threshold',
          description: 'Decrease alert threshold to catch more true positives',
          expectedRecallGain: Math.min(10, 85 - currentRecall),
          expectedPrecisionLoss: Math.max(0, Math.min(5, currentPrecision - 75))
        });
      }

      if (alertFPs.length > 5) {
        suggestions.push({
          type: 'add_conditions',
          description: 'Add additional conditions to filter out common false positive scenarios',
          expectedFPReduction: Math.min(alertFPs.length, Math.floor(alertFPs.length * 0.6))
        });
      }

      return {
        alertType,
        currentMetrics: {
          precision: currentPrecision,
          recall: currentRecall,
          falsePositiveRate: fpRate,
          totalAlerts: alertMetrics.totalAlerts
        },
        optimizationSuggestions: suggestions,
        recommendedAction: suggestions.length > 0 ? suggestions[0] : null
      };
    } catch (error) {
      this.logger.error('Failed to optimize alert thresholds:', error);
      throw error;
    }
  }

  async getAlertROI(alertType: string, period = '30d'): Promise<any> {
    try {
      const effectiveness = await this.calculateAlertEffectiveness(alertType, period);
      const alertMetrics = effectiveness.find(e => e.alertType === alertType);

      if (!alertMetrics) {
        return { alertType, roi: 0, details: 'No data available' };
      }

      // Mock ROI calculation
      const avgIncidentCost = 5000; // €5000 per incident
      const avgAlertProcessingCost = 50; // €50 per alert
      const preventedIncidents = alertMetrics.truePositives;
      const totalAlertCost = alertMetrics.totalAlerts * avgAlertProcessingCost;
      const preventedCosts = preventedIncidents * avgIncidentCost;
      const roi = ((preventedCosts - totalAlertCost) / totalAlertCost) * 100;

      return {
        alertType,
        roi: Math.round(roi),
        details: {
          preventedIncidents,
          preventedCosts,
          totalAlertCost,
          netBenefit: preventedCosts - totalAlertCost,
          period
        }
      };
    } catch (error) {
      this.logger.error('Failed to calculate alert ROI:', error);
      return { alertType, roi: 0, details: 'Calculation failed' };
    }
  }
}