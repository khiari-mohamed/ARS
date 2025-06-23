// src/pages/clients/index.tsx

import React, { useEffect, useState } from 'react';
import { fetchClients, createClient, updateClient, deleteClient } from '../../services/clientService';
import ClientTable from '../../components/client/ClientTable';
import ClientFormModal from '../../components/client/ClientFormModal';
import ClientFilters from '../../components/client/ClientFilters';
import { Client } from '../../types/client.d';
import { Button, Grid, Paper, Typography } from '@mui/material';
import ClientDetail from '../../components/client/ClientDetail';
import ManagerDashboard from '../../components/client/ManagerDashboard';

const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchClients(filters);
      setClients(data);
      // If no client is selected, select the first one
      if (!selected && data.length > 0) setSelected(data[0]);
      // If selected client is deleted, select the first one
      if (selected && !data.find(c => c.id === selected.id) && data.length > 0) setSelected(data[0]);
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

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f7f9fb' }}>
      <Paper sx={{ p: 2, mb: 3, boxShadow: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Clients</Typography>
        <ClientFilters onChange={setFilters} />
        <Button variant="contained" color="primary" onClick={handleAdd} sx={{ mb: 2, width: '100%' }}>Add New Client</Button>
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
