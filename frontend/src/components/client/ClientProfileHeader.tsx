import React from 'react';
import { Client } from '../../types/client.d';
import { Paper, Grid, Typography, Chip, Avatar, Box, Divider } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { getSLAColor } from '../../utils/slaColor';

interface Props {
  client: Client;
  avgSLA?: number | null;
}

const ClientProfileHeader: React.FC<Props> = ({ client, avgSLA }) => {
  const slaColor = avgSLA ? getSLAColor(avgSLA, client.reglementDelay || 30) : 'green';
  
  const getStatusBadge = () => {
    const isActive = true; // You can add active/inactive logic
    return (
      <Chip 
        label={isActive ? 'Active' : 'Inactive'} 
        color={isActive ? 'success' : 'default'}
        size="small"
      />
    );
  };

  const getSLABadge = () => {
    const color = slaColor === 'green' ? 'success' : slaColor === 'orange' ? 'warning' : 'error';
    const label = slaColor === 'green' ? 'On-time' : slaColor === 'orange' ? 'Risk of delay' : 'Overdue';
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <Grid container spacing={3} alignItems="center">
        {/* Client Logo/Avatar */}
        <Grid item>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
            <BusinessIcon sx={{ fontSize: 40 }} />
          </Avatar>
        </Grid>
        
        {/* Client Info */}
        <Grid item xs>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            {client.name}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon fontSize="small" />
                <Typography variant="body2">
                  Chargé de Compte: {client.gestionnaires?.[0]?.fullName || client.accountManager?.fullName || 'Non assigné'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarTodayIcon fontSize="small" />
                <Typography variant="body2">
                  Créé le: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Status & SLA */}
        <Grid item>
          <Box textAlign="right">
            <Typography variant="body2" sx={{ mb: 1 }}>Status</Typography>
            {getStatusBadge()}
            
            <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>SLA Status</Typography>
            {getSLABadge()}
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
      
      {/* Contract SLA Parameters */}
      <Grid container spacing={4}>
        <Grid item>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai de Règlement</Typography>
          <Typography variant="h6">{client.reglementDelay} jours</Typography>
        </Grid>
        <Grid item>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Réclamations</Typography>
          <Typography variant="h6">{client.reclamationDelay} jours</Typography>
        </Grid>
        {avgSLA && (
          <Grid item>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>SLA Moyen Actuel</Typography>
            <Typography variant="h6">{avgSLA.toFixed(1)} jours</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default ClientProfileHeader;