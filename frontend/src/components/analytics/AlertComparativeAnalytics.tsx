import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  CircularProgress
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface AlertComparativeAnalyticsProps {
  payload: any;
}

const AlertComparativeAnalytics: React.FC<AlertComparativeAnalyticsProps> = ({ payload }) => {
  if (!payload) {
    return <CircularProgress />;
  }

  const getTrendIcon = (gap: number) => {
    if (gap > 0) return <TrendingUp color="success" />;
    if (gap < 0) return <TrendingDown color="error" />;
    return <TrendingFlat color="info" />;
  };

  const getTrendColor = (gap: number) => {
    if (gap > 0) return 'success';
    if (gap < 0) return 'error';
    return 'info';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Analyse Comparative
        </Typography>
        
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Planifié</Typography>
            <Typography variant="h6">{payload.planned}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Réalisé</Typography>
            <Typography variant="h6">{payload.actual}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2">Écart</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon(payload.gap)}
              <Chip
                label={`${payload.gap > 0 ? '+' : ''}${payload.gap}`}
                color={getTrendColor(payload.gap) as any}
                size="small"
              />
            </Box>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (payload.actual / payload.planned) * 100)}
            color={payload.actual >= payload.planned ? 'success' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Performance: {Math.round((payload.actual / payload.planned) * 100)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AlertComparativeAnalytics;