import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import ReclamationDashboard from '../../components/reclamations/ReclamationDashboard';
import ReclamationForm from '../../components/reclamations/ReclamationForm';
import { ReclamationsList } from '../../components/reclamations/ReclamationsList';
import ReclamationSearch from '../../components/reclamations/ReclamationSearch';
import { Reporting } from '../../components/reclamations/Reporting';
import AIClassificationPanel from '../../components/reclamations/AIClassificationPanel';
import CustomerPortalInterface from '../../components/reclamations/CustomerPortalInterface';
import AdvancedAnalyticsDashboard from '../../components/reclamations/AdvancedAnalyticsDashboard';

const ReclamationsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <div className="reclamations-module">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="Nouvelle Réclamation" />
          <Tab label="Liste des Réclamations" />
          <Tab label="Classification IA" />
          <Tab label="Portail Client" />
          <Tab label="Analyses Avancées" />
          <Tab label="Recherche & Filtres" />
          <Tab label="Rapports" />
        </Tabs>
      </Box>

      {activeTab === 0 && <ReclamationDashboard />}
      {activeTab === 1 && <ReclamationForm onSuccess={() => setActiveTab(2)} />}
      {activeTab === 2 && <ReclamationsList />}
      {activeTab === 3 && <AIClassificationPanel />}
      {activeTab === 4 && <CustomerPortalInterface />}
      {activeTab === 5 && <AdvancedAnalyticsDashboard />}
      {activeTab === 6 && <ReclamationSearch />}
      {activeTab === 7 && <Reporting />}
    </div>
  );
};

export default ReclamationsModule;