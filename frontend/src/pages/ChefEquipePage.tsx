import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import ChefEquipeGlobalBasket from '../components/ChefEquipeGlobalBasket';
import { ChefEquipeCorbeille } from '../components/Workflow/ChefEquipeCorbeille';
import { ChefEquipeActionButtons } from '../components/Workflow/ChefEquipeActionButtons';


const ChefEquipePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="📊 Vue Globale" />
          {/* <Tab label="📋 Corbeille Équipe" /> */}
          {/* <Tab label="⚡ Actions Rapides" /> */}
        </Tabs>
      </Paper>

      {activeTab === 0 && <ChefEquipeGlobalBasket />}
      {/* {activeTab === 1 && <ChefEquipeCorbeille />} */}
      {/* {activeTab === 1 && <ChefEquipeActionButtons />} */}
    </Box>
  );
};

export default ChefEquipePage;