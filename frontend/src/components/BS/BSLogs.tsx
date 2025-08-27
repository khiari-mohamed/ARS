import React from 'react';
import { Card, Timeline, Tag, Spin, Alert } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useBSLogs } from '../../hooks/useBS';
import { BsLog } from '../../types/bs';

interface BSLogsProps {
  bsId: number | string;
}

export const BSLogs: React.FC<BSLogsProps> = ({ bsId }) => {
  const { data: logs, isLoading, error } = useBSLogs(bsId) as {
    data: BsLog[] | undefined;
    isLoading: boolean;
    error: any;
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'créé':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'assigned':
      case 'assigné':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'validated':
      case 'validé':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'rejected':
      case 'rejeté':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'updated':
      case 'mis à jour':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'créé':
        return 'green';
      case 'assigned':
      case 'assigné':
        return 'blue';
      case 'validated':
      case 'validé':
        return 'green';
      case 'rejected':
      case 'rejeté':
        return 'red';
      case 'updated':
      case 'mis à jour':
        return 'orange';
      default:
        return 'default';
    }
  };

  if (error) {
    return (
      <Card title="Historique des actions" style={{ marginTop: 24 }}>
        <Alert
          type="error"
          message="Erreur lors du chargement de l'historique"
          description="Impossible de récupérer les logs de ce BS."
        />
      </Card>
    );
  }

  return (
    <Card title="Historique des actions" style={{ marginTop: 24 }}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
          <p style={{ marginTop: 8 }}>Chargement de l'historique...</p>
        </div>
      ) : (
        <Timeline
          items={logs?.map((log) => ({
            dot: getActionIcon(log.action),
            children: (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Tag color={getActionColor(log.action)}>
                    {log.action}
                  </Tag>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Par utilisateur #{log.userId}
                </div>
              </div>
            ),
          })) || []}
        />
      )}
      
      {logs && logs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
          Aucune action enregistrée pour ce BS.
        </div>
      )}
    </Card>
  );
};