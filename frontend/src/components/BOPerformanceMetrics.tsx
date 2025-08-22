import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip
} from '@mui/material';
import { getBOPerformance } from '../services/boService';

interface Props {
  userId?: string;
  period?: string;
}

const BOPerformanceMetrics: React.FC<Props> = ({ userId, period = 'daily' }) => {
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [userId, period]);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const data = await getBOPerformance(userId, period);
      setPerformance(data);
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!performance) {
    return (
      <Typography color="text.secondary">
        Aucune donnée de performance disponible
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Entrées Totales
            </Typography>
            <Typography variant="h6">
              {performance.totalEntries || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Temps Moyen
            </Typography>
            <Typography variant="h6">
              {performance.avgProcessingTime || 0}ms
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Taux d'Erreur
            </Typography>
            <Typography variant="h6">
              {performance.errorRate || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Vitesse
            </Typography>
            <Typography variant="h6">
              {performance.entrySpeed?.toFixed(1) || '0.0'}/h
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Période:
          </Typography>
          <Chip label={performance.period || period} size="small" />
        </Box>
      </Grid>
    </Grid>
  );
};

export default BOPerformanceMetrics;