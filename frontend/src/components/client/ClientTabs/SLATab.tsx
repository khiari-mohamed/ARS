import React from 'react';
import { Client } from '../../../types/client.d';
import { Paper, Typography, Grid, Chip } from '@mui/material';

function getSLAStatus(avgSLA: number, reglementDelay: number) {
  if (avgSLA == null || reglementDelay == null) return { label: 'N/A', color: 'default' };
  if (avgSLA <= reglementDelay) return { label: 'On Track', color: 'success' }; // 🟢
  if (avgSLA <= reglementDelay + 2) return { label: 'Warning', color: 'warning' }; // 🟠
  return { label: 'Late', color: 'error' }; // 🔴
}

interface Props {
  client: Client;
  avgSLA?: number | null; // Optionally pass from KPI tab
}

const SLATab: React.FC<Props> = ({ client, avgSLA }) => {
  const slaStatus = avgSLA !== undefined && avgSLA !== null
    ? getSLAStatus(avgSLA, client.reglementDelay || 30)
    : null;

  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h6">SLA Parameters</Typography>
      <Grid container spacing={2}>
        <Grid item>
          <Typography><strong>Reglement Delay:</strong> {client.reglementDelay} days</Typography>
        </Grid>
        <Grid item>
          <Typography><strong>Reclamation Delay:</strong> {client.reclamationDelay} days</Typography>
        </Grid>
        <Grid item>
          <Typography><strong>Account Manager:</strong> {client.accountManager?.fullName || '-'}</Typography>
        </Grid>
        {slaStatus && (
          <Grid item>
            <Typography>
              <strong>SLA Health:</strong>{' '}
              <Chip label={slaStatus.label} color={slaStatus.color as any} />
            </Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default SLATab;