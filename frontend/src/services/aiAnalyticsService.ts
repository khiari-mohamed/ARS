import axios from 'axios';
import { aiService } from './aiService';

const AI_MICROSERVICE_URL = process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002';

// Token management
let aiToken: string | null = null;

export class AIAnalyticsService {
  private static async getAIToken(): Promise<string> {
    if (aiToken) return aiToken;
    
    try {
      const credentials = [
        { username: 'admin', password: 'secret' },
        { username: 'analyst', password: 'secret' },
        { username: 'ai_user', password: 'ai_password' }
      ];
      
      for (const cred of credentials) {
        try {
          const formData = new URLSearchParams();
          formData.append('grant_type', 'password');
          formData.append('username', cred.username);
          formData.append('password', cred.password);
          
          const response = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 5000
          });
          
          aiToken = response.data.access_token;
          console.log(`✅ AI Analytics authenticated with ${cred.username}`);
          return aiToken!;
        } catch (credError) {
          console.warn(`❌ AI Analytics auth failed with ${cred.username}`);
          continue;
        }
      }
      throw new Error('All credentials failed');
    } catch (error) {
      console.error('🚫 AI Analytics authentication failed');
      throw new Error('AI authentication failed');
    }
  }
  
  private static async makeAuthenticatedRequest(url: string, data: any, method: 'GET' | 'POST' = 'POST') {
    try {
      const token = await this.getAIToken();
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      };
      
      if (method === 'GET') {
        return await axios.get(`${AI_MICROSERVICE_URL}${url}`, config);
      } else {
        return await axios.post(`${AI_MICROSERVICE_URL}${url}`, data, config);
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired, clear it and retry once
        aiToken = null;
        const token = await this.getAIToken();
        const config = {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        };
        
        if (method === 'GET') {
          return await axios.get(`${AI_MICROSERVICE_URL}${url}`, config);
        } else {
          return await axios.post(`${AI_MICROSERVICE_URL}${url}`, data, config);
        }
      }
      throw error;
    }
  }

  static async predictSLABreaches(bordereaux: any[]) {
    try {
      if (!bordereaux || bordereaux.length === 0) {
        return {
          risksCount: 0,
          predictions: [],
          recommendations: ['Aucune donnée à analyser']
        };
      }

      const analysisData = bordereaux.slice(0, 10).map(b => ({
        id: b.id,
        start_date: b.dateReception,
        deadline: new Date(new Date(b.dateReception).getTime() + (b.delaiReglement || 5) * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut) ? 100 : 
                         ['EN_COURS', 'ASSIGNE'].includes(b.statut) ? 50 : 10,
        total_required: 100,
        sla_days: b.delaiReglement || 5
      }));

      const response = await this.makeAuthenticatedRequest('/sla_prediction', analysisData);

      const risksCount = response.data.sla_predictions?.filter((p: any) => p.risk === '🔴' || p.risk === '🟠').length || 0;

      return {
        risksCount,
        predictions: response.data.sla_predictions || [],
        recommendations: [
          'Réaffecter les dossiers critiques',
          'Augmenter les ressources pour les équipes surchargées',
          'Optimiser les processus de traitement'
        ]
      };
    } catch (error: any) {
      console.warn('SLA prediction unavailable:', error.message);
      return {
        risksCount: 0,
        predictions: [],
        recommendations: ['Service IA temporairement indisponible']
      };
    }
  }

  static async getPriorities(bordereaux: any[]) {
    try {
      const token = await this.getAIToken();
      const analysisData = bordereaux.map(b => ({
        id: b.id,
        start_date: b.dateReception,
        deadline: new Date(new Date(b.dateReception).getTime() + (b.delaiReglement || 5) * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut) ? 100 : 
                         ['EN_COURS', 'ASSIGNE'].includes(b.statut) ? 50 : 10,
        total_required: 100
      }));

      const response = await this.makeAuthenticatedRequest('/priorities', analysisData);

      return response.data.priorities || [];
    } catch (error) {
      console.warn('Priorities unavailable:', error);
      return [];
    }
  }

  static async getReassignmentRecommendations(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await this.makeAuthenticatedRequest('/reassignment', payload);

      return response.data.reassignment || [];
    } catch (error) {
      console.warn('Reassignment recommendations unavailable:', error);
      return [];
    }
  }

  static async comparePerformance(planned: any[], actual: any[]) {
    try {
      const token = await this.getAIToken();
      const performanceData = {
        planned_performance: planned,
        actual_performance: actual
      };

      const response = await this.makeAuthenticatedRequest('/performance_analysis', performanceData);

      const underPerformers = response.data.performance?.filter((p: any) => p.status === 'UNDER') || [];

      return {
        optimizations: underPerformers.map((p: any) => ({
          userId: p.user_id,
          recommendation: `Améliorer performance de ${p.delta}% pour atteindre l'objectif`,
          priority: Math.abs(p.delta) > 20 ? 'HIGH' : 'MEDIUM'
        })),
        summary: {
          totalAnalyzed: response.data.performance?.length || 0,
          underPerforming: underPerformers.length,
          avgGap: underPerformers.reduce((sum: number, p: any) => sum + Math.abs(p.delta), 0) / (underPerformers.length || 1)
        }
      };
    } catch (error) {
      console.warn('Performance comparison unavailable:', error);
      return {
        optimizations: [],
        summary: { totalAnalyzed: 0, underPerforming: 0, avgGap: 0 }
      };
    }
  }

  static async forecastTrends(historicalData: any[], forecastDays: number = 30) {
    try {
      const token = await this.getAIToken();
      const response = await this.makeAuthenticatedRequest('/forecast', {
        historical_data: historicalData,
        forecast_days: forecastDays
      });

      return response.data || { forecast: [], trend_direction: 'stable' };
    } catch (error) {
      console.warn('Trend forecasting unavailable:', error);
      return { forecast: [], trend_direction: 'stable' };
    }
  }

  static async predictRequiredResources(payload: any) {
    try {
      const token = await this.getAIToken();
      const response = await this.makeAuthenticatedRequest('/resource_prediction', payload);

      return response.data || { required_resources: 0, confidence: 0 };
    } catch (error) {
      console.warn('Resource prediction unavailable:', error);
      return { required_resources: 0, confidence: 0 };
    }
  }

  static async getSuggestedAssignment(task: any) {
    try {
      const token = await this.getAIToken();
      const response = await this.makeAuthenticatedRequest('/assignment_suggestion', task);

      return response.data || { suggested_team: null, confidence: 0 };
    } catch (error) {
      console.warn('Assignment suggestion unavailable:', error);
      return { suggested_team: null, confidence: 0 };
    }
  }

  static async makeAutomatedDecision(context: any, decisionType: string) {
    try {
      const token = await this.getAIToken();
      const response = await this.makeAuthenticatedRequest('/automated_decisions', {
        context,
        decision_type: decisionType
      });

      return response.data.decisions?.[0] || { action: 'No action recommended', confidence: 0 };
    } catch (error) {
      console.warn('Automated decision unavailable:', error);
      return { action: 'No action recommended', confidence: 0 };
    }
  }

  static async generateComprehensiveReport(filters: any) {
    try {
      const [slaAnalysis, performanceAnalysis, trendsAnalysis] = await Promise.all([
        this.predictSLABreaches([]),
        this.comparePerformance([], []),
        this.forecastTrends([])
      ]);

      const recommendations: string[] = [];
      
      if (slaAnalysis.risksCount > 0) {
        recommendations.push(`${slaAnalysis.risksCount} dossiers à risque de dépassement SLA`);
      }

      if (performanceAnalysis.optimizations.length > 0) {
        const highPriorityOptimizations = performanceAnalysis.optimizations.filter((o: any) => o.priority === 'HIGH');
        if (highPriorityOptimizations.length > 0) {
          recommendations.push(`${highPriorityOptimizations.length} utilisateurs nécessitent une attention immédiate`);
        }
      }

      if (trendsAnalysis.trend_direction === 'increasing') {
        recommendations.push('Tendance à la hausse détectée - prévoir des ressources supplémentaires');
      }

      return {
        summary: {
          slaRisks: slaAnalysis.risksCount,
          performanceIssues: performanceAnalysis.optimizations.length,
          trendDirection: trendsAnalysis.trend_direction
        },
        recommendations,
        detailedAnalysis: {
          sla: slaAnalysis,
          performance: performanceAnalysis,
          trends: trendsAnalysis
        }
      };
    } catch (error) {
      console.warn('Comprehensive report generation failed:', error);
      return {
        summary: { slaRisks: 0, performanceIssues: 0, trendDirection: 'stable' },
        recommendations: ['Service IA temporairement indisponible'],
        detailedAnalysis: null
      };
    }
  }

  static async exportAnalyticsData(format: 'excel' | 'pdf' | 'csv', filters: any) {
    try {
      const response = await axios.post('/api/analytics/export', {
        format,
        filters
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.warn('Export failed:', error);
      return { success: false, error: 'Export failed' };
    }
  }

  static async subscribeToRealTimeUpdates(callback: (data: any) => void) {
    try {
      const ws = new WebSocket(`ws://localhost:8002/ws/analytics`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.warn('Real-time subscription failed:', error);
      return () => {};
    }
  }

  // Public methods for anomaly detection
  static async detectAnomalies(data: any[]) {
    try {
      const response = await this.makeAuthenticatedRequest('/anomaly_detection', {
        data,
        method: 'isolation_forest'
      });

      return response.data.anomalies || [];
    } catch (error) {
      console.warn('Anomaly detection unavailable:', error);
      return [];
    }
  }

  private static async analyzePerformance(payload: any) {
    try {
      const response = await this.makeAuthenticatedRequest('/performance_analysis', payload);

      return response.data || { performance: [] };
    } catch (error) {
      console.warn('Performance analysis unavailable:', error);
      return { performance: [] };
    }
  }
}

export default AIAnalyticsService;