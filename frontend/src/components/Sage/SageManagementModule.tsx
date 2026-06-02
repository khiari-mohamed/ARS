import React, { useState } from 'react';
import {
  Box, Paper, Tabs, Tab, useTheme, useMediaQuery, Typography
} from '@mui/material';
import ConfigurationsTab from './ConfigurationsTab';
import RecouvrementTab from './RecouvrementTab';
import TemplateEditorTab from './TemplateEditorTab';
import HistoryTab from './HistoryTab';
import SageIntegrationTab   from './SageIntegrationTab'; // ← NEW
import { useAuth } from '../../contexts/AuthContext';


const SageManagementModule: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = parseInt(urlParams.get('tab') || '0', 10);
  const [tab, setTab] = useState(initialTab);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const handleTabChange = (newTab: number) => {
    setTab(newTab);
  };

  const tabLabels = [
    'Configurations Sage',
    'Recouvrement',
    'Éditeur de Templates',
    'Historique & Téléchargements',
    'Intégration SAGE API',       // ← NEW (index 4)
  ];

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f4f7fb' }}>

      {/* ── Page Header ── */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #6A1B9A 0%, #4A148C 100%)',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(106,27,154,0.18)',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
          Gestion Sage — Comptabilité &amp; Recouvrement
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
          Configuration des comptes Sage, suivi du recouvrement et gestion des templates
        </Typography>
      </Box>

      {/* ── Tab Container ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            borderBottom: '2px solid #e8edf5',
            bgcolor: '#fafbfc',
            px: 2,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => handleTabChange(v)}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{
              style: { backgroundColor: '#6A1B9A', height: 3, borderRadius: '3px 3px 0 0' },
            }}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '0.82rem',
                textTransform: 'none',
                color: '#546e7a',
                minHeight: 48,
                px: 2.5,
                '&.Mui-selected': { color: '#6A1B9A' },
              },
            }}
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {tab === 0 && <ConfigurationsTab />}
          {tab === 1 && <RecouvrementTab />}
          {tab === 2 && <TemplateEditorTab />}
          {tab === 3 && <HistoryTab />}
          {tab === 4 && <SageIntegrationTab />}   {/* ← NEW */}
        </Box>
      </Paper>

    </Box>
  );
};

export default SageManagementModule;