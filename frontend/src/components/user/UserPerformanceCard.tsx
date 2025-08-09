import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { TrendingUp, Assignment, Schedule, CheckCircle } from '@mui/icons-material';
import { User } from '../../types/user.d';

interface Props {
  user: User;
}

const UserPerformanceCard: React.FC<Props> = ({ user }) => {
  const stats = user.performanceStats;
  
  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Performance</Typography>
          <Typography color="text.secondary">
            Aucune donnée de performance disponible
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getSLAColor = (compliance: number) => {
    if (compliance >= 95) return 'success';
    if (compliance >= 85) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          Performance
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" mb={1}>
            <Assignment sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">Documents traités</Typography>
          </Box>
          <Typography variant="h4" color="primary">
            {stats.processedDocuments}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center">
              <CheckCircle sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2">Conformité SLA</Typography>
            </Box>
            <Chip 
              label={`${stats.slaCompliance}%`}
              color={getSLAColor(stats.slaCompliance)}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={stats.slaCompliance} 
            color={getSLAColor(stats.slaCompliance)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box>
          <Box display="flex" alignItems="center" mb={1}>
            <Schedule sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">Temps moyen de traitement</Typography>
          </Box>
          <Typography variant="h6">
            {stats.avgProcessingTime}h
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserPerformanceCard;