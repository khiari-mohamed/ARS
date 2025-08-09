import React from 'react';
import { Client } from '../../../types/client.d';
import { Chip } from '@mui/material';
import { getSLAColor } from '../../../utils/slaColor';

const OverviewTab: React.FC<{ client: Client }> = ({ client }) => {
  // Optionally show SLA health color (based on reglementDelay and averageSLA if available)
  // For demo, we use reglementDelay as both values (replace with real avgSLA if available)
  const slaColor = getSLAColor(client.reglementDelay || 30, client.reglementDelay || 30);

  return (
    <div>
      <h3>Client Overview</h3>
      <p><strong>Name:</strong> {client.name}</p>
      <p><strong>Account Manager:</strong> {client.accountManager?.fullName || '-'}</p>
      <p><strong>Reglement Delay:</strong> {client.reglementDelay} days</p>
      <p><strong>Reclamation Delay:</strong> {client.reclamationDelay} days</p>
      <p><strong>Client ID:</strong> {client.id}</p>
      {client.createdAt && (
        <p><strong>Created At:</strong> {new Date(client.createdAt).toLocaleString()}</p>
      )}
      {client.updatedAt && (
        <p><strong>Updated At:</strong> {new Date(client.updatedAt).toLocaleString()}</p>
      )}
      {/* SLA Health Indicator (optional) */}
      <p>
        <strong>SLA Health:</strong>{' '}
        <Chip
          label={
            slaColor === 'green'
              ? 'On Track'
              : slaColor === 'orange'
              ? 'Warning'
              : 'Late'
          }
          color={
            slaColor === 'green'
              ? 'success'
              : slaColor === 'orange'
              ? 'warning'
              : 'error'
          }
          size="small"
        />
      </p>
    </div>
  );
};

export default OverviewTab;