import React, { useEffect, useState } from 'react';
import { fetchClientHistory } from '../../../services/clientService';
import { Typography, Grid, Table, TableHead, TableRow, TableCell, TableBody, Alert, Skeleton, Paper, Button, Stack } from '@mui/material';
import { exportToExcel, exportToPDF } from '../../../utils/export';

interface Props {
  clientId: string;
}

const HistoryTab: React.FC<Props> = ({ clientId }) => {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchClientHistory(clientId)
      .then(setHistory)
      .catch(e => setError(e?.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, [clientId]);

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/traitement/${clientId}/history/export/excel`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `client_history_${clientId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export Excel failed.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/traitement/${clientId}/history/export/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `client_history_${clientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export PDF failed.');
    }
  };

  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h6">Client History</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={handleExportExcel} disabled={!history}>
          Export Excel
        </Button>
        <Button variant="outlined" onClick={handleExportPDF} disabled={!history}>
          Export PDF
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Skeleton variant="rectangular" height={120} />
      ) : !history ? (
        <Typography>No history found.</Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">Contracts</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.clientName}</TableCell>
                    <TableCell>{c.startDate || '-'}</TableCell>
                    <TableCell>{c.endDate || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">Bordereaux</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.bordereaux.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.reference}</TableCell>
                    <TableCell>{b.statut}</TableCell>
                    <TableCell>{new Date(b.dateReception).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">Complaints</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.reclamations.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
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

export default HistoryTab;