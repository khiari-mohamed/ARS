// src/components/GED/GEDModule.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Typography,
  Chip,
} from '@mui/material';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import GEDDashboardTab from './GEDDashboardTab';
import DocumentIngestionTab from './DocumentIngestionTab';
import CorbeilleTab from './CorbeilleTab';
import ReportsTab from './ReportsTab';
import GEDMobileView from './GEDMobileView';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabLabel = 'Dashboard' | 'Ingestion' | 'Corbeille' | 'Rapports';

interface TabDef {
  label: TabLabel;
  roles: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Fix: renamed from allTabs to TAB_DEFINITIONS to avoid shadowing the `tab` state variable
const TAB_DEFINITIONS: TabDef[] = [
  {
    label: 'Dashboard',
    roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE', 'SCAN_TEAM'],
  },
  {
    label: 'Ingestion',
    roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'SCAN_TEAM'],
  },
  {
    label: 'Corbeille',
    roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'],
  },
  {
    label: 'Rapports',
    roles: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Single source of truth for tab → component mapping — used by both mobile and desktop
const renderTabContent = (label: TabLabel): React.ReactElement | null => {
  switch (label) {
    case 'Dashboard':  return <GEDDashboardTab />;
    case 'Ingestion':  return <DocumentIngestionTab />;
    case 'Corbeille':  return <CorbeilleTab />;
    case 'Rapports':   return <ReportsTab />;
    default:           return null;
  }
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const sx = {
  root: {
    p: { xs: 1.5, sm: 2, md: 3 },
    minHeight: '100vh',
    background: '#f4f7fb',
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2e7d32 100%)',
    color: '#fff',
    px: { xs: 2, md: 3 },
    py: { xs: 2, md: 2.5 },
    mb: 2,
    borderRadius: 2,
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: 2,
    flexDirection: { xs: 'column', sm: 'row' },
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: { xs: '1.1rem', md: '1.4rem' },
    letterSpacing: 0.3,
    lineHeight: 1.2,
  },
  headerSub: {
    opacity: 0.82,
    fontSize: { xs: '0.75rem', md: '0.82rem' },
    mt: 0.25,
  },
  desktopPaper: {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 2,
    boxShadow: 'none',
    overflow: 'hidden',
  },
  tabs: {
    borderBottom: '2px solid #e0e7ef',
    px: 2,
    '& .MuiTab-root': {
      fontWeight: 600,
      fontSize: '0.80rem',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: '#546e7a',
      minHeight: 48,
      '&.Mui-selected': { color: '#1e3a5f' },
    },
    '& .MuiTabs-indicator': {
      background: 'linear-gradient(90deg, #1e3a5f, #2e7d32)',
      height: 3,
      borderRadius: '3px 3px 0 0',
    },
  },
  tabContent: {
    p: { xs: 2, md: 3 },
    background: '#f4f7fb',
  },
  roleBanner: (variant: 'warning' | 'info') => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 2,
    py: 1.25,
    mx: 2,
    mt: 2,
    borderRadius: 1.5,
    border: `1px solid ${variant === 'warning' ? '#ffcc80' : '#90caf9'}`,
    borderLeft: `4px solid ${variant === 'warning' ? '#e65100' : '#0d47a1'}`,
    background: variant === 'warning' ? '#fff8e1' : '#e3f2fd',
  }),
  roleBannerText: (variant: 'warning' | 'info') => ({
    fontSize: '0.78rem',
    fontWeight: 600,
    color: variant === 'warning' ? '#e65100' : '#0d47a1',
  }),
  mobilePaper: {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 2,
    boxShadow: 'none',
    mt: 2,
    overflow: 'hidden',
  },
  mobileTitleBar: {
    background: '#1e3a5f',
    px: 2,
    py: 1.25,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const GEDModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Fix: memoized so it doesn't recalculate on every render
  const availableTabs = useMemo(
    () => TAB_DEFINITIONS.filter((t) => !user?.role || t.roles.includes(user.role)),
    [user?.role],
  );

  const currentLabel = availableTabs[activeTab]?.label;

  // Role banner config
  const roleBanner = useMemo(() => {
    if (user?.role === 'GESTIONNAIRE') {
      return {
        variant: 'warning' as const,
        message: 'Accès GED limité — vous ne consultez que les documents liés à vos dossiers assignés.',
      };
    }
    if (user?.role === 'RESPONSABLE_DEPARTEMENT') {
      return {
        variant: 'info' as const,
        message: 'Mode consultation — accès à tous les modules GED en lecture seule.',
      };
    }
    return null;
  }, [user?.role]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={sx.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={sx.header}>
        <Box sx={sx.headerIcon}>
          <FolderSpecialIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Box>
        <Box flex={1}>
          <Typography sx={sx.headerTitle}>
            GED — Gestion Électronique des Documents
          </Typography>
          <Typography sx={sx.headerSub}>
            Système centralisé de gestion documentaire et workflow
          </Typography>
        </Box>
        {user?.role && (
          <Chip
            label={user.role.replace(/_/g, ' ')}
            size="small"
            sx={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.68rem',
              border: '1px solid rgba(255,255,255,0.3)',
              letterSpacing: 0.5,
              alignSelf: { xs: 'flex-start', sm: 'center' },
            }}
          />
        )}
      </Box>

      {/* ── Mobile Layout ──────────────────────────────────────────────── */}
      {isMobile && (
        <>
          <GEDMobileView onTabChange={setActiveTab} />

          <Paper sx={sx.mobilePaper}>
            {currentLabel && (
              <Box sx={sx.mobileTitleBar}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {currentLabel}
                </Typography>
              </Box>
            )}
            <Box sx={sx.tabContent}>
              {/* Fix: mobile now uses the same renderTabContent helper as desktop
                  Previously used hardcoded indices (tab === 0/1/2/3) which broke
                  for role-filtered users whose tab indices were shifted */}
              {currentLabel && renderTabContent(currentLabel)}
            </Box>
          </Paper>
        </>
      )}

      {/* ── Desktop Layout ─────────────────────────────────────────────── */}
      {!isMobile && (
        <Paper sx={sx.desktopPaper}>
          {/* Role banner */}
          {roleBanner && (
            <Box sx={sx.roleBanner(roleBanner.variant)}>
              <Typography sx={sx.roleBannerText(roleBanner.variant)}>
                {roleBanner.variant === 'warning' ? '⚠️' : 'ℹ️'} {roleBanner.message}
              </Typography>
            </Box>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v: number) => setActiveTab(v)}
            sx={sx.tabs}
            variant="scrollable"
            scrollButtons="auto"
          >
            {availableTabs.map((t) => (
              <Tab key={t.label} label={t.label} />
            ))}
          </Tabs>

          {/* Tab content */}
          <Box sx={sx.tabContent}>
            {currentLabel && renderTabContent(currentLabel)}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GEDModule;