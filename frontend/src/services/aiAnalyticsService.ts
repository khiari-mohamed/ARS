import { LocalAPI, AIAPI } from './axios';

// AI Analytics Service for enhanced predictions and recommendations
export class AIAnalyticsService {
  
  // Get AI service token
  static async getAIToken() {
    try {
      const formData = new URLSearchParams();
      formData.append('username', 'admin');
      formData.append('password', 'secret');
      
      const response = await AIAPI.post('/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.access_token) {
        localStorage.setItem('ai_token', response.data.access_token);
        return response.data.access_token;
      }
    } catch (error) {
      console.error('Failed to get AI token:', error);
    }
    return null;
  }
  
  // Ensure AI authentication
  static async ensureAIAuth() {
    let token = localStorage.getItem('ai_token');
    if (!token) {
      token = await this.getAIToken();
    }
    return token;
  }
  
  // SLA Breach Prediction with AI
  static async predictSLABreaches(items: any[]) {
    try {
      const response = await AIAPI.post('/sla_prediction', items);
      return response.data;
    } catch (error) {
      console.error('SLA prediction failed:', error);
      return { sla_predictions: [] };
    }
  }

  // Priority Scoring with AI
  static async getPriorities(bordereaux: any[]) {
    try {
      const response = await AIAPI.post('/priorities', bordereaux);
      return response.data;
    } catch (error) {
      console.error('Priority scoring failed:', error);
      return { priorities: [] };
    }
  }

  // Reassignment Recommendations
  static async getReassignmentRecommendations(payload: any) {
    try {
      const response = await AIAPI.post('/reassignment', payload);
      return response.data;
    } catch (error) {
      console.error('Reassignment recommendations failed:', error);
      return { reassignment: [] };
    }
  }

  // Performance Analysis with AI
  static async analyzePerformance(payload: any) {
    try {
      const response = await AIAPI.post('/performance', payload);
      return response.data;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      return { performance: [] };
    }
  }

  // Compare Performance (Planned vs Actual)
  static async comparePerformance(planned: any[], actual: any[]) {
    try {
      const response = await AIAPI.post('/compare_performance', {
        planned,
        actual
      });
      return response.data;
    } catch (error) {
      console.error('Performance comparison failed:', error);
      return { comparison: [] };
    }
  }

  // Diagnostic and Optimization
  static async getDiagnosticOptimization(metrics: any[]) {
    try {
      const response = await AIAPI.post('/diagnostic_optimisation', {
        metrics
      });
      return response.data;
    } catch (error) {
      console.error('Diagnostic optimization failed:', error);
      return { diagnostic: [] };
    }
  }

  // Predict Required Resources
  static async predictRequiredResources(slaData: any) {
    try {
      const response = await AIAPI.post('/predict_resources', slaData);
      return response.data;
    } catch (error) {
      console.error('Resource prediction failed:', error);
      return { required_managers: null };
    }
  }

  // Advanced Analytics - Anomaly Detection
  static async detectAnomalies(data: any[], method: 'isolation_forest' | 'lof' = 'isolation_forest') {
    try {
      const response = await AIAPI.post('/anomaly_detection', {
        data,
        method,
        contamination: 0.1
      });
      return response.data;
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return { anomalies: [] };
    }
  }

  // Trend Forecasting
  static async forecastTrends(historicalData: any[], forecastDays: number = 30) {
    try {
      const response = await AIAPI.post('/trend_forecast', {
        historical_data: historicalData,
        forecast_days: forecastDays
      });
      return response.data;
    } catch (error) {
      console.error('Trend forecasting failed:', error);
      return { forecast: [] };
    }
  }

  // Confidence Scoring
  static async getConfidenceScores(trainingData: any[], predictionData: any[]) {
    try {
      const response = await AIAPI.post('/confidence_scoring', {
        training_data: trainingData,
        prediction_data: predictionData
      });
      return response.data;
    } catch (error) {
      console.error('Confidence scoring failed:', error);
      return { predictions: [] };
    }
  }

  // Document Classification
  static async classifyDocuments(documents: string[]) {
    try {
      const response = await AIAPI.post('/document_classification/classify', {
        documents,
        batch_mode: true
      });
      return response.data;
    } catch (error) {
      console.error('Document classification failed:', error);
      return { classifications: [] };
    }
  }

  // Pattern Recognition - Recurring Issues
  static async detectRecurringIssues(complaints: any[]) {
    try {
      const response = await AIAPI.post('/pattern_recognition/recurring_issues', {
        complaints
      });
      return response.data;
    } catch (error) {
      console.error('Recurring issue detection failed:', error);
      return { recurring_groups: [] };
    }
  }

  // Smart Routing Suggestions
  static async getSuggestedAssignment(task: any, availableTeams?: any[]) {
    try {
      const response = await AIAPI.post('/smart_routing/suggest_assignment', {
        task,
        available_teams: availableTeams
      });
      return response.data;
    } catch (error) {
      console.error('Smart routing failed:', error);
      return { suggested_team: null };
    }
  }

  // Automated Decision Making
  static async makeAutomatedDecision(context: any, decisionType: string) {
    try {
      const response = await AIAPI.post('/automated_decisions', {
        context,
        decision_type: decisionType
      });
      return response.data;
    } catch (error) {
      console.error('Automated decision failed:', error);
      return { decision: null };
    }
  }

  // Comprehensive Analytics Report
  static async generateComprehensiveReport(filters: any = {}) {
    try {
      const [
        slaData,
        capacityData,
        performanceData,
        forecastData
      ] = await Promise.all([
        LocalAPI.get('/analytics/sla/dashboard', { params: filters }),
        LocalAPI.get('/analytics/sla/capacity'),
        LocalAPI.get('/analytics/performance/by-user', { params: filters }),
        LocalAPI.get('/analytics/forecast')
      ]);

      // Generate AI insights
      const aiInsights = await this.generateAIInsights({
        sla: slaData.data,
        capacity: capacityData.data,
        performance: performanceData.data,
        forecast: forecastData.data
      });

      return {
        sla: slaData.data,
        capacity: capacityData.data,
        performance: performanceData.data,
        forecast: forecastData.data,
        aiInsights
      };
    } catch (error) {
      console.error('Comprehensive report generation failed:', error);
      return null;
    }
  }

  // Generate AI Insights from multiple data sources
  private static async generateAIInsights(data: any) {
    const insights = [];

    // SLA Insights
    if (data.sla?.overview) {
      const complianceRate = data.sla.overview.complianceRate;
      if (complianceRate < 80) {
        insights.push({
          type: 'warning',
          category: 'SLA',
          message: `Taux de conformité SLA faible (${complianceRate.toFixed(1)}%)`,
          recommendation: 'Réviser les processus et réassigner la charge de travail',
          priority: 'high'
        });
      }
    }

    // Capacity Insights
    if (data.capacity) {
      const overloadedCount = data.capacity.filter((c: any) => c.capacityStatus === 'overloaded').length;
      if (overloadedCount > 0) {
        insights.push({
          type: 'error',
          category: 'Capacity',
          message: `${overloadedCount} gestionnaires en surcharge`,
          recommendation: 'Réassignation immédiate recommandée',
          priority: 'high'
        });
      }
    }

    // Forecast Insights
    if (data.forecast) {
      const trend = data.forecast.slope;
      if (trend > 2) {
        insights.push({
          type: 'info',
          category: 'Forecast',
          message: 'Tendance croissante détectée dans la charge de travail',
          recommendation: 'Prévoir des ressources supplémentaires',
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  // Real-time Analytics Integration
  static async subscribeToRealTimeUpdates(callback: (data: any) => void) {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll use polling
    const interval = setInterval(async () => {
      try {
        const kpis = await LocalAPI.get('/analytics/kpis/daily');
        callback(kpis.data);
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }

  // Export Analytics Data
  static async exportAnalyticsData(format: 'excel' | 'pdf' | 'csv', filters: any = {}) {
    try {
      const response = await LocalAPI.get('/analytics/export', {
        params: { ...filters, format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }
}

export default AIAnalyticsService;