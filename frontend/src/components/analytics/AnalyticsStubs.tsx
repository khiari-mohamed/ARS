// Temporary stub components to fix compilation errors
import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

// Generic loading component for analytics
const AnalyticsLoading: React.FC<{ message?: string }> = ({ message = 'Chargement...' }) => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
    <CircularProgress />
    <Typography sx={{ mt: 2 }}>{message}</Typography>
  </Box>
);

// Generic error component for analytics
const AnalyticsError: React.FC<{ message?: string }> = ({ message = 'Erreur de chargement' }) => (
  <Box p={4} textAlign="center">
    <Typography color="error">{message}</Typography>
  </Box>
);

// Stub components for missing analytics features
export const AlertEscalationBanner: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Bannière d'Escalade des Alertes</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const ClientSlaVolumeDashboard: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Tableau de Bord SLA Client</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const DailyTargetTable: React.FC<{ params?: any }> = () => (
  <Box p={2}>
    <Typography variant="h6">Tableau des Objectifs Quotidiens</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const PeriodComparisonChart: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Graphique de Comparaison de Périodes</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const PriorityScoreList: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Liste des Scores de Priorité</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const ReclamationPerformanceTable: React.FC<{ params?: any }> = () => (
  <Box p={2}>
    <Typography variant="h6">Tableau de Performance des Réclamations</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const RecommendationsPanel: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Panneau de Recommandations</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const SlaComplianceChart: React.FC<{ params?: any }> = () => (
  <Box p={2}>
    <Typography variant="h6">Graphique de Conformité SLA</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const SlaTrendChart: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Graphique de Tendance SLA</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const StaffingDashboard: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">Tableau de Bord du Personnel</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export const ThroughputGapKPI: React.FC = () => (
  <Box p={2}>
    <Typography variant="h6">KPI d'Écart de Débit</Typography>
    <Typography variant="body2">Fonctionnalité en cours de développement</Typography>
  </Box>
);

export default {
  AnalyticsLoading,
  AnalyticsError,
  AlertEscalationBanner,
  ClientSlaVolumeDashboard,
  DailyTargetTable,
  PeriodComparisonChart,
  PriorityScoreList,
  ReclamationPerformanceTable,
  RecommendationsPanel,
  SlaComplianceChart,
  SlaTrendChart,
  StaffingDashboard,
  ThroughputGapKPI
};