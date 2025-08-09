import React, { useEffect, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { AccessTime, Warning, Error } from '@mui/icons-material';

interface SlaCountdownProps {
  createdAt: string | Date;
  slaDays: number;
  status?: string;
}

function getTimeLeft(createdAt: Date, slaDays: number) {
  const deadline = new Date(createdAt.getTime() + slaDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  const totalHours = diff / (1000 * 60 * 60);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  
  return { 
    days, 
    hours, 
    minutes, 
    totalHours,
    isOverdue: diff <= 0,
    isAtRisk: totalHours <= 24 && totalHours > 0, // Less than 24h remaining
    deadline: deadline.toLocaleString()
  };
}

export const SlaCountdown: React.FC<SlaCountdownProps> = ({ createdAt, slaDays, status }) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(createdAt), slaDays));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(createdAt), slaDays));
    }, 30000); // update every 30 seconds for more accuracy
    return () => clearInterval(interval);
  }, [createdAt, slaDays]);

  // Don't show countdown for resolved/closed claims
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return (
      <Chip 
        label="Terminé" 
        color="success" 
        size="small" 
        icon={<AccessTime />}
      />
    );
  }

  if (timeLeft.isOverdue) {
    const overdueDays = Math.abs(timeLeft.days);
    const overdueHours = Math.abs(timeLeft.hours);
    
    return (
      <Tooltip title={`Échéance dépassée le ${timeLeft.deadline}`}>
        <Chip 
          label={`En retard: ${overdueDays > 0 ? `${overdueDays}j ` : ''}${overdueHours}h`}
          color="error" 
          size="small" 
          icon={<Error />}
          sx={{ animation: 'pulse 2s infinite' }}
        />
      </Tooltip>
    );
  }

  if (timeLeft.isAtRisk) {
    return (
      <Tooltip title={`Échéance: ${timeLeft.deadline}`}>
        <Chip 
          label={`Risque: ${timeLeft.hours}h ${timeLeft.minutes}m`}
          color="warning" 
          size="small" 
          icon={<Warning />}
          sx={{ animation: 'pulse 2s infinite' }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`Échéance: ${timeLeft.deadline}`}>
      <Chip 
        label={
          timeLeft.days > 0 
            ? `${timeLeft.days}j ${timeLeft.hours}h restants`
            : `${timeLeft.hours}h ${timeLeft.minutes}m restants`
        }
        color="success" 
        size="small" 
        icon={<AccessTime />}
      />
    </Tooltip>
  );
};

export default SlaCountdown;
