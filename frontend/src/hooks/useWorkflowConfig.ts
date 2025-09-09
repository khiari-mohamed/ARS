import { useState, useEffect } from 'react';
import { LocalAPI } from '../services/axios';

export interface TeamConfig {
  teamId: string;
  maxLoad: number;
  autoReassignEnabled: boolean;
  overflowAction: string;
  alertThreshold: number;
}

export const useWorkflowConfig = () => {
  const [configs, setConfigs] = useState<TeamConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await LocalAPI.get('/workflow/team-configs');
      setConfigs(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch team configurations');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (teamId: string, config: Partial<TeamConfig>) => {
    try {
      await LocalAPI.put(`/workflow/team-configs/${teamId}`, config);
      await fetchConfigs();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
      return false;
    }
  };

  const getTeamStatus = async (teamId: string) => {
    try {
      const response = await LocalAPI.get(`/workflow/team-status/${teamId}`);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get team status');
      return null;
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    updateConfig,
    getTeamStatus
  };
};