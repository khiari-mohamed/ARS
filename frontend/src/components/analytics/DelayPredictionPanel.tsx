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
  Stack,
  Paper,
  Grid
} from '@mui/material';
import { Psychology, TrendingUp, TrendingDown, CheckCircle, Warning, Info, CalendarToday, Speed, Assessment } from '@mui/icons-material';

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
    if (forecast > 150) return { level: 'Critique', color: 'error', icon: <Warning />, description: 'Surcharge importante prévue' };
    if (forecast > 100) return { level: 'Élevé', color: 'error', icon: <Warning />, description: 'Charge élevée attendue' };
    if (forecast > 50) return { level: 'Moyen', color: 'warning', icon: <Info />, description: 'Charge modérée prévue' };
    return { level: 'Faible', color: 'success', icon: <CheckCircle />, description: 'Charge normale' };
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
  
  // DEBUG: Log AI response
  console.log('🤖 AI Prediction Response:', {
    nextWeekPrediction,
    aiConfidence,
    trendDirection,
    insightsCount: insights.length,
    insights: insights,
    fullPrediction: prediction
  });
  
  const risk = getRiskLevel(nextWeekPrediction);

  return (
    <Card elevation={3}>
      <CardContent>
        <Box mb={2} p={2} bgcolor="primary.main" borderRadius={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box>
              <Typography variant="caption" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                🔮 PRÉVISION SEMAINE PROCHAINE
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary.contrastText">
                {Math.round(nextWeekPrediction)} bordereaux
              </Typography>
              <Typography variant="caption" color="primary.contrastText" sx={{ opacity: 0.8 }}>
                attendus du {new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} au {new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Typography>
            </Box>
            <Chip 
              label={`${Math.round(aiConfidence * 100)}% fiable`}
              color="default"
              size="small"
              sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}
            />
          </Box>
        </Box>

        {/* Priority Actions Only */}
        {insights.filter(i => i.priority === 'high' || i.priority === 'medium').length > 0 && (
          <Stack spacing={2} mb={3}>
            {insights.filter(i => i.priority === 'high' || i.priority === 'medium').map((insight: any, index: number) => (
              <Paper 
                key={index}
                elevation={3}
                sx={{ 
                  p: 2.5, 
                  bgcolor: insight.priority === 'high' ? 'error.light' : 'warning.light',
                  borderLeft: 6,
                  borderColor: insight.priority === 'high' ? 'error.main' : 'warning.main'
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>
                    {insight.icon || (insight.priority === 'high' ? '🚨' : '⚠️')}
                  </Typography>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
                      {insight.message}
                    </Typography>
                    <Box 
                      sx={{ 
                        mt: 1.5, 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 1,
                        borderLeft: 4,
                        borderColor: insight.priority === 'high' ? 'error.main' : 'warning.main'
                      }}
                    >
                      <Typography variant="body1" fontWeight="600" 
                        color={insight.priority === 'high' ? 'error.dark' : 'warning.dark'}>
                        ✓ {insight.action}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Additional Info - Collapsible */}
        {insights.filter(i => i.priority === 'low').length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="bold">
              📊 Informations Complémentaires
            </Typography>
            <Stack spacing={1}>
              {insights.filter(i => i.priority === 'low').map((insight: any, index: number) => (
                <Box 
                  key={index}
                  sx={{ 
                    p: 1.5, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor: 'info.main'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {insight.icon} {insight.message}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DelayPredictionPanel;