import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import { Psychology, TrendingUp, Warning } from '@mui/icons-material';

interface DelayPredictionPanelProps {
  prediction: any;
}

const DelayPredictionPanel: React.FC<DelayPredictionPanelProps> = ({ prediction }) => {
  if (!prediction) {
    return <CircularProgress />;
  }

  const getRiskLevel = (forecast: number) => {
    if (forecast > 100) return { level: 'Élevé', color: 'error' };
    if (forecast > 50) return { level: 'Moyen', color: 'warning' };
    return { level: 'Faible', color: 'success' };
  };

  const risk = getRiskLevel(prediction.nextWeekForecast || 0);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Psychology color="primary" />
          <Typography variant="h6">
            Prédiction IA
          </Typography>
        </Box>
        
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Prévision Semaine Prochaine
          </Typography>
          <Typography variant="h4" color="primary" gutterBottom>
            {Math.round(prediction.nextWeekForecast || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            bordereaux à traiter
          </Typography>
        </Box>

        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Niveau de Risque</Typography>
            <Chip
              label={risk.level}
              color={risk.color as any}
              size="small"
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (prediction.nextWeekForecast || 0) / 2)}
            color={risk.color as any}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recommandation IA
          </Typography>
          <Typography variant="body2">
            {prediction.recommendation || 'Surveillance continue recommandée'}
          </Typography>
        </Box>

        {prediction.trend_direction && (
          <Box mt={2} p={1} bgcolor="info.light" borderRadius={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUp color="info" fontSize="small" />
              <Typography variant="caption" color="info.contrastText">
                Tendance: {prediction.trend_direction}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DelayPredictionPanel;