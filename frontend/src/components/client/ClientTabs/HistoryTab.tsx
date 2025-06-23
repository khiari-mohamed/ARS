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
  const handleExportExcel = () => {
    if (!history) return;
    // Each table as a separate sheet
    const sheets = [
      {
        name: 'Contracts',
        data: history.contracts.map((c: any) => ({
          Name: c.clientName,
          Start: c.startDate || '-',
          End: c.endDate || '-',
        })),
      },
      {
        name: 'Bordereaux',
        data: history.bordereaux.map((b: any) => ({
          Reference: b.reference,
          Status: b.statut,
          Date: b.dateReception ? new Date(b.dateReception).toLocaleDateString() : '-',
        })),
      },
      {
        name: 'Complaints',
        data: history.reclamations.map((r: any) => ({
          Type: r.type,
          Status: r.status,
          Date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
        })),
      },
    ];
    // Custom export: one file, multiple sheets
    // We'll use the first sheet as main, then append others
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    sheets.forEach(sheet => {
      const ws = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSX.writeFile(wb, `client_history_${clientId}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!history) return;
    // Export each table as a separate section in the PDF
    const doc = new (require('jspdf').default)();
    require('jspdf-autotable');

    // Contracts
    doc.text('Contracts', 14, 16);
    (doc as any).autoTable({
      startY: 20,
      head: [['Name', 'Start', 'End']],
      body: history.contracts.map((c: any) => [
        c.clientName,
        c.startDate || '-',
        c.endDate || '-',
      ]),
    });

    // Bordereaux
    let y = (doc as any).lastAutoTable.finalY + 10 || 40;
    doc.text('Bordereaux', 14, y);
    (doc as any).autoTable({
      startY: y + 4,
      head: [['Reference', 'Status', 'Date']],
      body: history.bordereaux.map((b: any) => [
        b.reference,
        b.statut,
        b.dateReception ? new Date(b.dateReception).toLocaleDateString() : '-',
      ]),
    });

    // Complaints
    y = (doc as any).lastAutoTable.finalY + 10 || y + 40;
    doc.text('Complaints', 14, y);
    (doc as any).autoTable({
      startY: y + 4,
      head: [['Type', 'Status', 'Date']],
      body: history.reclamations.map((r: any) => [
        r.type,
        r.status,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
      ]),
    });

    doc.save(`client_history_${clientId}.pdf`);
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