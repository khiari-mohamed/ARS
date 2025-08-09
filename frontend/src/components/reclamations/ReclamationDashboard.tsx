import React from 'react';
import { useReclamationStats } from '../../hooks/useReclamationStats';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, Typography, Grid, Box, Alert } from '@mui/material';
import { TrendingUp, Warning, CheckCircle, Schedule } from '@mui/icons-material';
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

export const ReclamationDashboard: React.FC = () => {
  const { data: stats, isLoading } = useReclamationStats();

  if (isLoading || !stats) return <div>Chargement des statistiques...</div>;

  // Calculate SLA compliance percentage
  const slaCompliance = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0';
  const avgResolutionDays = stats.avgResolution ? (stats.avgResolution / (24 * 60 * 60)).toFixed(1) : '0';
  const urgentCount = stats.bySeverity?.find((s: any) => s.severity === 'critical')?._count?.id || 0;

  // Pie chart for types
  const typeData = {
    labels: (stats.byType || []).map((t: any) => t.type),
    datasets: [
      {
        label: 'Par type',
        data: (stats.byType || []).map((t: any) => t._count.id),
        backgroundColor: [
          '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        ],
      },
    ],
  };

  // Pie chart for severity
  const severityData = {
    labels: (stats.bySeverity || []).map((s: any) => s.severity),
    datasets: [
      {
        label: 'Par gravité',
        data: (stats.bySeverity || []).map((s: any) => s._count.id),
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336'], // Green, Orange, Red
      },
    ],
  };

  // SLA status breakdown
  const slaData = {
    labels: ['À temps', 'À risque', 'En retard'],
    datasets: [
      {
        label: 'Statut SLA',
        data: [stats.resolved || 0, Math.max(0, (stats.total - stats.resolved - stats.open)), stats.open || 0],
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
      },
    ],
  };

  // Volume trend (mock data - replace with real trend data)
  const trendData = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      {
        label: 'Réclamations reçues',
        data: [12, 19, 7, 15],
        fill: false,
        borderColor: '#36A2EB',
        tension: 0.1,
      },
      {
        label: 'Réclamations résolues',
        data: [10, 15, 8, 12],
        fill: false,
        borderColor: '#4CAF50',
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
                <Pie data={typeData} options={{ 
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
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition par gravité
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Pie data={severityData} options={{ 
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

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statut SLA
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Bar data={slaData} options={{ 
                  maintainAspectRatio: true,
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
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
