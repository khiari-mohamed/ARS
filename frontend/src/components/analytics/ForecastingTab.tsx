import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Card, CardContent, Box, Alert } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface Props {
  filters: any;
  dateRange: any;
}

const ForecastingTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      forecast: {
        nextWeek: 287,
        nextMonth: 1150,
        recommendedStaff: 12,
        currentStaff: 10
      },
      plannedVsActual: [
        { period: 'Sem 1', planned: 250, actual: 245 },
        { period: 'Sem 2', planned: 280, actual: 267 },
        { period: 'Sem 3', planned: 300, actual: 298 },
        { period: 'Sem 4', planned: 320, actual: 287 }
      ],
      aiRecommendations: [
        'Augmenter l\'équipe de 2 gestionnaires pour la semaine prochaine',
        'Redistribuer 15% de la charge de l\'équipe B vers l\'équipe C',
        'Prévoir une formation supplémentaire pour réduire les erreurs'
      ]
    });
  }, [filters, dateRange]);

  if (!data) return <Typography>Chargement...</Typography>;

  const staffingGap = data.forecast.recommendedStaff - data.forecast.currentStaff;

  return (
    <Grid container spacing={3}>
      {/* Forecast Cards */}
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
              <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Prévision Semaine</Typography>
            </Box>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 600 }}>
              {data.forecast.nextWeek}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              dossiers attendus
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
              <AutoAwesomeIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Prévision Mois</Typography>
            </Box>
            <Typography variant="h3" color="warning.main" sx={{ fontWeight: 600 }}>
              {data.forecast.nextMonth}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              dossiers attendus
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
              <PeopleIcon color={staffingGap > 0 ? 'error' : 'success'} sx={{ mr: 1 }} />
              <Typography variant="h6">Personnel Requis</Typography>
            </Box>
            <Typography variant="h3" color={staffingGap > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>
              {data.forecast.recommendedStaff}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              gestionnaires ({staffingGap > 0 ? `+${staffingGap}` : staffingGap} vs actuel)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Planned vs Actual Chart */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Planifié vs Réalisé</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.plannedVsActual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="planned" 
                stroke="#1976d2" 
                strokeWidth={3}
                name="Planifié"
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#4caf50" 
                strokeWidth={3}
                name="Réalisé"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* AI Recommendations */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recommandations IA</Typography>
          {data.aiRecommendations.map((recommendation: string, index: number) => (
            <Alert 
              key={index} 
              severity="info" 
              sx={{ mb: 1 }}
              icon={<AutoAwesomeIcon />}
            >
              {recommendation}
            </Alert>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ForecastingTab;