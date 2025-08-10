import axios from 'axios';

const AI_BASE_URL = process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8001';

// Create axios instance with authentication
const aiApi = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('ai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface DocumentClassificationRequest {
  documents: string[];
  batch_mode?: boolean;
}

export interface DocumentClassificationResponse {
  classifications: Array<{
    document_index: number;
    predicted_class: string;
    confidence: number;
    confidence_level: 'high' | 'medium' | 'low';
    class_probabilities: { [key: string]: number };
  }>;
  total_documents: number;
  summary: string;
}

export interface SLABreachPredictionRequest {
  item_data: {
    id: string;
    start_date: string;
    deadline: string;
    current_progress: number;
    total_required: number;
    workload?: number;
    complexity?: number;
    team_efficiency?: number;
    historical_performance?: number;
    client_priority?: number;
  };
}

export interface SLABreachPredictionResponse {
  prediction: {
    risk_level: 'Low' | 'Medium' | 'High';
    risk_color: string;
    breach_probability: number;
    class_probabilities: {
      no_breach: number;
      breach_likely: number;
      breach_certain: number;
    };
    confidence: number;
    feature_contributions: { [key: string]: number };
  };
  summary: string;
}

export interface RecurringIssuesRequest {
  complaints: Array<{
    id: string;
    description: string;
    date: string;
    client: string;
    type: string;
  }>;
}

export interface RecurringIssuesResponse {
  recurring_groups: Array<{
    group_id: number;
    complaint_count: number;
    complaints: Array<{
      complaint_id: string;
      description: string;
      date: string;
      client: string;
      type: string;
      similarity_score: number;
    }>;
    top_keywords: string[];
    date_range_days: number;
    avg_similarity: number;
    clients_affected: number;
    pattern_strength: 'high' | 'medium';
  }>;
  total_groups: number;
  total_recurring_complaints: number;
  recurrence_rate: number;
  summary: string;
}

export interface SmartRoutingRequest {
  task: {
    id: string;
    priority: number;
    complexity: number;
    estimated_time: number;
    client_importance: number;
    sla_urgency: number;
    document_count: number;
    requires_expertise: number;
    is_recurring: number;
    type: string;
  };
  available_teams?: string[];
}

export interface SmartRoutingResponse {
  recommended_assignee: string | null;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  all_options: Array<{
    assignee: string;
    base_score: number;
    adjusted_score: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  reasoning: string[];
}

export interface AutomatedDecisionRequest {
  context: any;
  decision_type: 'sla_escalation' | 'workload_rebalancing' | 'priority_adjustment' | 'resource_allocation';
}

export interface AutomatedDecisionResponse {
  decision_type: string;
  decisions: Array<{
    action: string;
    priority: string;
    recommendations: string[];
    confidence: number;
    [key: string]: any;
  }>;
  context: any;
  timestamp: string;
  confidence: number;
}

class AIService {
  // Authentication
  async authenticate(username: string, password: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await aiApi.post('/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const token = response.data.access_token;
      localStorage.setItem('ai_token', token);
      return token;
    } catch (error) {
      console.error('AI authentication failed:', error);
      throw error;
    }
  }

  // Document Classification
  async trainDocumentClassifier(documents: string[], labels: string[], modelType: 'deep_learning' | 'ensemble' = 'deep_learning') {
    try {
      const response = await aiApi.post('/document_classification/train', {
        documents,
        labels,
        model_type: modelType,
      });
      return response.data;
    } catch (error) {
      console.error('Document classifier training failed:', error);
      throw error;
    }
  }

  async classifyDocuments(request: DocumentClassificationRequest): Promise<DocumentClassificationResponse> {
    try {
      const response = await aiApi.post('/document_classification/classify', request);
      return response.data;
    } catch (error) {
      console.error('Document classification failed:', error);
      throw error;
    }
  }

  // SLA Breach Prediction
  async trainSLAPredictor(trainingData: any[], labels: number[]) {
    try {
      const response = await aiApi.post('/sla_breach_prediction/train', {
        training_data: trainingData,
        labels,
      });
      return response.data;
    } catch (error) {
      console.error('SLA predictor training failed:', error);
      throw error;
    }
  }

  async predictSLABreach(request: SLABreachPredictionRequest): Promise<SLABreachPredictionResponse> {
    try {
      const response = await aiApi.post('/sla_breach_prediction/predict', request);
      return response.data;
    } catch (error) {
      console.error('SLA breach prediction failed:', error);
      throw error;
    }
  }

  // Pattern Recognition
  async detectRecurringIssues(request: RecurringIssuesRequest): Promise<RecurringIssuesResponse> {
    try {
      const response = await aiApi.post('/pattern_recognition/recurring_issues', request);
      return response.data;
    } catch (error) {
      console.error('Recurring issues detection failed:', error);
      throw error;
    }
  }

  async detectProcessAnomalies(processData: any[]) {
    try {
      const response = await aiApi.post('/pattern_recognition/process_anomalies', {
        process_data: processData,
      });
      return response.data;
    } catch (error) {
      console.error('Process anomaly detection failed:', error);
      throw error;
    }
  }

  async analyzeTemporalPatterns(events: Array<{ date: string; [key: string]: any }>) {
    try {
      const response = await aiApi.post('/pattern_recognition/temporal_patterns', {
        events,
      });
      return response.data;
    } catch (error) {
      console.error('Temporal pattern analysis failed:', error);
      throw error;
    }
  }

  // Smart Routing
  async buildTeamProfiles(historicalData: any[]) {
    try {
      const response = await aiApi.post('/smart_routing/build_profiles', {
        historical_data: historicalData,
      });
      return response.data;
    } catch (error) {
      console.error('Team profile building failed:', error);
      throw error;
    }
  }

  async trainRoutingModel(trainingData: any[]) {
    try {
      const response = await aiApi.post('/smart_routing/train', {
        training_data: trainingData,
      });
      return response.data;
    } catch (error) {
      console.error('Routing model training failed:', error);
      throw error;
    }
  }

  async suggestOptimalAssignment(request: SmartRoutingRequest): Promise<SmartRoutingResponse> {
    try {
      const response = await aiApi.post('/smart_routing/suggest_assignment', request);
      return response.data;
    } catch (error) {
      console.error('Assignment suggestion failed:', error);
      throw error;
    }
  }

  // Automated Decisions
  async makeAutomatedDecision(request: AutomatedDecisionRequest): Promise<AutomatedDecisionResponse> {
    try {
      const response = await aiApi.post('/automated_decisions', request);
      return response.data;
    } catch (error) {
      console.error('Automated decision making failed:', error);
      throw error;
    }
  }

  // Legacy endpoints (keeping for backward compatibility)
  async analyzeBordereaux(bordereaux: any[]) {
    try {
      const response = await aiApi.post('/analyze', bordereaux);
      return response.data;
    } catch (error) {
      console.error('Bordereau analysis failed:', error);
      throw error;
    }
  }

  async getSuggestions(complaint: any) {
    try {
      const response = await aiApi.post('/suggestions', complaint);
      return response.data;
    } catch (error) {
      console.error('Suggestions failed:', error);
      throw error;
    }
  }

  async getRecommendations(payload: any) {
    try {
      const response = await aiApi.post('/recommendations', payload);
      return response.data;
    } catch (error) {
      console.error('Recommendations failed:', error);
      throw error;
    }
  }

  async predictSLA(items: any[], explain: boolean = false) {
    try {
      const response = await aiApi.post('/sla_prediction', items, {
        params: { explain },
      });
      return response.data;
    } catch (error) {
      console.error('SLA prediction failed:', error);
      throw error;
    }
  }

  async getPriorities(bordereaux: any[], explain: boolean = false) {
    try {
      const response = await aiApi.post('/priorities', bordereaux, {
        params: { explain },
      });
      return response.data;
    } catch (error) {
      console.error('Priority calculation failed:', error);
      throw error;
    }
  }

  async getReassignmentRecommendations(data: any) {
    try {
      const response = await aiApi.post('/reassignment', data);
      return response.data;
    } catch (error) {
      console.error('Reassignment recommendations failed:', error);
      throw error;
    }
  }

  async analyzePerformance(data: any) {
    try {
      const response = await aiApi.post('/performance', data);
      return response.data;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      throw error;
    }
  }

  async detectAnomalies(data: any) {
    try {
      const response = await aiApi.post('/anomaly_detection', data);
      return response.data;
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      throw error;
    }
  }

  async forecastTrends(data: any) {
    try {
      const response = await aiApi.post('/trend_forecast', data);
      return response.data;
    } catch (error) {
      console.error('Trend forecasting failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await aiApi.get('/health');
      return response.data;
    } catch (error) {
      console.error('AI service health check failed:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
export default aiService;