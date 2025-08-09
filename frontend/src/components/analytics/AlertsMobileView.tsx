import React from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, Warning, CheckCircle, Schedule } from '@mui/icons-material';
import { Alert } from '../../types/alerts.d';

interface Props {
  alerts: Alert[];
  kpiData?: any;
  onResolve: (alertId: string) => void;
}

const AlertsMobileView: React.FC<Props> = ({ alerts, kpiData, onResolve }) => {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
      {/* Mobile KPI Cards */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Indicateurs Clés</Typography>
        <Box display="flex" gap={1} sx={{ overflowX: 'auto', pb: 1 }}>
          <Card sx={{ minWidth: 120, borderLeft: '4px solid #faad14' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="warning" fontSize="small" />
                <Box>
                  <Typography variant="h6">{kpiData?.totalAlerts || 0}</Typography>
                  <Typography variant="caption">Alertes</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          <Card sx={{ minWidth: 120, borderLeft: '4px solid #ff4d4f' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="error" fontSize="small" />
                <Box>
                  <Typography variant="h6">{kpiData?.criticalAlerts || 0}</Typography>
                  <Typography variant="caption">Critiques</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          <Card sx={{ minWidth: 120, borderLeft: '4px solid #52c41a' }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircle color="success" fontSize="small" />
                <Box>
                  <Typography variant="h6">{kpiData?.resolvedToday || 0}</Typography>
                  <Typography variant="caption">Résolues</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Mobile Alerts List */}
      <Typography variant="h6" gutterBottom>Alertes Actives</Typography>
      {alerts.map((alert, index) => (
        <Accordion key={alert.id || index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box>
                <Typography variant="subtitle2">
                  Bordereau: {alert.bordereau.id}
                </Typography>
                <Chip
                  size="small"
                  label={alert.alertLevel === 'red' ? 'Critique' : alert.alertLevel === 'orange' ? 'Alerte' : 'Normal'}
                  color={alert.alertLevel === 'red' ? 'error' : alert.alertLevel === 'orange' ? 'warning' : 'success'}
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {alert.reason}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip
                size="small"
                label="Résoudre"
                color="success"
                onClick={() => onResolve(alert.id || alert.bordereau.id)}
                clickable
              />
              <Chip
                size="small"
                label="Détails"
                variant="outlined"
                clickable
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default AlertsMobileView;