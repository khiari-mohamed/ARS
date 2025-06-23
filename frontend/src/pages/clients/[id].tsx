// src/pages/clients/[id].tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchClient, fetchClientHistory, fetchClientAnalytics } from '../../services/clientService';
import { Client } from '../../types/client.d';
import { Tabs, Tab, Box } from '@mui/material';
import OverviewTab from '../../components/client/ClientTabs/OverviewTab';
import ContractsTab from '../../components/client/ClientTabs/ContractsTab';
import SLATab from '../../components/client/ClientTabs/SLATab';
import ComplaintsTab from '../../components/client/ClientTabs/ComplaintsTab';
import KPITab from '../../components/client/ClientTabs/KPITab';
import BordereauxTab from '../../components/client/ClientTabs/BordereauxTab';

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchClient(id!).then(setClient);
  }, [id]);

  if (!client) return <div>Loading...</div>;

  return (
    <Box>
      <h2>{client.name}</h2>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Overview" />
        <Tab label="Contracts" />
        <Tab label="SLA Parameters" />
        <Tab label="Complaints" />
        <Tab label="KPIs" />
        <Tab label="Bordereaux" />
      </Tabs>
      {tab === 0 && <OverviewTab client={client} />}
      {tab === 1 && <ContractsTab clientId={client.id} />}
      {tab === 2 && <SLATab client={client} />}
      {tab === 3 && <ComplaintsTab clientId={client.id} />}
      {tab === 4 && <KPITab clientId={client.id} />}
      {tab === 5 && <BordereauxTab clientId={client.id} />}
    </Box>
  );
};

export default ClientDetailPage;