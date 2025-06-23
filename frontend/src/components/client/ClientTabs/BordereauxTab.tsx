import React, { useEffect, useState } from 'react';
import { Table, TableHead, TableRow, TableCell, TableBody, Typography, Grid, Alert, Skeleton, Chip } from '@mui/material';
import { fetchBordereauxByClient } from '../../../services/clientService';

interface Bordereau {
  id: string;
  reference: string;
  statut: string;
  nombreBS: number;
  dateReception: string;
  delaiReglement?: number; // Add this if available from backend
}

interface Props {
  clientId: string;
}

function getBordereauSLAStatus(b: Bordereau) {
  if (!b.delaiReglement || !b.dateReception) return { label: 'N/A', color: 'default' };
  const received = new Date(b.dateReception);
  const deadline = new Date(received);
  deadline.setDate(deadline.getDate() + b.delaiReglement);
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 2) return { label: 'On Track', color: 'success' };
  if (diffDays >= 0) return { label: 'Warning', color: 'warning' };
  return { label: 'Late', color: 'error' };
}

const BordereauxTab: React.FC<Props> = ({ clientId }) => {
  const [bordereaux, setBordereaux] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBordereaux = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBordereauxByClient(clientId);
      setBordereaux(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bordereaux');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBordereaux();
    // eslint-disable-next-line
  }, [clientId]);

  return (
    <Grid container direction="column" spacing={2}>
      <Grid item>
        <Typography variant="h6">Bordereaux {bordereaux.length > 0 && <span>({bordereaux.length} found)</span>}</Typography>
      </Grid>
      <Grid item>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <Skeleton variant="rectangular" height={80} />
        ) : bordereaux.length === 0 ? (
          <Typography>No bordereaux found.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Number of BS</TableCell>
                <TableCell>Date Reception</TableCell>
                <TableCell>SLA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bordereaux.map(b => {
                const sla = getBordereauSLAStatus(b);
                return (
                  <TableRow key={b.id}>
                    <TableCell>{b.reference}</TableCell>
                    <TableCell>{b.statut}</TableCell>
                    <TableCell>{b.nombreBS}</TableCell>
                    <TableCell>{new Date(b.dateReception).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={sla.label} color={sla.color as any} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Grid>
    </Grid>
  );
};

export default BordereauxTab;