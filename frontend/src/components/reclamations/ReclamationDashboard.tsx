import React from 'react';
import { useReclamationStats } from '../../hooks/useReclamationStats';
import { useReclamationTrend } from '../../hooks/useReclamationTrend';
import { useReclamationAlerts } from '../../hooks/useReclamationAlerts';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, Typography, Grid, Box, Alert, CircularProgress, Skeleton } from '@mui/material';
import { TrendingUp, Warning, CheckCircle, Schedule, Error as ErrorIcon, AccessTime } from '@mui/icons-material';
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
  const { data: trendData, isLoading: trendLoading } = useReclamationTrend();
  const { data: slaBreaches } = useReclamationAlerts();

  // Always call hooks first
  const chartTrendData = React.useMemo(() => {
    console.log('Trend data in useMemo:', trendData); // Debug log
    
    if (!trendData || trendData.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [
          {
            label: 'Réclamations reçues',
            data: [0],
            fill: false,
            borderColor: '#36A2EB',
            backgroundColor: '#36A2EB',
            tension: 0.1,
          },
        ],
      };
    }

    const sortedData = [...trendData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const labels = sortedData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    });

    const counts = sortedData.map(d => d.count);

    console.log('Processed trend data:', { labels, counts }); // Debug log

    return {
      labels,
      datasets: [
        {
          label: 'Réclamations reçues',
          data: counts,
          fill: false,
          borderColor: '#36A2EB',
          backgroundColor: '#36A2EB',
          tension: 0.1,
        },
      ],
    };
  }, [trendData]);

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
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography>Aucune donnée de réclamation disponible pour le moment.</Typography>
        </Alert>
      </Box>
    );
  }

  // Calculate metrics from real data
  const slaCompliance = stats ? (stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0') : '0';
  const avgResolutionDays = stats?.avgResolution ? (stats.avgResolution / (24 * 60 * 60 * 1000)).toFixed(1) : '0';
  const urgentCount = stats?.bySeverity?.find((s: any) => s.severity === 'critical')?._count?.id || 0;
  const inProgress = stats ? Math.max(0, stats.total - stats.resolved - stats.open) : 0;

  // Chart data with fallbacks
  const hasTypeData = stats?.byType && stats.byType.length > 0;
  const hasSeverityData = stats?.bySeverity && stats.bySeverity.length > 0;

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
      const severity = s.severity?.toLowerCase();
      if (severity === 'low' || severity === 'faible' || severity === 'basse') return 'Faible';
      if (severity === 'medium' || severity === 'moyenne' || severity === 'moyen') return 'Moyenne';
      if (severity === 'high' || severity === 'haute' || severity === 'critical' || severity === 'critique') return 'Critique';
      return s.severity || 'Non spécifié';
    }),
    datasets: [
      {
        label: 'Réclamations par gravité',
        data: stats.bySeverity.map((s: any) => s._count?.id || 0),
        backgroundColor: [
          '#4CAF50', // Faible - Vert
          '#FF9800', // Moyenne - Orange
          '#F44336', // Critique - Rouge
          '#9E9E9E'  // Non spécifié - Gris
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  const statusData = {
    labels: ['Ouvertes', 'En cours', 'Résolues'],
    datasets: [
      {
        label: 'Statut des réclamations',
        data: [stats?.open || 0, Math.max(0, inProgress), stats?.resolved || 0],
        backgroundColor: ['#FF9800', '#2196F3', '#4CAF50'],
        borderWidth: 1,
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
            color={parseFloat(slaCompliance) >= 95 ? 'success' : parseFloat(slaCompliance) >= 80 ? 'warning' : 'error'}
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
            color={urgentCount > 5 ? 'error' : urgentCount > 0 ? 'warning' : 'success'}
            subtitle="Réclamations critiques"
          />
        </Grid>
      </Grid>

      {/* Dynamic Alerts Widget */}
      {slaBreaches && slaBreaches.length > 0 && (
        <Alert severity="error" icon={<AccessTime />}>
          <strong>SLA dépassé:</strong> {slaBreaches.length} réclamation{slaBreaches.length > 1 ? 's ont' : ' a'} dépassé leur délai de traitement.
        </Alert>
      )}
      
      {urgentCount > 0 && (
        <Alert severity={urgentCount > 5 ? "error" : "warning"}>
          <strong>{urgentCount > 5 ? 'Urgent:' : 'Attention:'}</strong> {urgentCount} réclamation{urgentCount > 1 ? 's' : ''} critique{urgentCount > 1 ? 's' : ''} nécessite{urgentCount > 1 ? 'nt' : ''} une attention immédiate.
        </Alert>
      )}

      {parseFloat(slaCompliance) < 95 && (
        <Alert severity={parseFloat(slaCompliance) < 80 ? "error" : "warning"}>
          <strong>SLA {parseFloat(slaCompliance) < 80 ? 'critique' : 'en danger'}:</strong> La conformité SLA est de {slaCompliance}%, {parseFloat(slaCompliance) < 80 ? 'bien en dessous' : 'en dessous'} de l'objectif de 95%.
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="textSecondary" variant="body2">Aucune donnée de type disponible</Typography>
                    <Typography color="textSecondary" variant="caption">Les données apparaîtront après la création de réclamations</Typography>
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="textSecondary" variant="body2">Aucune donnée de gravité disponible</Typography>
                    <Typography color="textSecondary" variant="caption">Les données apparaîtront après la création de réclamations</Typography>
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
                {trendLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ ml: 1 }} color="textSecondary">Chargement des tendances...</Typography>
                  </Box>
                ) : trendData && trendData.length > 0 ? (
                  <Line data={chartTrendData} options={{ 
                    maintainAspectRatio: true,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
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
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="textSecondary" variant="body2">Aucune donnée de tendance disponible</Typography>
                    <Typography color="textSecondary" variant="caption">Vérifiez que le serveur est démarré</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default ReclamationDashboard;
