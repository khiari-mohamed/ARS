import React, { useState } from 'react';
import { Card, Button, Alert, Statistic, Row, Col, Timeline, message } from 'antd';
import { SyncOutlined, CloudDownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface SyncStatus {
  lastSync: string | null;
  lastResult: { imported: number; errors: number } | null;
  logs: Array<{
    date: string;
    imported: number;
    errors: number;
    details?: string;
  }>;
}

export const TuniclaimSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://197.14.56.112:8083/api/bulletin-soin/sync/tuniclaim/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      message.error('Erreur lors de la récupération du statut');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('https://197.14.56.112:8083/api/bulletin-soin/sync/tuniclaim', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.errors > 0) {
        message.warning(`Synchronisation terminée avec ${result.errors} erreur(s). ${result.imported} BS importés.`);
      } else {
        message.success(`Synchronisation réussie! ${result.imported} BS importés.`);
      }
      
      await fetchStatus();
    } catch (error) {
      message.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <Card 
      title="Synchronisation MY TUNICLAIM"
      extra={
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={syncing} />}
          onClick={handleSync}
          loading={syncing}
        >
          Synchroniser
        </Button>
      }
    >
      {status?.lastSync && (
        <Alert
          type="info"
          message={`Dernière synchronisation: ${new Date(status.lastSync).toLocaleString()}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {status?.lastResult && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Statistic
              title="BS importés"
              value={status.lastResult.imported}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Erreurs"
              value={status.lastResult.errors}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: status.lastResult.errors > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>
      )}

      <Card title="Historique des synchronisations" size="small">
        <Timeline
          items={status?.logs?.map(log => ({
            color: log.errors > 0 ? 'red' : 'green',
            children: (
              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {new Date(log.date).toLocaleString()}
                </div>
                <div>
                  Importés: {log.imported} | Erreurs: {log.errors}
                </div>
                {log.details && (
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {log.details}
                  </div>
                )}
              </div>
            ),
          })) || []}
        />
      </Card>

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: '#f6ffed', 
        border: '1px solid #b7eb8f',
        borderRadius: 6,
        fontSize: '12px'
      }}>
        <strong>💡 MY TUNICLAIM Integration:</strong>
        <p style={{ margin: '4px 0 0 0' }}>
          Synchronise automatiquement les BS depuis MY TUNICLAIM vers le système ARS.
          Les bordereaux et BS individuels sont créés avec leurs items et métadonnées.
        </p>
      </div>
    </Card>
  );
};