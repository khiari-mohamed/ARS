import { useState, useEffect } from 'react';
import { getSLADefaults, getSLACompliance, createSLAConfig, updateSLAConfig } from '../services/clientService';

export interface SLAConfig {
  thresholds: {
    reglementDelay: number;
    reclamationDelay: number;
    warningThreshold: number;
    criticalThreshold: number;
    escalationDelay: number;
  };
  alerts: {
    enabled: boolean;
    emailNotifications: boolean;
    dashboardAlerts: boolean;
  };
  active: boolean;
}

export const useSLAConfig = (clientId?: string) => {
  const [config, setConfig] = useState<SLAConfig | null>(null);
  const [defaults, setDefaults] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDefaults = async () => {
    try {
      const data = await getSLADefaults();
      setDefaults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SLA defaults');
    }
  };

  const fetchCompliance = async (clientId: string) => {
    try {
      const data = await getSLACompliance(clientId);
      setCompliance(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SLA compliance');
    }
  };

  const saveConfig = async (clientId: string, configData: SLAConfig) => {
    setLoading(true);
    try {
      if (config) {
        await updateSLAConfig(clientId, configData);
      } else {
        await createSLAConfig(clientId, configData);
      }
      setConfig(configData);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save SLA configuration');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaults();
    if (clientId) {
      fetchCompliance(clientId);
    }
  }, [clientId]);

  return {
    config,
    defaults,
    compliance,
    loading,
    error,
    saveConfig,
    fetchCompliance
  };
};