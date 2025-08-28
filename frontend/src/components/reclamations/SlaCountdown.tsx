import React, { useState, useEffect } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Warning, Schedule, CheckCircle, Error } from '@mui/icons-material';

interface SlaCountdownProps {
  createdAt: string | Date;
  slaDays: number;
  status: string;
  clientName?: string;
}

interface SLAStatus {
  status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
  remainingTime: number; // in hours
  percentageUsed: number;
  color: 'success' | 'info' | 'warning' | 'error';
  icon: React.ReactElement;
  label: string;
}

const SlaCountdown: React.FC<SlaCountdownProps> = ({ 
  createdAt, 
  slaDays, 
  status, 
  clientName 
}) => {
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(null);

  useEffect(() => {
    const calculateSLA = () => {
      if (status === 'RESOLVED' || status === 'CLOSED') {
        setSlaStatus({
          status: 'ON_TIME',
          remainingTime: 0,
          percentageUsed: 100,
          color: 'success',
          icon: <CheckCircle />,
          label: 'Résolu'
        });
        return;
      }

      const now = new Date();
      const created = new Date(createdAt);
      const deadline = new Date(created.getTime() + slaDays * 24 * 60 * 60 * 1000);
      
      const totalTime = deadline.getTime() - created.getTime();
      const elapsedTime = now.getTime() - created.getTime();
      const remainingTime = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      const percentageUsed = Math.min(100, (elapsedTime / totalTime) * 100);
      
      let slaData: SLAStatus;

      if (remainingTime <= 0) {
        slaData = {
          status: 'OVERDUE',
          remainingTime: 0,
          percentageUsed: 100,
          color: 'error',
          icon: <Error />,
          label: 'En retard'
        };
      } else if (percentageUsed >= 90) {
        slaData = {
          status: 'CRITICAL',
          remainingTime,
          percentageUsed,
          color: 'error',
          icon: <Warning />,
          label: `${remainingTime}h`
        };
      } else if (percentageUsed >= 70) {
        slaData = {
          status: 'AT_RISK',
          remainingTime,
          percentageUsed,
          color: 'warning',
          icon: <Warning />,
          label: `${remainingTime}h`
        };
      } else {
        slaData = {
          status: 'ON_TIME',
          remainingTime,
          percentageUsed,
          color: 'success',
          icon: <Schedule />,
          label: `${remainingTime}h`
        };
      }

      setSlaStatus(slaData);
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [createdAt, slaDays, status]);

  if (!slaStatus) return null;

  const getTooltipContent = () => {
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + slaDays * 24 * 60 * 60 * 1000);
    
    return (
      <div>
        <div><strong>Client:</strong> {clientName || 'N/A'}</div>
        <div><strong>SLA:</strong> {slaDays} jours</div>
        <div><strong>Créé le:</strong> {created.toLocaleString('fr-FR')}</div>
        <div><strong>Échéance:</strong> {deadline.toLocaleString('fr-FR')}</div>
        <div><strong>Temps utilisé:</strong> {slaStatus.percentageUsed.toFixed(1)}%</div>
        <div><strong>Statut:</strong> {slaStatus.status}</div>
      </div>
    );
  };

  return (
    <Tooltip title={getTooltipContent()} arrow>
      <Chip
        icon={slaStatus.icon}
        label={slaStatus.label}
        color={slaStatus.color}
        size="small"
        variant={slaStatus.status === 'OVERDUE' ? 'filled' : 'outlined'}
      />
    </Tooltip>
  );
};

export default SlaCountdown;