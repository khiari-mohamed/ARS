import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Fab
} from '@mui/material';
import { CheckCircle, Visibility, Add } from '@mui/icons-material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';

interface AlertsMobileViewProps {
  alerts: any[];
  kpiData: any;
  onResolve: () => void;
}

const AlertsMobileView: React.FC<AlertsMobileViewProps> = ({ alerts, kpiData, onResolve }) => {
  return (
    <Box>
      {/* Mobile KPI Cards */}
      {kpiData && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="error">
                  {kpiData.criticalAlerts || 0}
                </Typography>
                <Typography variant="caption">Critiques</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="success.main">
                  {kpiData.resolvedToday || 0}
                </Typography>
                <Typography variant="caption">Résolues</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mobile Alert Cards */}
      <Box>
        {alerts?.slice(0, 10).map((alert: any) => (
          <Card key={alert.bordereau.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  #{alert.bordereau.id}
                </Typography>
                <Chip
                  label={alertLevelLabel(alert.alertLevel)}
                  sx={{
                    backgroundColor: alertLevelColor(alert.alertLevel),
                    color: '#fff',
                  }}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                {alert.reason}
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={alert.bordereau.statut}
                  color={alert.bordereau.statut === 'CLOTURE' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  startIcon={<CheckCircle />}
                  color="success"
                  onClick={onResolve}
                >
                  Résoudre
                </Button>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => window.open(`/bordereaux/${alert.bordereau.id}`, '_blank')}
                >
                  Voir
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => window.location.reload()}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default AlertsMobileView;