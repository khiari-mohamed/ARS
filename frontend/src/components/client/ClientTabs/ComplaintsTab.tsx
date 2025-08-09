import React, { useEffect, useState } from 'react';
import {
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Typography, Grid, Alert, Skeleton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, MenuItem
} from '@mui/material';
import { fetchComplaintsByClient, createComplaint } from '../../../services/clientService';

interface Complaint {
  id: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
}

interface Props {
  clientId: string;
  onComplaintCreated?: () => void; // Optional callback for parent to update count
}

const defaultForm = {
  type: '',
  severity: 'medium',
  status: 'open',
  description: ''
};

const ComplaintsTab: React.FC<Props> = ({ clientId, onComplaintCreated }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [formError, setFormError] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchComplaintsByClient(clientId);
      setComplaints(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line
  }, [clientId]);

  // Form handlers
  const handleOpen = () => {
    setForm({ ...defaultForm });
    setFormError({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormError({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError((prev: any) => ({ ...prev, [e.target.name]: undefined }));
  };

  const validate = () => {
    const errors: any = {};
    if (!form.type.trim()) errors.type = 'Type is required';
    if (!form.severity) errors.severity = 'Severity is required';
    if (!form.status) errors.status = 'Status is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    setFormError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createComplaint({ clientId, ...form });
      setSnackbar({ open: true, message: 'Complaint created successfully', severity: 'success' });
      setOpen(false);
      loadComplaints();
      if (onComplaintCreated) onComplaintCreated();
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to create complaint', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid container direction="column" spacing={2}>
      <Grid item>
        <Typography variant="h6">
          Complaints {complaints.length > 0 && <span>({complaints.length} found)</span>}
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpen} sx={{ ml: 2 }}>
          Add Complaint
        </Button>
      </Grid>
      <Grid item>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <Skeleton variant="rectangular" height={80} />
        ) : complaints.length === 0 ? (
          <Typography>No complaints found.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {complaints.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>
                    <Chip label={c.severity} color={c.severity === 'high' ? 'error' : c.severity === 'medium' ? 'warning' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip label={c.status} color={c.status === 'open' ? 'warning' : 'success'} />
                  </TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Grid>

      {/* Complaint Creation Modal */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add Complaint</DialogTitle>
        <DialogContent>
          <TextField
            label="Type"
            name="type"
            value={form.type}
            onChange={handleChange}
            fullWidth
            required
            error={!!formError.type}
            helperText={formError.type}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Severity"
            name="severity"
            value={form.severity}
            onChange={handleChange}
            select
            fullWidth
            required
            error={!!formError.severity}
            helperText={formError.severity}
            sx={{ mb: 2 }}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
          <TextField
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            select
            fullWidth
            required
            error={!!formError.status}
            helperText={formError.status}
            sx={{ mb: 2 }}
          >
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </TextField>
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            required
            multiline
            minRows={2}
            error={!!formError.description}
            helperText={formError.description}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default ComplaintsTab;
