import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Statistic, Row, Col, Timeline, message, Badge, Tooltip, Space, Typography, Tabs } from 'antd';
import { SyncOutlined, CloudDownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, WarningOutlined, SettingOutlined } from '@ant-design/icons';
import { LocalAPI } from '../../services/axios';
import TuniclaimReclamationsPanel from '../reclamations/TuniclaimReclamationsPanel';

const { Text } = Typography;
const { TabPane } = Tabs;

interface SyncStatus {
  lastSync: string | null;
  lastResult: { imported: number; errors: number } | null;
  isHealthy: boolean | null;
  logs: Array<{
    date: string;
    imported: number;
    errors: number;
    details?: string;
  }>;
  error?: string;
}

interface SyncResult {
  success: boolean;
  imported: number;
  errors: number;
  message: string;
  error?: string;
}

export const TuniclaimSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sync');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await LocalAPI.get('/bulletin-soin/sync/tuniclaim/status');
      setStatus(response.data);
    } catch (error: any) {
      console.error('Status fetch error:', error);
      message.error('Erreur lors de la récupération du statut de synchronisation');
      setStatus({
        lastSync: null,
        lastResult: null,
        isHealthy: false,
        logs: [],
        error: error.message || 'Erreur de connexion'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await LocalAPI.post('/bulletin-soin/sync/tuniclaim');
      const result: SyncResult = response.data;
      
      if (result.success) {
        if (result.errors > 0) {
          message.warning(result.message || `Synchronisation terminée avec ${result.errors} erreur(s). ${result.imported} bordereaux importés.`);
        } else {
          message.success(result.message || `Synchronisation réussie! ${result.imported} bordereaux importés.`);
        }
      } else {
        message.error(result.message || 'Erreur lors de la synchronisation');
      }
      
      // Refresh status after sync
      setTimeout(() => fetchStatus(), 1000);
    } catch (error: any) {
      console.error('Sync error:', error);
      message.error('Erreur lors de la synchronisation avec MY TUNICLAIM');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    if (status?.error) {
      return { color: 'red', text: 'Erreur de connexion', icon: <ExclamationCircleOutlined /> };
    }
    if (status?.isHealthy === null) {
      return { color: 'gray', text: 'Aucune synchronisation', icon: <InfoCircleOutlined /> };
    }
    if (status?.isHealthy === false) {
      return { color: 'orange', text: 'Dernière sync avec erreurs', icon: <WarningOutlined /> };
    }
    return { color: 'green', text: 'Fonctionnel', icon: <CheckCircleOutlined /> };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        <TabPane tab={<span><SyncOutlined />Synchronisation</span>} key="sync">
          <Card 
        title={
          <Space>
            <CloudDownloadOutlined />
            <span>Synchronisation MY TUNICLAIM</span>
            <Badge 
              color={healthStatus.color} 
              text={
                <Tooltip title={status?.error || 'Statut de la connexion MY TUNICLAIM'}>
                  <Text type={healthStatus.color === 'red' ? 'danger' : healthStatus.color === 'orange' ? 'warning' : 'success'}>
                    {healthStatus.icon} {healthStatus.text}
                  </Text>
                </Tooltip>
              }
            />
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Actualiser le statut">
              <Button 
                icon={<InfoCircleOutlined />}
                onClick={fetchStatus}
                loading={loading}
                size="small"
              />
            </Tooltip>
            <Button 
              type="primary" 
              icon={<SyncOutlined spin={syncing} />}
              onClick={handleSync}
              loading={syncing}
              disabled={status?.error ? true : false}
            >
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </Button>
          </Space>
        }
        loading={loading}
      >
        {/* Connection Error Alert */}
        {status?.error && (
          <Alert
            type="error"
            message="Erreur de connexion MY TUNICLAIM"
            description={status.error}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Last Sync Info */}
        {status?.lastSync && (
          <Alert
            type="info"
            message={`Dernière synchronisation: ${formatDate(status.lastSync)}`}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Statistics */}
        {status?.lastResult && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Bordereaux importés"
                value={status.lastResult.imported}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Erreurs"
                value={status.lastResult.errors}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: status.lastResult.errors > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Taux de succès"
                value={status.lastResult.imported + status.lastResult.errors > 0 
                  ? Math.round((status.lastResult.imported / (status.lastResult.imported + status.lastResult.errors)) * 100)
                  : 0
                }
                suffix="%"
                prefix={<InfoCircleOutlined />}
                valueStyle={{ 
                  color: status.lastResult.errors === 0 ? '#3f8600' : 
                         status.lastResult.errors < status.lastResult.imported ? '#faad14' : '#cf1322'
                }}
              />
            </Col>
          </Row>
        )}

        {/* Sync History */}
        <Card title="Historique des synchronisations" size="small" style={{ marginBottom: 16 }}>
          {status?.logs && status.logs.length > 0 ? (
            <Timeline
              items={status.logs.map((log, index) => ({
                color: log.errors > 0 ? 'red' : 'green',
                children: (
                  <div key={index}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {formatDate(log.date)}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="success">Importés: {log.imported}</Text>
                      {' | '}
                      <Text type={log.errors > 0 ? 'danger' : 'success'}>Erreurs: {log.errors}</Text>
                    </div>
                    {log.details && (
                      <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                        <Tooltip title={log.details}>
                          <Text ellipsis style={{ maxWidth: 300, display: 'block' }}>
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </Text>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">Aucun historique de synchronisation disponible</Text>
          )}
        </Card>

        {/* Information Panel */}
        <div style={{ 
          padding: 16, 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: 8,
          marginTop: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <InfoCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            <Text strong>MY TUNICLAIM Integration</Text>
          </div>
          <Text style={{ fontSize: '13px', lineHeight: '1.5' }}>
            Synchronise automatiquement les bordereaux et bulletins de soins depuis MY TUNICLAIM vers le système ARS.
            Les données incluent les informations client, contrat, et tous les détails des BS avec leurs items.
          </Text>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            <Text>• Synchronisation automatique toutes les heures</Text><br/>
            <Text>• Détection des doublons et mise à jour intelligente</Text><br/>
            <Text>• Notifications par email en cas d'erreur</Text>
          </div>
        </div>
      </Card>
        </TabPane>
        <TabPane tab={<span><SettingOutlined />Gestion Réclamations</span>} key="reclamations">
          <TuniclaimReclamationsPanel />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TuniclaimSync;