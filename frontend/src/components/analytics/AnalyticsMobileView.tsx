import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Grid, Button, Collapse,
  IconButton, Chip, Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AnalyticsIcon from '@mui/icons-material/Analytics';

interface Props {
  filters: any;
  onFilterChange: (field: string, value: string) => void;
  onTabChange: (tab: number) => void;
  globalKPIs: any;
}

const AnalyticsMobileView: React.FC<Props> = ({ filters, onFilterChange, onTabChange, globalKPIs }) => {
  const [expanded, setExpanded] = useState(false);

  const quickActions = [
    { label: 'Vue d\'ensemble', tab: 0, icon: '📊' },
    { label: 'Performance', tab: 1, icon: '🎯' },
    { label: 'Réclamations', tab: 2, icon: '⚠️' },
    { label: 'Risques SLA', tab: 3, icon: '🚨' },
    { label: 'Prévisions', tab: 4, icon: '🔮' },
    { label: 'Rapports', tab: 5, icon: '📄' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header Card */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <AnalyticsIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Analytics Dashboard
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Tableau de bord analytique
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'white' }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={expanded}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                Filtres actifs:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  label={`Période: ${filters.dateRange}`} 
                  size="small" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                {filters.departmentId && (
                  <Chip 
                    label={`Dept: ${filters.departmentId}`} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                )}
                {filters.slaStatus && (
                  <Chip 
                    label={`SLA: ${filters.slaStatus}`} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                )}
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Quick KPI Cards */}
      {globalKPIs && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="primary">
                  {globalKPIs.slaCompliance}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  SLA Compliance
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="success.main">
                  {globalKPIs.totalBordereaux}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Bordereaux
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="warning.main">
                  {globalKPIs.avgProcessingTime}j
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Temps Moyen
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="error">
                  {globalKPIs.activeAlerts}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Alertes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Quick Navigation */}
      <Card elevation={1}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Navigation Rapide
          </Typography>
          <Grid container spacing={1}>
            {quickActions.map((action, index) => (
              <Grid item xs={6} key={index}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => onTabChange(action.tab)}
                  startIcon={<span>{action.icon}</span>}
                  sx={{ 
                    py: 1.5,
                    textTransform: 'none',
                    borderRadius: 2
                  }}
                >
                  {action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnalyticsMobileView;