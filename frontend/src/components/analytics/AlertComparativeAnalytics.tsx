import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip
} from '@mui/material';
import { TrendingUp, TrendingDown, CheckCircle } from '@mui/icons-material';

interface AlertComparativeAnalyticsProps {
  payload: any;
}

const AlertComparativeAnalytics: React.FC<AlertComparativeAnalyticsProps> = ({ payload }) => {
  if (!payload) return null;

  const performanceRate = payload.planned > 0 ? Math.round((payload.actual / payload.planned) * 100) : 0;
  const isOnTrack = performanceRate >= 80;
  
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
          📊 Performance Hebdomadaire
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
              <Typography variant="caption" color="primary.contrastText" fontWeight="bold">OBJECTIF</Typography>
              <Typography variant="h3" fontWeight="bold" color="primary.contrastText">
                {payload.planned}
              </Typography>
              <Typography variant="caption" color="primary.contrastText">bordereaux</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor={payload.actual > 0 ? (isOnTrack ? 'success.light' : 'warning.light') : 'grey.100'} borderRadius={2}>
              <Typography variant="caption" fontWeight="bold">RÉALISÉ</Typography>
              <Typography variant="h3" fontWeight="bold">
                {payload.actual}
              </Typography>
              <Typography variant="caption">bordereaux</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
              <Typography variant="caption" fontWeight="bold">PERFORMANCE</Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Typography variant="h3" fontWeight="bold">
                  {performanceRate}%
                </Typography>
                {isOnTrack && payload.actual > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {payload.actual === 0 && (
          <Box mt={2} p={1.5} bgcolor="info.light" borderRadius={1}>
            <Typography variant="body2" color="info.dark">
              📅 Début de semaine - Les données se mettront à jour automatiquement
            </Typography>
          </Box>
        )}
        
        {isOnTrack && payload.actual > 0 && (
          <Box mt={2} p={1.5} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body2" color="success.dark" fontWeight="bold">
              ✅ Excellent! Vous êtes sur la bonne voie ({payload.actual}/{payload.planned})
            </Typography>
          </Box>
        )}
        
        {!isOnTrack && payload.actual > 0 && (
          <Box mt={2} p={1.5} bgcolor="warning.light" borderRadius={1}>
            <Typography variant="body2" color="warning.dark" fontWeight="bold">
              ⚠️ Attention: {payload.planned - payload.actual} bordereaux restants pour atteindre l'objectif
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertComparativeAnalytics;