import React from 'react';
import { Badge, Tag, Tooltip } from 'antd';
import { 
  DollarOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

interface PaymentStatusBadgeProps {
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
  amount?: number;
  date?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ 
  status, 
  amount, 
  date 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: 'Payé',
          badgeStatus: 'success' as const
        };
      case 'PENDING':
        return {
          color: 'processing',
          icon: <ClockCircleOutlined />,
          text: 'En attente',
          badgeStatus: 'processing' as const
        };
      case 'FAILED':
        return {
          color: 'error',
          icon: <ExclamationCircleOutlined />,
          text: 'Échec',
          badgeStatus: 'error' as const
        };
      case 'UNPAID':
      default:
        return {
          color: 'default',
          icon: <DollarOutlined />,
          text: 'Non payé',
          badgeStatus: 'default' as const
        };
    }
  };

  const config = getStatusConfig(status);
  
  const tooltipContent = (
    <div>
      <div><strong>Statut:</strong> {config.text}</div>
      {amount && <div><strong>Montant:</strong> {amount.toFixed(2)} DT</div>}
      {date && <div><strong>Date:</strong> {new Date(date).toLocaleDateString()}</div>}
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <Badge status={config.badgeStatus} />
      <Tag color={config.color} icon={config.icon}>
        {config.text}
        {amount && ` (${amount.toFixed(2)} DT)`}
      </Tag>
    </Tooltip>
  );
};