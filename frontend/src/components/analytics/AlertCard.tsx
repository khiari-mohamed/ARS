import React, { useState } from 'react';
import { Alert } from '../../types/alerts.d';
import { Card, CardContent, Typography, Chip, Button, Box, Snackbar, Alert as MuiAlert } from '@mui/material';
import { alertLevelColor, alertLevelLabel } from '../../utils/alertUtils';
import { useResolveAlert } from '../../hooks/useAlertsQuery';

/**
 * Props for AlertCard
 * @property alert - The alert object to display
 * @property onResolved - Optional callback for parent/global notification
 */
interface Props {
  alert: Alert;
  onResolved?: () => void;
}

/**
 * AlertCard displays a single alert with color, reason, and resolve button.
 * If alert.bordereau.alertLogId exists, it will be used for resolve; otherwise, falls back to bordereau.id.
 */
const AlertCard: React.FC<Props> = ({ alert, onResolved }) => {
  const { mutate: resolve, isLoading, isSuccess, isError, error } = useResolveAlert();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Determine the id to resolve: prefer alertLogId if present, else bordereau.id
  const alertId = (alert as any).alertLogId || (alert.bordereau as any).alertLogId || alert.bordereau.id;

  const handleResolve = () => {
    resolve(alertId, {
      onSuccess: () => {
        setSnackbarOpen(true);
        if (onResolved) onResolved();
      },
    });
  };

  return (
    <>
      <Card sx={{ mb: 2, borderLeft: `6px solid ${alertLevelColor(alert.alertLevel)}` }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1">
                Bordereau: <b>{alert.bordereau.id}</b>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Raison: {alert.reason}
              </Typography>
              <Chip
                label={alertLevelLabel(alert.alertLevel)}
                sx={{
                  backgroundColor: alertLevelColor(alert.alertLevel),
                  color: '#fff',
                  mt: 1,
                }}
              />
            </Box>
            <Button
              variant="contained"
              color="success"
              disabled={isLoading}
              onClick={handleResolve}
            >
              Marquer comme résolu
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSnackbarOpen(false)} severity={isSuccess ? 'success' : 'error'} sx={{ width: '100%' }}>
          {isSuccess
            ? 'Alerte marquée comme résolue !'
            : isError
            ? `Erreur: ${(error as any)?.message || 'Impossible de résoudre'}`
            : ''}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default AlertCard;