import { AnalyticsInsight } from './advanced-analytics.service';
import { AICoreService } from './ai-core.service';
import { AdvancedAnalyticsHelpers } from './advanced-analytics-helpers';

export class AdvancedAnalyticsInsights {
  static async generateInsightsFromClaims(
    claims: any[], 
    aiCore: AICoreService,
    identifyPatternsFromClaims: (claims: any[]) => Promise<any[]>
  ): Promise<AnalyticsInsight[]> {
    if (claims.length === 0) return [];
    
    const insights: AnalyticsInsight[] = [];
    
    // AI-powered anomaly insights
    const texts = claims.map(c => c.description || '').filter(d => d.length > 0);
    const anomalies = await aiCore.detectTextAnomalies(texts);
    const anomalousCount = anomalies.filter(a => a.isAnomaly).length;
    
    if (anomalousCount > 0) {
      insights.push({
        type: 'anomaly',
        title: 'Anomalies détectées par IA',
        description: `${anomalousCount} réclamations avec des patterns anormaux détectés`,
        severity: anomalousCount > texts.length * 0.1 ? 'critical' : 'warning',
        data: { anomalousCount, totalCount: texts.length },
        actionable: true,
        suggestedActions: [
          'Examiner les réclamations anomales en détail',
          'Identifier les causes sous-jacentes',
          'Ajuster les processus si nécessaire'
        ]
      });
    }
    
    // Pattern-based insights
    const patterns = await identifyPatternsFromClaims(claims);
    const highFreqPatterns = patterns.filter(p => p.frequency >= 5);
    
    if (highFreqPatterns.length > 0) {
      insights.push({
        type: 'pattern',
        title: 'Patterns à haute fréquence détectés',
        description: `${highFreqPatterns.length} types de réclamations avec forte fréquence`,
        severity: 'warning',
        data: highFreqPatterns,
        actionable: true,
        suggestedActions: [
          'Prioriser le traitement de ces types de réclamations',
          'Mettre en place des mesures préventives',
          'Former les équipes sur ces problématiques'
        ]
      });
    }

    // Dynamic threshold insights
    const volumes = AdvancedAnalyticsHelpers.calculateDailyVolumes(claims);
    aiCore.updateDynamicThreshold('daily_volume', volumes);
    const threshold = aiCore.getDynamicThreshold('daily_volume');
    const recentVolume = volumes[volumes.length - 1] || 0;
    
    if (recentVolume > threshold) {
      insights.push({
        type: 'trend',
        title: 'Volume anormalement élevé détecté',
        description: `Volume récent (${recentVolume}) dépasse le seuil dynamique (${Math.round(threshold)})`,
        severity: 'warning',
        data: { recentVolume, threshold, volumes },
        actionable: true,
        suggestedActions: [
          'Analyser les causes de l\'augmentation',
          'Renforcer les équipes de traitement',
          'Vérifier les processus opérationnels'
        ]
      });
    }

    return insights;
  }
}