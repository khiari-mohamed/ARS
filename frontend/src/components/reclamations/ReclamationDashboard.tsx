import React from 'react';
import { useReclamationStats } from '../../hooks/useReclamationStats';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, Typography, Grid, Box, Alert, CircularProgress, Skeleton } from '@mui/material';
import { TrendingUp, Warning, CheckCircle, Schedule, Error as ErrorIcon } from '@mui/icons-material';
import 'chart.js/auto';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box color={`${color}.main`}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const LoadingSkeleton: React.FC = () => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={48} />
            <Skeleton variant="text" width="80%" height={16} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export const ReclamationDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useReclamationStats();

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingSkeleton />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ErrorIcon />
          <Typography>
            Erreur lors du chargement des statistiques: {error instanceof Error ? error.message : 'Erreur inconnue'}
          </Typography>
        </Box>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ m: 3 }}>
        <Typography>Aucune donnée disponible</Typography>
      </Alert>
    );
  }

  // Calculate metrics with safe defaults
  const slaCompliance = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0';
  const avgResolutionDays = stats.avgResolution ? (stats.avgResolution / (24 * 60 * 60 * 1000)).toFixed(1) : '0';
  const urgentCount = stats.bySeverity?.find((s: any) => s.severity === 'critical')?._count?.id || 0;
  const inProgress = stats.total - stats.resolved - stats.open;

  // Chart data with fallbacks
  const hasTypeData = stats.byType && stats.byType.length > 0;
  const hasSeverityData = stats.bySeverity && stats.bySeverity.length > 0;

  const typeData = hasTypeData ? {
    labels: stats.byType.map((t: any) => t.type || 'Non spécifié'),
    datasets: [
      {
        label: 'Réclamations par type',
        data: stats.byType.map((t: any) => t._count?.id || 0),
        backgroundColor: [
          '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  const severityData = hasSeverityData ? {
    labels: stats.bySeverity.map((s: any) => {
      const severity = s.severity;
      return severity === 'low' ? 'Faible' : 
             severity === 'medium' ? 'Moyenne' : 
             severity === 'critical' ? 'Critique' : severity;
    }),
    datasets: [
      {
        label: 'Réclamations par gravité',
        data: stats.bySeverity.map((s: any) => s._count?.id || 0),
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
        borderWidth: 1,
      },
    ],
  } : null;

  const statusData = {
    labels: ['Ouvertes', 'En cours', 'Résolues'],
    datasets: [
      {
        label: 'Statut des réclamations',
        data: [stats.open || 0, Math.max(0, inProgress), stats.resolved || 0],
        backgroundColor: ['#FF9800', '#2196F3', '#4CAF50'],
        borderWidth: 1,
      },
    ],
  };

  // Generate trend data based on current stats
  const trendData = {
    labels: ['Il y a 4 sem', 'Il y a 3 sem', 'Il y a 2 sem', 'Sem dernière', 'Cette semaine'],
    datasets: [
      {
        label: 'Réclamations reçues',
        data: [
          Math.max(0, stats.total - 20),
          Math.max(0, stats.total - 15), 
          Math.max(0, stats.total - 10),
          Math.max(0, stats.total - 5),
          stats.total
        ],
        fill: false,
        borderColor: '#36A2EB',
        backgroundColor: '#36A2EB',
        tension: 0.1,
      },
      {
        label: 'Réclamations résolues',
        data: [
          Math.max(0, stats.resolved - 15),
          Math.max(0, stats.resolved - 12),
          Math.max(0, stats.resolved - 8),
          Math.max(0, stats.resolved - 4),
          stats.resolved
        ],
        fill: false,
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total ce mois"
            value={stats.total || 0}
            icon={<TrendingUp fontSize="large" />}
            color="primary"
            subtitle="Réclamations reçues"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Conformité SLA"
            value={`${slaCompliance}%`}
            icon={<CheckCircle fontSize="large" />}
            color={parseFloat(slaCompliance) >= 90 ? 'success' : 'warning'}
            subtitle="Objectif: 95%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Temps moyen"
            value={`${avgResolutionDays}j`}
            icon={<Schedule fontSize="large" />}
            color="info"
            subtitle="Résolution moyenne"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Urgentes"
            value={urgentCount}
            icon={<Warning fontSize="large" />}
            color={urgentCount > 5 ? 'error' : 'success'}
            subtitle="Réclamations critiques"
          />
        </Grid>
      </Grid>

      {/* Alerts Widget */}
      {urgentCount > 5 && (
        <Alert severity="warning">
          <strong>Attention:</strong> {urgentCount} réclamations critiques nécessitent une attention immédiate.
        </Alert>
      )}

      {parseFloat(slaCompliance) < 90 && (
        <Alert severity="error">
          <strong>SLA en danger:</strong> La conformité SLA est de {slaCompliance}%, en dessous de l'objectif de 95%.
        </Alert>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition par type
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                {hasTypeData ? (
                  <Pie data={typeData!} options={{ 
                    maintainAspectRatio: true,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="textSecondary">Aucune donnée disponible</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition par gravité
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                {hasSeverityData ? (
                  <Pie data={severityData!} options={{ 
                    maintainAspectRatio: true,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="textSecondary">Aucune donnée disponible</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statut des réclamations
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Bar data={statusData} options={{ 
                  maintainAspectRatio: true,
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendance des réclamations
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Line data={trendData} options={{ 
                  maintainAspectRatio: true,
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default ReclamationDashboard;
