import React, { useEffect, useState } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Skeleton, Alert, Grid } from '@mui/material';
import { fetchClients, fetchClientAnalytics } from '../../services/clientService';
import { useAuthContext } from '../../contexts/AuthContext';
import { Client } from '../../types/client.d';

interface ClientKPI {
  clientId: string;
  clientName: string;
  bordereauxCount: number;
  reclamationsCount: number;
  avgSLA: number | null;
  reglementDelay: number;
  slaStatus: 'On Track' | 'Warning' | 'Late' | 'N/A';
}

function getSLAStatus(avgSLA: number | null, reglementDelay: number): 'On Track' | 'Warning' | 'Late' | 'N/A' {
  if (avgSLA == null || reglementDelay == null) return 'N/A';
  if (avgSLA <= reglementDelay) return 'On Track';
  if (avgSLA <= reglementDelay + 2) return 'Warning';
  return 'Late';
}

const ManagerDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [kpis, setKpis] = useState<ClientKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: Client[] = [];
        let filter = {};
        if (user?.role === 'ADMINISTRATEUR' || user?.role === 'admin') {
          data = await fetchClients();
          filter = { all: true };
        } else if (user?.id) {
          data = await fetchClients({ accountManagerId: user.id });
          filter = { accountManagerId: user.id };
        }
        setClients(data);
        setDebug({ user, filter, clientCount: data.length });
        // If no managed clients and not admin, fallback to all
        if (data.length === 0 && user?.id) {
          data = await fetchClients();
          setClients(data);
          setDebug((d: any) => ({ ...d, fallbackAll: true, clientCount: data.length }));
        }
        // Fetch KPIs for each client
        const kpiResults: ClientKPI[] = await Promise.all(
          data.map(async (client: Client) => {
            try {
              const kpi = await fetchClientAnalytics(client.id);
              const slaStatus = getSLAStatus(kpi.avgSLA, kpi.reglementDelay);
              return {
                clientId: client.id,
                clientName: client.name,
                bordereauxCount: kpi.bordereauxCount,
                reclamationsCount: kpi.reclamationsCount,
                avgSLA: kpi.avgSLA,
                reglementDelay: kpi.reglementDelay,
                slaStatus,
              };
            } catch {
              return {
                clientId: client.id,
                clientName: client.name,
                bordereauxCount: 0,
                reclamationsCount: 0,
                avgSLA: null,
                reglementDelay: client.reglementDelay,
                slaStatus: 'N/A',
              };
            }
          })
        );
        setKpis(kpiResults);
      } catch (e: any) {
        setError(e?.message || 'Failed to load manager dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Manager Dashboard</Typography>
      <Typography variant="body2" color="textSecondary">
        User: {user?.username || user?.id || 'N/A'} | Role: {user?.role || 'N/A'}
      </Typography>
      {debug && (
        <Typography variant="body2" color="textSecondary">
          Filter: {JSON.stringify(debug.filter)} | Clients fetched: {debug.clientCount} {debug.fallbackAll ? '(fallback to all)' : ''}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Skeleton variant="rectangular" height={120} />
      ) : kpis.length === 0 ? (
        <Typography>No managed clients found.</Typography>
      ) : (
        <Grid container>
          <Grid item xs={12}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Bordereaux Count</TableCell>
                  <TableCell>Reclamations Count</TableCell>
                  <TableCell>Average SLA</TableCell>
                  <TableCell>Reglement Delay</TableCell>
                  <TableCell>SLA Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {kpis.map(kpi => (
                  <TableRow key={kpi.clientId}>
                    <TableCell>{kpi.clientName}</TableCell>
                    <TableCell>{kpi.bordereauxCount}</TableCell>
                    <TableCell>{kpi.reclamationsCount}</TableCell>
                    <TableCell>{kpi.avgSLA ?? '-'}</TableCell>
                    <TableCell>{kpi.reglementDelay}</TableCell>
                    <TableCell>
                      <Chip
                        label={kpi.slaStatus}
                        color={
                          kpi.slaStatus === 'On Track' ? 'success' :
                          kpi.slaStatus === 'Warning' ? 'warning' :
                          kpi.slaStatus === 'Late' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default ManagerDashboard;
