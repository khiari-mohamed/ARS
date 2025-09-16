import React from 'react';
import { useRecommendations, useEnhancedRecommendations } from '../../hooks/useAnalytics';
import LoadingSpinner from '../LoadingSpinner';
import { Box, Grid, Typography } from '@mui/material';
import TrainingNeedsPanel from './TrainingNeedsPanel';
import RootCauseAnalysisPanel from './RootCauseAnalysisPanel';

const RecommendationsPanel: React.FC = () => {
  // Try enhanced first, fallback to base if not available
  const { data: enhanced, isLoading: loadingEnhanced, error: errorEnhanced } = useEnhancedRecommendations();
  const { data, isLoading, error } = useRecommendations();

  if (loadingEnhanced || isLoading) return <LoadingSpinner />;
  if (errorEnhanced && error) return <div className="text-red-600">Erreur chargement recommandations</div>;

  const rec = enhanced || data;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Recommandations IA Avancées
      </Typography>
      
      <Grid container spacing={3}>
        {/* Basic Recommendations */}
        <Grid item xs={12} md={6}>
          <Box p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="h6" gutterBottom>Recommandations Générales</Typography>
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600}>Prévision semaine prochaine:</Typography>
              <Typography variant="body2">{rec?.forecast?.nextWeekForecast ?? '-'}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600}>Effectif recommandé:</Typography>
              <Typography variant="body2">{rec?.neededStaff ?? '-'}</Typography>
            </Box>
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600}>Conseil:</Typography>
              <Typography variant="body2">{rec?.recommendation ?? '-'}</Typography>
            </Box>
            {rec?.tips && (
              <Box>
                <Typography variant="body2" fontWeight={600}>Tips IA:</Typography>
                <ul style={{ marginLeft: '1.5rem' }}>
                  {rec.tips.map((tip: string, i: number) => (
                    <li key={i}><Typography variant="body2">{tip}</Typography></li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        </Grid>
        
        {/* Root Cause Analysis */}
        <Grid item xs={12} md={6}>
          <RootCauseAnalysisPanel />
        </Grid>
        
        {/* Training Needs */}
        <Grid item xs={12}>
          <TrainingNeedsPanel />
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecommendationsPanel;
