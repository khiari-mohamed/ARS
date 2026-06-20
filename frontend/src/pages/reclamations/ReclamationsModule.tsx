// D:\ARS\frontend\src\pages\reclamations\ReclamationsModule.tsx
import React, { useState } from 'react';
import {
  Tabs, Tab, Box, useTheme, useMediaQuery, Paper, Typography, Chip
} from '@mui/material';
import {
  Dashboard, Email, List, Psychology, Category,
  Inbox, Add, Search, Person
} from '@mui/icons-material';
import ReclamationDashboard from '../../components/reclamations/ReclamationDashboard';
import ReclamationForm from '../../components/reclamations/ReclamationForm';
import { ReclamationsList } from '../../components/reclamations/ReclamationsList';
import ReclamationSearch from '../../components/reclamations/ReclamationSearch';
import AIClassificationPanel from '../../components/reclamations/AIClassificationPanel';
import ChefCorbeille from '../../components/reclamations/ChefCorbeille';
import GestionnaireCorbeille from '../../components/reclamations/GestionnaireCorbeille';
import BOReclamationForm from '../../components/reclamations/BOReclamationForm';
import RealTimeAlerts from '../../components/reclamations/RealTimeAlerts';
import OutlookEmailMonitoring from '../../components/reclamations/OutlookEmailMonitoring';
import TypologieConformiteTab from '../../components/reclamations/TypologieConformiteTab';
import { useAuth } from '../../contexts/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY       = '#1e3a5f';
const NAVY_LIGHT = '#f0f4ff';
const BORDER     = 'rgba(0,0,0,0.08)';

const ReclamationsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // ── Role-specific tab configurations ───────────────────────────────────────
  // Logic is 100% preserved; only icons added for visual polish.
  const getTabsForRole = () => {
    switch (user?.role) {
      case 'CHEF_EQUIPE':
        return [
          { label: 'Dashboard',             icon: <Dashboard   fontSize="small" />, component: <ReclamationDashboard /> },
          { label: 'Emails Outlook',        icon: <Email       fontSize="small" />, component: <OutlookEmailMonitoring /> },
          { label: 'Liste Complète',        icon: <List        fontSize="small" />, component: <ReclamationsList /> },
          { label: 'Classification IA',     icon: <Psychology  fontSize="small" />, component: <AIClassificationPanel /> },
          { label: 'Typologie & Conformité',icon: <Category    fontSize="small" />, component: <TypologieConformiteTab /> },
        ];

      case 'GESTIONNAIRE':
        return [
          { label: 'Ma Corbeille', icon: <Inbox fontSize="small" />, component: <GestionnaireCorbeille /> },
        ];

      case 'BUREAU_ORDRE':
        return [
          { label: 'Nouvelle Réclamation', icon: <Add       fontSize="small" />, component: <BOReclamationForm onSuccess={() => setActiveTab(1)} /> },
          { label: 'Dashboard BO',         icon: <Dashboard fontSize="small" />, component: <ReclamationDashboard /> },
          { label: 'Liste',                icon: <List      fontSize="small" />, component: <ReclamationsList /> },
        ];

      case 'CLIENT_SERVICE':
        return [
          { label: 'Dashboard',             icon: <Dashboard fontSize="small" />, component: <ReclamationDashboard /> },
          { label: 'Liste des Réclamations',icon: <List      fontSize="small" />, component: <ReclamationsList /> },
          { label: 'Recherche',             icon: <Search    fontSize="small" />, component: <ReclamationSearch /> },
        ];

      case 'SUPER_ADMIN':
        return [
          { label: 'Dashboard',             icon: <Dashboard  fontSize="small" />, component: <ReclamationDashboard /> },
          { label: 'Emails Outlook',        icon: <Email      fontSize="small" />, component: <OutlookEmailMonitoring /> },
          { label: 'Liste Complète',        icon: <List       fontSize="small" />, component: <ReclamationsList /> },
          { label: 'Classification IA',     icon: <Psychology fontSize="small" />, component: <AIClassificationPanel /> },
          { label: 'Typologie & Conformité',icon: <Category   fontSize="small" />, component: <TypologieConformiteTab /> },
        ];

      default:
        return [
          { label: 'Dashboard',             icon: <Dashboard fontSize="small" />, component: <ReclamationDashboard /> },
          { label: 'Liste des Réclamations',icon: <List      fontSize="small" />, component: <ReclamationsList /> },
        ];
    }
  };

  const tabs = getTabsForRole();

  // ── Role label chip ────────────────────────────────────────────────────────
  const roleLabel: Record<string, string> = {
    CHEF_EQUIPE:    "Chef d'Équipe",
    GESTIONNAIRE:   'Gestionnaire',
    BUREAU_ORDRE:   "Bureau d'Ordre",
    CLIENT_SERVICE: 'Service Client',
    SUPER_ADMIN:    'Super Admin',
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minHeight: '100vh', bgcolor: '#f4f7fb' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 2.5,
          background: `linear-gradient(135deg, ${NAVY} 0%, #2c5282 100%)`,
          color: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: '-0.3px', mb: 0.4 }}
          >
            Gestion des Réclamations
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Système de traitement et suivi des réclamations clients
          </Typography>
        </Box>

        {user?.role && (
          <Chip
            icon={<Person sx={{ color: '#fff !important', fontSize: 15 }} />}
            label={roleLabel[user.role] ?? user.role}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.35)',
              fontWeight: 600,
              fontSize: '0.75rem',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
        )}
      </Paper>

      {/* ── Real-time alerts ───────────────────────────────────────────────── */}
      <RealTimeAlerts />

      {/* ── Gestionnaire access notice ─────────────────────────────────────── */}
      {user?.role === 'GESTIONNAIRE' && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: '#fff8e1',
            border: '1px solid #ffcc80',
            borderLeft: `4px solid #e65100`,
            borderRadius: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 500 }}>
            ⚠️&nbsp; Accès Gestionnaire — Vous ne voyez que les réclamations qui vous sont assignées.
          </Typography>
        </Paper>
      )}

      {/* ── Main tab panel ─────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${BORDER}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Tab bar */}
        <Box
          sx={{
            bgcolor: NAVY_LIGHT,
            borderBottom: `1px solid #d0dff5`,
            px: { xs: 1, sm: 2 },
            overflowX: 'auto',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': {
                backgroundColor: NAVY,
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                minWidth: { xs: 'unset', sm: 140 },
                fontSize: '0.80rem',
                fontWeight: 600,
                textTransform: 'none',
                color: '#546e7a',
                padding: { xs: '10px 14px', sm: '12px 20px' },
                minHeight: 48,
                transition: 'color 0.2s',
                '&.Mui-selected': {
                  color: NAVY,
                },
                '&:hover:not(.Mui-selected)': {
                  color: NAVY,
                  bgcolor: 'rgba(30,58,95,0.06)',
                },
              },
              '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
          {tabs[activeTab]?.component}
        </Box>
      </Paper>
    </Box>
  );
};

export default ReclamationsModule;