import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Divider,
  Stack
} from '@mui/material';
import { Psychology, TrendingUp, TrendingDown, CheckCircle, Warning, Info } from '@mui/icons-material';

interface DelayPredictionPanelProps {
  prediction?: {
    next_week_prediction?: number;
    ai_confidence?: number;
    trend_direction?: string;
    recommendations?: any[];
    forecast?: any[];
    insights?: any[];
    data_points_analyzed?: number;
    forecast_reliability?: {
      level: string;
      score: number;
      reason: string;
    };
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
    if (forecast > 100) return { level: 'Élevé', color: 'error', icon: <Warning /> };
    if (forecast > 50) return { level: 'Moyen', color: 'warning', icon: <Info /> };
    return { level: 'Faible', color: 'success', icon: <CheckCircle /> };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp color="error" />;
    if (trend === 'decreasing') return <TrendingDown color="success" />;
    return <TrendingUp color="action" />;
  };

  const getInsightIcon = (type: string) => {
    switch(type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return '📊';
      default: return '💡';
    }
  };

  // Handle real API data structure from /api/alerts/delay-predictions
  const nextWeekPrediction = prediction.next_week_prediction || 0;
  const aiConfidence = prediction.ai_confidence || 0;
  const trendDirection = prediction.trend_direction || 'stable';
  const recommendations = prediction.recommendations || [];
  const forecast = prediction.forecast || [];
  const insights = prediction.insights || [];
  const dataPoints = prediction.data_points_analyzed || 0;
  const reliability = prediction.forecast_reliability;
  
  const risk = getRiskLevel(nextWeekPrediction);

  return (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Psychology color="primary" fontSize="large" />
          <Box>
            <Typography variant="h6">Prédiction IA</Typography>
            <Typography variant="caption" color="text.secondary">
              Analyse de {dataPoints} points de données
            </Typography>
          </Box>
        </Box>
        
        <Box mb={2} p={2} bgcolor="primary.light" borderRadius={2}>
          <Typography variant="body2" color="primary.contrastText" gutterBottom>
            Prévision Semaine Prochaine
          </Typography>
          <Box display="flex" alignItems="baseline" gap={1}>
            <Typography variant="h3" color="primary.contrastText" fontWeight="bold">
              {Math.round(nextWeekPrediction)}
            </Typography>
            <Typography variant="body1" color="primary.contrastText">
              bordereaux
            </Typography>
          </Box>
          <Box mt={1} display="flex" alignItems="center" gap={1}>
            <LinearProgress 
              variant="determinate" 
              value={Math.round(aiConfidence * 100)} 
              sx={{ 
                flex: 1, 
                height: 8, 
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: aiConfidence > 0.7 ? 'success.main' : aiConfidence > 0.5 ? 'warning.main' : 'error.main'
                }
              }} 
            />
            <Typography variant="caption" color="primary.contrastText" fontWeight="bold">
              {Math.round(aiConfidence * 100)}% confiance
            </Typography>
          </Box>
          {dataPoints < 14 && (
            <Typography variant="caption" color="primary.contrastText" sx={{ mt: 0.5, display: 'block', opacity: 0.9 }}>
              📈 La précision s'améliorera avec plus de données ({dataPoints}/30 jours)
            </Typography>
          )}
        </Box>

        <Stack spacing={1} mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              {risk.icon}
              <Typography variant="body2">Niveau de Risque</Typography>
            </Box>
            <Chip
              label={risk.level}
              color={risk.color as any}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon(trendDirection)}
              <Typography variant="body2">Tendance</Typography>
            </Box>
            <Chip
              label={trendDirection === 'increasing' ? 'Croissante' : 
                     trendDirection === 'decreasing' ? 'Décroissante' : 'Stable'}
              color={trendDirection === 'increasing' ? 'error' : 
                     trendDirection === 'decreasing' ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          </Box>

          {reliability && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Fiabilité</Typography>
              <Chip
                label={reliability.level === 'high' ? 'Élevée' : 
                       reliability.level === 'medium' ? 'Moyenne' : 'Faible'}
                color={reliability.level === 'high' ? 'success' : 
                       reliability.level === 'medium' ? 'warning' : 'error'}
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Stack>

        {insights.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              💡 Insights IA
            </Typography>
            <Stack spacing={1}>
              {insights.map((insight: any, index: number) => (
                <Alert 
                  key={index} 
                  severity={insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'success' : 'info'}
                  icon={<span>{getInsightIcon(insight.type)}</span>}
                  sx={{ py: 0.5 }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    {insight.message}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    → {insight.action}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          </>
        )}

        {recommendations.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              🎯 Recommandations
            </Typography>
            <Stack spacing={0.5}>
              {recommendations.slice(0, 3).map((rec: any, index: number) => (
                <Typography key={index} variant="caption" sx={{ pl: 2 }}>
                  • {rec.action || rec.reasoning || rec.description || rec}
                </Typography>
              ))}
            </Stack>
          </>
        )}
        
        {forecast.length > 0 && (
          <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              📅 Prévisions détaillées disponibles pour {forecast.length} jours
            </Typography>
          </Box>
        )}
        
        {dataPoints < 14 && reliability?.level === 'low' && (
          <Alert severity="info" sx={{ mt: 2 }} icon="💡">
            <Typography variant="caption" fontWeight="bold">
              Amélioration en cours
            </Typography>
            <Typography variant="caption" display="block">
              Le système collecte des données quotidiennement. La précision augmentera automatiquement avec le temps.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DelayPredictionPanel;