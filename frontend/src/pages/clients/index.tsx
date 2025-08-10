// src/pages/clients/index.tsx

import React, { useEffect, useState } from 'react';
import { fetchClients, createClient, updateClient, deleteClient, exportClientsAdvanced } from '../../services/clientService';
import ClientTable from '../../components/client/ClientTable';
import ClientFormModal from '../../components/client/ClientFormModal';
import ClientFilters from '../../components/client/ClientFilters';
import ClientBulkImport from '../../components/client/ClientBulkImport';
import { Client } from '../../types/client.d';
import { Button, Grid, Paper, Typography, Box, Menu, MenuItem } from '@mui/material';
import { Add, Upload, Download, MoreVert } from '@mui/icons-material';
import ClientDetail from '../../components/client/ClientDetail';
import ManagerDashboard from '../../components/client/ManagerDashboard';

const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState({});

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchClients(filters);
      setClients(data);
      // If no client is selected, select the first one
      if (!selected && data.length > 0) setSelected(data[0]);
      // If selected client is deleted, select the first one
      if (selected && !data.find((c: any) => c.id === selected.id) && data.length > 0) setSelected(data[0]);
      if (data.length === 0) setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); /* eslint-disable-next-line */ }, [filters]);

  const handleAdd = () => { setSelected(null); setModalOpen(true); };
  const handleEdit = (client: Client) => { setSelected(client); setModalOpen(true); };
  const handleDelete = async (id: string) => {
    await deleteClient(id);
    loadClients();
  };
  const handleSubmit = async (data: Partial<Client>) => {
    if (selected) await updateClient(selected.id, data);
    else await createClient(data);
    setModalOpen(false);
    loadClients();
  };
  const handleView = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) setSelected(client);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const blob = await exportClientsAdvanced(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setExportMenuAnchor(null);
  };

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f7f9fb' }}>
      <Paper sx={{ p: 2, mb: 3, boxShadow: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Clients</Typography>
        <ClientFilters onChange={setFilters} />
        
        {/* Action Buttons */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAdd}
            startIcon={<Add />}
            sx={{ flex: 1, minWidth: 150 }}
          >
            Add New Client
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setBulkImportOpen(true)}
            startIcon={<Upload />}
            sx={{ flex: 1, minWidth: 150 }}
          >
            Bulk Import
          </Button>
          <Button 
            variant="outlined" 
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
            startIcon={<Download />}
            endIcon={<MoreVert />}
            sx={{ flex: 1, minWidth: 150 }}
          >
            Export
          </Button>
        </Box>
        
        {/* Export Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
          <MenuItem onClick={() => handleExport('excel')}>Export as Excel</MenuItem>
          <MenuItem onClick={() => handleExport('pdf')}>Export as PDF</MenuItem>
        </Menu>
        <ClientTable
          clients={clients}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
        <ClientFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          client={selected}
        />
        
        <ClientBulkImport
          open={bulkImportOpen}
          onClose={() => setBulkImportOpen(false)}
          onImportComplete={loadClients}
        />
      </Paper>
      <Paper sx={{ p: 2, boxShadow: 1, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Manager Dashboard</Typography>
        <ManagerDashboard />
      </Paper>
      <Paper sx={{ p: 3, boxShadow: 3, minHeight: 600 }}>
        {selected ? (
          <ClientDetail client={selected} />
        ) : (
          <Typography variant="h6" sx={{ mt: 4 }}>Select a client to view details.</Typography>
        )}
      </Paper>
    </div>
  );
};

export default ClientListPage;
