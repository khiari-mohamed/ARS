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
  prediction?: {
    next_week_prediction?: number;
    ai_confidence?: number;
    trend_direction?: string;
    recommendations?: any[];
    forecast?: any[];
  } | null;
}

const DelayPredictionPanel: React.FC<DelayPredictionPanelProps> = ({ prediction }) => {
  if (!prediction) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const getRiskLevel = (forecast: number) => {
    if (forecast > 100) return { level: 'Élevé', color: 'error' };
    if (forecast > 50) return { level: 'Moyen', color: 'warning' };
    return { level: 'Faible', color: 'success' };
  };

  // Handle real API data structure from /api/alerts/delay-predictions
  const nextWeekPrediction = prediction.next_week_prediction || 0;
  const aiConfidence = prediction.ai_confidence || 0;
  const trendDirection = prediction.trend_direction || 'stable';
  const recommendations = prediction.recommendations || [];
  const forecast = prediction.forecast || [];
  
  const risk = getRiskLevel(nextWeekPrediction);

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
            {Math.round(nextWeekPrediction)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            bordereaux à traiter
          </Typography>
          {aiConfidence > 0 && (
            <Box mt={1}>
              <Typography variant="caption" color="text.secondary">
                Confiance IA: {Math.round(aiConfidence * 100)}%
              </Typography>
            </Box>
          )}
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
            value={Math.min(100, nextWeekPrediction / 2)}
            color={risk.color as any}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recommandations IA
          </Typography>
          {recommendations.length > 0 ? (
            recommendations.slice(0, 2).map((rec: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                • {rec.action || rec.reasoning || rec.description || rec}
              </Typography>
            ))
          ) : (
            <Typography variant="body2">
              Surveillance continue recommandée
            </Typography>
          )}
        </Box>

        {trendDirection && trendDirection !== 'stable' && (
          <Box mt={2} p={1} bgcolor="info.light" borderRadius={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUp color="info" fontSize="small" />
              <Typography variant="caption" color="info.contrastText">
                Tendance: {trendDirection === 'increasing' ? 'Croissante' : 
                          trendDirection === 'decreasing' ? 'Décroissante' : trendDirection}
              </Typography>
            </Box>
          </Box>
        )}
        
        {forecast.length > 0 && (
          <Box mt={2} p={1} bgcolor="success.light" borderRadius={1}>
            <Typography variant="caption" color="success.contrastText">
              Prévisions disponibles pour {forecast.length} jours
            </Typography>
          </Box>
        )}
        
        {trendDirection === 'stable' && (
          <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              Tendance stable - Aucune variation significative prévue
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DelayPredictionPanel;