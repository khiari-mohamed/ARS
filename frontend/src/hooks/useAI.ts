import { useState, useEffect, useCallback } from 'react';
import { aiService } from '../services/aiService';

export interface AIState {
  loading: boolean;
  error: string | null;
  data: any;
}

export const useAI = () => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    data: null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setData = (data: any) => {
    setState(prev => ({ ...prev, data }));
  };

  // Document Classification
  const classifyDocuments = useCallback(async (documents: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.classifyDocuments({ documents });
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Document classification failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // SLA Breach Prediction
  const predictSLABreach = useCallback(async (itemData: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.predictSLABreach({ item_data: itemData });
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'SLA breach prediction failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recurring Issues Detection
  const detectRecurringIssues = useCallback(async (complaints: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.detectRecurringIssues({ complaints });
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Recurring issues detection failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart Routing
  const suggestAssignment = useCallback(async (task: any, availableTeams?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.suggestOptimalAssignment({ task, available_teams: availableTeams });
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Assignment suggestion failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Automated Decisions
  const makeAutomatedDecision = useCallback(async (context: any, decisionType: 'sla_escalation' | 'workload_rebalancing' | 'priority_adjustment' | 'resource_allocation') => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.makeAutomatedDecision({ context, decision_type: decisionType });
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Automated decision failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process Anomaly Detection
  const detectProcessAnomalies = useCallback(async (processData: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.detectProcessAnomalies(processData);
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Process anomaly detection failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Temporal Pattern Analysis
  const analyzeTemporalPatterns = useCallback(async (events: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.analyzeTemporalPatterns(events);
      setData(result);
      return result;
    } catch (error: any) {
      setError(error.message || 'Temporal pattern analysis failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ...state,
    classifyDocuments,
    predictSLABreach,
    detectRecurringIssues,
    suggestAssignment,
    makeAutomatedDecision,
    detectProcessAnomalies,
    analyzeTemporalPatterns,
    clearError: () => setError(null),
    clearData: () => setData(null),
  };
};

// Specialized hooks for specific AI features
export const useDocumentClassification = () => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    data: null,
  });

  const classify = useCallback(async (documents: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.classifyDocuments({ documents });
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const train = useCallback(async (documents: string[], labels: string[], modelType: 'deep_learning' | 'ensemble' = 'deep_learning') => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.trainDocumentClassifier(documents, labels, modelType);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    classify,
    train,
  };
};

export const useSLAPrediction = () => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    data: null,
  });

  const predict = useCallback(async (itemData: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.predictSLABreach({ item_data: itemData });
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const train = useCallback(async (trainingData: any[], labels: number[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.trainSLAPredictor(trainingData, labels);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    predict,
    train,
  };
};

export const useSmartRouting = () => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    data: null,
  });

  const suggest = useCallback(async (task: any, availableTeams?: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.suggestOptimalAssignment({ task, available_teams: availableTeams });
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const buildProfiles = useCallback(async (historicalData: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.buildTeamProfiles(historicalData);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const train = useCallback(async (trainingData: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.trainRoutingModel(trainingData);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    suggest,
    buildProfiles,
    train,
  };
};

export const usePatternRecognition = () => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    data: null,
  });

  const detectRecurring = useCallback(async (complaints: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.detectRecurringIssues({ complaints });
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const detectAnomalies = useCallback(async (processData: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.detectProcessAnomalies(processData);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const analyzePatterns = useCallback(async (events: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await aiService.analyzeTemporalPatterns(events);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  return {
    ...state,
    detectRecurring,
    detectAnomalies,
    analyzePatterns,
  };
};

export default useAI;