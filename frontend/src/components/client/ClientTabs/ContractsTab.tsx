import React, { useEffect, useState } from 'react';
import { Contract } from '../../../types/contract.d';
import { fetchContractsByClient, uploadContractDocument, updateContract } from '../../../services/contractService';
import { Table, TableHead, TableRow, TableCell, TableBody, Link, Typography, Grid, Button, Snackbar, Alert, Skeleton, IconButton, TextField, Tooltip, Stack, Chip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { exportToExcel, exportToPDF } from '../../../utils/export';

interface Props {
  clientId: string;
  // onDataChanged?: () => void;
}

function getSLAStatus(delaiReglement?: number, avgSLA?: number) {
  if (avgSLA == null || delaiReglement == null) return { label: 'N/A', color: 'default' };
  if (avgSLA <= delaiReglement) return { label: 'On Track', color: 'success' }; // 🟢
  if (avgSLA <= delaiReglement + 2) return { label: 'Warning', color: 'warning' }; // 🟠
  return { label: 'Late', color: 'error' }; // 🔴
}

const ContractsTab: React.FC<Props> = ({ clientId }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'}>({open: false, message: '', severity: 'success'});
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [avgSLA, setAvgSLA] = useState<number | null>(null);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContractsByClient(clientId);
      setContracts(data);
      // Calculate avgSLA for AI/SLA color coding (mock: average of delaiReglement)
      if (data.length > 0) {
        const valid = data.filter((c: Contract) => typeof c.delaiReglement === 'number');
        const avg = valid.length > 0 ? valid.reduce((sum: number, c: Contract) => sum + (c.delaiReglement ?? 0), 0) / valid.length : null;
        setAvgSLA(avg);
      } else {
        setAvgSLA(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line
  }, [clientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    // Client-side validation: only PDF, max 10MB
    if (file.type !== 'application/pdf') {
      setSnackbar({open: true, message: 'Only PDF files are allowed', severity: 'error'});
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({open: true, message: 'File size exceeds 10MB', severity: 'error'});
      e.target.value = '';
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadContractDocument(clientId, file);
      setSnackbar({open: true, message: 'Contract uploaded successfully', severity: 'success'});
      loadContracts();
      // // // // Removed onDataChanged call (was undefined)
    } catch (err: any) {
      setSnackbar({open: true, message: err?.message || 'Upload failed', severity: 'error'});
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditId(contract.id);
    setEditValues({
      delaiReglement: contract.delaiReglement ?? '',
      delaiReclamation: contract.delaiReclamation ?? '',
      signature: contract.signature ?? '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setEditId(null);
    setEditValues({});
  };

  const handleSave = async (contract: Contract) => {
    setSaving(true);
    try {
      const updateData: Partial<Contract> = {
        delaiReglement: editValues.delaiReglement ? Number(editValues.delaiReglement) : undefined,
        delaiReclamation: editValues.delaiReclamation ? Number(editValues.delaiReclamation) : undefined,
        signature: editValues.signature || undefined,
      };
      await updateContract(contract.id, updateData);
      setSnackbar({open: true, message: 'Contract updated', severity: 'success'});
      setEditId(null);
      setEditValues({});
      loadContracts();
      // Removed onDataChanged call (was undefined)
    } catch (err: any) {
      setSnackbar({open: true, message: err?.message || 'Update failed', severity: 'error'});
    } finally {
      setSaving(false);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(contracts, 'contracts');
  };

  const handleExportPDF = () => {
    exportToPDF(
      ['clientName', 'startDate', 'endDate', 'delaiReglement', 'delaiReclamation', 'signature'],
      contracts,
      'contracts'
    );
  };

  // Real AI recommendation
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  useEffect(() => {
    const fetchAI = async () => {
      if (!clientId) return;
      try {
        const res = await import('../../../services/clientService').then(m => m.fetchClientAIRecommendations(clientId));
        setAiRecommendation(res.recommendation);
      } catch {
        setAiRecommendation(null);
      }
    };
    fetchAI();
  }, [clientId]);

  // SLA color coding for Reglement Delay column
  const renderSLAChip = (delaiReglement?: number) => {
    if (avgSLA == null || delaiReglement == null) return <Chip label="N/A" size="small" />;
    const status = getSLAStatus(delaiReglement, avgSLA);
    return <Chip label={status.label} color={status.color as any} size="small" />;
  };

  return (
    <div>
      <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
        <Grid item>
          <Typography variant="h6">Contracts {contracts.length > 0 && <span>({contracts.length} found)</span>}</Typography>
        </Grid>
        <Grid item>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleExportExcel}>Export Excel</Button>
            <Button variant="outlined" onClick={handleExportPDF}>Export PDF</Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              size="small"
            >
              Upload Contract
              <input type="file" hidden onChange={handleUpload} />
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {aiRecommendation && (
        <Alert severity={aiRecommendation.startsWith('⚠️') ? 'warning' : 'success'} sx={{ mt: 2 }}>
          {aiRecommendation}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {loading ? (
        <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
      ) : contracts.length === 0 ? (
        <Typography sx={{ mt: 2 }}>No contracts found.</Typography>
      ) : (
        <Table sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Contract Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Reglement Delay</TableCell>
              <TableCell>Reclamation Delay</TableCell>
              <TableCell>Signature</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map(contract => (
              <TableRow key={contract.id}>
                <TableCell>{contract.clientName}</TableCell>
                <TableCell>{contract.startDate || '-'}</TableCell>
                <TableCell>{contract.endDate || '-'}</TableCell>
                {editId === contract.id ? (
                  <>
                    <TableCell>
                      <TextField
                        name="delaiReglement"
                        value={editValues.delaiReglement}
                        onChange={handleEditChange}
                        size="small"
                        type="number"
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        name="delaiReclamation"
                        value={editValues.delaiReclamation}
                        onChange={handleEditChange}
                        size="small"
                        type="number"
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        name="signature"
                        value={editValues.signature || ''}
                        onChange={handleEditChange}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      {contract.delaiReglement ?? '-'} {renderSLAChip(contract.delaiReglement)}
                    </TableCell>
                    <TableCell>{contract.delaiReclamation ?? '-'}</TableCell>
                    <TableCell>{contract.signature ?? '-'}</TableCell>
                  </>
                )}
                <TableCell>
                  {contract.documentPath ? (
                    <Link href={`/api/clients/contract/${contract.documentPath}/download`} target="_blank" rel="noopener">Download</Link>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {editId === contract.id ? (
                    <>
                      <Tooltip title="Save"><span><IconButton onClick={() => handleSave(contract)} disabled={saving}><SaveIcon /></IconButton></span></Tooltip>
                      <Tooltip title="Cancel"><span><IconButton onClick={handleCancel} disabled={saving}><CancelIcon /></IconButton></span></Tooltip>
                    </>
                  ) : (
                    <Tooltip title="Edit"><span><IconButton onClick={() => handleEdit(contract)}><EditIcon /></IconButton></span></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({...s, open: false}))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({...s, open: false}))}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default ContractsTab;