import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Chip, IconButton, Collapse,
  Grid, Divider, Button, Stack, useTheme, useMediaQuery
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Client } from '../../types/client.d';
import { getSLAColor } from '../../utils/slaColor';

interface Props {
  client: Client;
  avgSLA?: number | null;
  onTabChange: (tab: number) => void;
}

const ClientMobileView: React.FC<Props> = ({ client, avgSLA, onTabChange }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  const slaColor = avgSLA ? getSLAColor(avgSLA, client.reglementDelay || 30) : 'green';
  const getSLAStatus = () => {
    return slaColor === 'green' ? 'À temps' : slaColor === 'orange' ? 'Risque' : 'En retard';
  };

  const quickActions = [
    { label: 'Contrats', tab: 1, icon: '📄' },
    { label: 'Réclamations', tab: 3, icon: '⚠️' },
    { label: 'KPIs', tab: 4, icon: '📊' },
    { label: 'Performance', tab: 6, icon: '📈' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* Mobile Header Card */}
      <Card elevation={3} sx={{ mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <BusinessIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {client.name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {client.gestionnaires?.[0]?.fullName || 'Non assigné'}
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
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Règlement</Typography>
                <Typography variant="h6">{client.reglementDelay}j</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Délai Réclamations</Typography>
                <Typography variant="h6">{client.reclamationDelay}j</Typography>
              </Grid>
              {avgSLA && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Status SLA</Typography>
                  <Chip 
                    label={getSLAStatus()} 
                    color={slaColor === 'green' ? 'success' : slaColor === 'orange' ? 'warning' : 'error'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
              )}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="primary">
                {client.bordereaux?.length || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Bordereaux
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="error">
                {client.reclamations?.length || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Réclamations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h6" color="warning.main">
                {client.contracts?.length || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Contrats
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card elevation={1}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Actions Rapides
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

export default ClientMobileView;