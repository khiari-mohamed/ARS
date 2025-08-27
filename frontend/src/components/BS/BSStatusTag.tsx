import React from 'react';
import { Tag } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  StopOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { BSStatus } from '../../types/bs';

interface BSStatusTagProps {
  status: BSStatus;
  showIcon?: boolean;
}

export const BSStatusTag: React.FC<BSStatusTagProps> = ({ status, showIcon = true }) => {
  const getStatusConfig = (status: BSStatus) => {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          color: 'processing',
          icon: <SyncOutlined spin />,
          text: 'En cours'
        };
      case 'EN_COURS':
        return {
          color: 'processing',
          icon: <SyncOutlined spin />,
          text: 'En cours'
        };
      case 'VALIDATED':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: 'Validé'
        };
      case 'REJECTED':
        return {
          color: 'error',
          icon: <ExclamationCircleOutlined />,
          text: 'Rejeté'
        };
      case 'CLOTURE':
        return {
          color: 'default',
          icon: <StopOutlined />,
          text: 'Clôturé'
        };
      case 'DELETED':
        return {
          color: 'default',
          icon: <StopOutlined />,
          text: 'Supprimé'
        };
      case 'EN_DIFFICULTE':
        return {
          color: 'warning',
          icon: <WarningOutlined />,
          text: 'En difficulté'
        };
      default:
        return {
          color: 'default',
          icon: <ClockCircleOutlined />,
          text: status || 'Inconnu'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Tag color={config.color} icon={showIcon ? config.icon : undefined}>
      {config.text}
    </Tag>
  );
};