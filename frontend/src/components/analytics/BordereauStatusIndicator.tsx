import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { Circle, Warning, Error, CheckCircle } from '@mui/icons-material';

interface BordereauStatusIndicatorProps {
  bordereau: {
    id: string;
    dateReception: string;
    delaiReglement: number;
    statut: string;
    reference?: string;
  };
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

const BordereauStatusIndicator: React.FC<BordereauStatusIndicatorProps> = ({ 
  bordereau, 
  showLabel = true, 
  size = 'small' 
}) => {
  const calculateSlaStatus = () => {
    const now = new Date();
    const receptionDate = new Date(bordereau.dateReception);
    const daysSinceReception = Math.floor((now.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    const slaLimit = bordereau.delaiReglement || 5;
    const remainingDays = slaLimit - daysSinceReception;

    // If already completed
    if (['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(bordereau.statut)) {
      return {
        status: 'completed',
        color: 'success' as const,
        icon: '🟢',
        label: 'Terminé',
        tooltip: `Bordereau traité en ${daysSinceReception} jour(s)`
      };
    }

    // If blocked/rejected
    if (['EN_DIFFICULTE', 'REJETE', 'MIS_EN_INSTANCE'].includes(bordereau.statut)) {
      return {
        status: 'blocked',
        color: 'error' as const,
        icon: '🔴',
        label: 'Bloqué',
        tooltip: `Bordereau bloqué - ${bordereau.statut}`
      };
    }

    // SLA breach
    if (remainingDays < 0) {
      return {
        status: 'breach',
        color: 'error' as const,
        icon: '🔴',
        label: `Retard ${Math.abs(remainingDays)}j`,
        tooltip: `SLA dépassé de ${Math.abs(remainingDays)} jour(s)`
      };
    }

    // At risk (within 2 days of deadline)
    if (remainingDays <= 2) {
      return {
        status: 'risk',
        color: 'warning' as const,
        icon: '🟠',
        label: `Risque ${remainingDays}j`,
        tooltip: `Attention: ${remainingDays} jour(s) restant(s)`
      };
    }

    // On time
    return {
      status: 'ontime',
      color: 'success' as const,
      icon: '🟢',
      label: `OK ${remainingDays}j`,
      tooltip: `Dans les délais: ${remainingDays} jour(s) restant(s)`
    };
  };

  const statusInfo = calculateSlaStatus();

  const getStatusIcon = () => {
    switch (statusInfo.status) {
      case 'completed': return <CheckCircle />;
      case 'blocked': return <Error />;
      case 'breach': return <Error />;
      case 'risk': return <Warning />;
      case 'ontime': return <Circle />;
      default: return <Circle />;
    }
  };

  if (showLabel) {
    return (
      <Tooltip title={statusInfo.tooltip} arrow>
        <Chip
          icon={getStatusIcon()}
          label={statusInfo.label}
          color={statusInfo.color}
          size={size}
          variant="filled"
          sx={{
            fontWeight: 'bold',
            '& .MuiChip-icon': {
              fontSize: size === 'small' ? '16px' : '20px'
            }
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`${bordereau.reference}: ${statusInfo.tooltip}`} arrow>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: size === 'small' ? '16px' : '20px',
          cursor: 'help'
        }}
      >
        {statusInfo.icon}
      </Box>
    </Tooltip>
  );
};

export default BordereauStatusIndicator;