import React from 'react';
import { Contract } from '../../types/contract.d';
import { 
  Paper, Grid, Typography, Chip, Avatar, Box, Divider, LinearProgress
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';

interface Props {
  contract: Contract;
  status: 'active' | 'expired' | 'future';
  statistics?: any;
}

const ContractProfileHeader: React.FC<Props> = ({ contract, status, statistics }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'future': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'future': return 'Futur';
      default: return 'Inconnu';
    }
  };

  const getRemainingDays = () => {
    const now = new Date();
    const end = new Date(contract.endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();
  const totalDays = Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const progressValue = status === 'active' ? Math.max(0, Math.min(100, ((totalDays - remainingDays) / totalDays) * 100)) : 0;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
      <Grid container spacing={3} alignItems="center">
        {/* Contract Icon */}
        <Grid item>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
            <DescriptionIcon sx={{ fontSize: 40 }} />
          </Avatar>
        </Grid>
        
        {/* Contract Info */}
        <Grid item xs>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Contrat #{contract.id}
          </Typography>
          
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item>
              <Box display="flex" alignItems="center" gap={1}>
                <BusinessIcon fontSize="small" />
                <Typography variant="body2">
                  Client: {contract.clientName}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon fontSize="small" />
                <Typography variant="body2">
                  Manager: {contract.assignedManagerId}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarTodayIcon fontSize="small" />
                <Typography variant="body2">
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Progress Bar for Active Contracts */}
          {status === 'active' && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Progression du contrat ({remainingDays} jours restants)
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progressValue} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: remainingDays < 30 ? '#ff9800' : '#4caf50'
                  }
                }} 
              />
            </Box>
          )}
        </Grid>
        
        {/* Status & Quick Stats */}
        <Grid item>
          <Box textAlign="right">
            <Typography variant="body2" sx={{ mb: 1 }}>Status</Typography>
            <Chip 
              label={getStatusLabel()} 
              color={getStatusColor() as any}
              sx={{ mb: 2 }}
            />
            
            {statistics && (
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>SLA Compliance</Typography>
                <Typography variant="h6">
                  {Math.round((statistics.slaCompliant / statistics.total) * 100)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
      
      {/* Contract Parameters */}
      <Grid container spacing={4}>
        <Grid item>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Règlement</Typography>
          <Typography variant="h6">{contract.delaiReglement} jours</Typography>
        </Grid>
        <Grid item>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Réclamations</Typography>
          <Typography variant="h6">{contract.delaiReclamation} jours</Typography>
        </Grid>
        {contract.escalationThreshold && (
          <Grid item>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Seuil d'Escalade</Typography>
            <Typography variant="h6">{contract.escalationThreshold} jours</Typography>
          </Grid>
        )}
        <Grid item>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Version</Typography>
          <Typography variant="h6">v{contract.version || 1}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ContractProfileHeader;