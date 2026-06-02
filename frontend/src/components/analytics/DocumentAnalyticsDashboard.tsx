import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TablePagination,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  Description,
  Assignment,
  Warning,
  CheckCircle,
  Schedule,
  Error,
  FilterList,
  RestartAlt
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface DocumentTypeStats {
  type: string;
  displayName: string;
  total: number;
  aScanner: number;
  enCoursScan: number;
  scanFinalise: number;
  enCoursTraitement: number;
  traite: number;
  regle: number;
  slaApplicable: boolean;
  avgProcessingTime: number;
  slaBreaches: number;
}

interface AssignmentStats {
  documentId: string;
  documentType: string;
  reference: string;
  assignedTo: string;
  chefEquipe: string;
  gestionnaire: string;
  status: string;
  statut: string;
  assignedAt: Date;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE';
  slaColor: string;
  hasIssue: boolean;
}

/* ─────────────────────────────────────────
   Inline style tokens (matches app style guide)
───────────────────────────────────────── */
const S = {
  primaryDark: '#1e3a5f',
  primary: '#3e1f6d',
  primaryLight: '#e8f0fe',
  textPrimary: '#37474f',
  textSecondary: '#546e7a',
  textDisabled: '#78909c',
  textMuted: '#90a4ae',
  bgStripeEven: '#ffffff',
  bgStripeOdd: '#f4f7fb',
  bgPagination: '#f4f7fb',
  bgEmptyState: '#f8faff',
  bgFilterPanel: '#f0f4ff',
  borderTable: '#e0e7ef',
  borderDivider: '#e8edf5',
  borderFilter: '#d0dff5',
  borderDashed: '#c5d4e8',
  borderCard: 'rgba(0,0,0,0.08)',
  errorRed: '#f44336',
  exportGreen: '#2e7d32',
  scrollThumb: '#90a4be',
};

const cardBase = {
  elevation: 0,
  sx: {
    border: `1px solid ${S.borderCard}`,
    borderRadius: '8px',
    transition: 'box-shadow 0.2s',
    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
  },
};

const tableHeaderCell = {
  sx: {
    backgroundColor: `${S.primaryDark} !important`,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.70rem',
    letterSpacing: '0.4px',
    py: 1.2,
    px: 1.5,
    whiteSpace: 'nowrap',
    borderRight: `1px solid rgba(255,255,255,0.12)`,
    '&:last-child': { borderRight: 'none' },
  },
};

const tableBodyCell = {
  sx: {
    fontSize: '0.81rem',
    color: S.textPrimary,
    py: 0.7,
    px: 1.5,
    borderRight: `1px solid ${S.borderTable}`,
    '&:last-child': { borderRight: 'none' },
  },
};

/* ─────────────────────────────────────────
   Status badge helper (doc statut)
───────────────────────────────────────── */
const STATUT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  TRAITE:              { bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  REGLE:               { bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  EN_COURS_TRAITEMENT: { bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  EN_COURS:            { bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  SCAN_FINALISE:       { bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  EN_COURS_SCAN:       { bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  A_SCANNER:           { bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' },
};

const StatutBadge: React.FC<{ label: string }> = ({ label }) => {
  const style = STATUT_STYLES[label] ?? { bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.3,
        borderRadius: '4px',
        fontSize: '0.70rem',
        fontWeight: 700,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
};

/* ─────────────────────────────────────────
   SLA badge helper
───────────────────────────────────────── */
const SLA_CONFIG = {
  ON_TIME: { bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7', label: 'À temps',  icon: <CheckCircle sx={{ fontSize: 13, mr: 0.4 }} /> },
  AT_RISK: { bg: '#fff8e1', color: '#e65100', border: '#ffcc80', label: 'À risque', icon: <Schedule    sx={{ fontSize: 13, mr: 0.4 }} /> },
  OVERDUE: { bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a', label: 'En retard', icon: <Error       sx={{ fontSize: 13, mr: 0.4 }} /> },
};

const SlaBadge: React.FC<{ status: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | string }> = ({ status }) => {
  const cfg = SLA_CONFIG[status as keyof typeof SLA_CONFIG] ?? {
    bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc', label: status, icon: <Schedule sx={{ fontSize: 13, mr: 0.4 }} />,
  };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.3,
        borderRadius: '4px',
        fontSize: '0.70rem',
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </Box>
  );
};

/* ─────────────────────────────────────────
   Doc-type stat card accent colours
───────────────────────────────────────── */
const DOC_ACCENTS: Record<string, string> = {
  BULLETIN_SOIN:            '#2196f3',
  COMPLEMENT_INFORMATION:   '#00bcd4',
  ADHESION:                 '#4caf50',
  RECLAMATION:              '#f44336',
  CONTRAT_AVENANT:          '#9c27b0',
  DEMANDE_RESILIATION:      '#ff9800',
  CONVENTION_TIERS_PAYANT:  '#607d8b',
};

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
const DocumentAnalyticsDashboard: React.FC = () => {
  const [documentStats, setDocumentStats]     = useState<DocumentTypeStats[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedType, setSelectedType]       = useState<string>('ALL');
  const [hierarchyIssues, setHierarchyIssues] = useState<any[]>([]);
  const [filters, setFilters]                 = useState({ gestionnaire: '', chefEquipe: '', slaStatus: '' });
  const [faultyDataCount, setFaultyDataCount] = useState(0);
  const [gestionnaires, setGestionnaires]     = useState<any[]>([]);
  const [chefs, setChefs]                     = useState<any[]>([]);
  const [page, setPage]                       = useState(0);
  const [rowsPerPage, setRowsPerPage]         = useState(50);

  useEffect(() => {
    loadDocumentAnalytics();
    loadUserLists();
  }, [selectedType, filters.gestionnaire, filters.chefEquipe, filters.slaStatus]);

  /* ── data loaders (unchanged logic) ── */
  const loadUserLists = async () => {
    try {
      const response = await LocalAPI.get('/super-admin/team-workload');
      const users = response.data || [];
      console.log('👥 All users from team-workload:', users);
      console.log('👥 User roles:', users.map((u: any) => ({ name: u.name, role: u.role })));
      const gestionnairesList = users.filter((u: any) =>
        (u.role === 'GESTIONNAIRE' || u.role === 'GESTIONNAIRE_SENIOR') &&
        !u.name.startsWith('Équipe')
      );
      const chefsList = users.filter((u: any) => u.role === 'CHEF_EQUIPE');
      console.log('👥 Gestionnaires list:', gestionnairesList.map((g: any) => ({ name: g.name, role: g.role })));
      console.log('👥 Chefs list:', chefsList.map((c: any) => ({ name: c.name, role: c.role })));
      setGestionnaires(gestionnairesList);
      setChefs(chefsList);
    } catch (error) {
      console.error('Failed to load user lists:', error);
    }
  };

  const loadDocumentAnalytics = async () => {
    setLoading(true);
    try {
      console.log('📊 [loadDocumentAnalytics] Fetching with filters:', {
        documentType: selectedType !== 'ALL' ? selectedType : undefined,
        gestionnaire: filters.gestionnaire || undefined,
        chefEquipe: filters.chefEquipe || undefined,
        slaStatus: filters.slaStatus || undefined,
      });

      const [statsResponse, assignmentsResponse, hierarchyResponse] = await Promise.all([
        LocalAPI.get('/super-admin/documents/comprehensive-stats', {
          params: { documentType: selectedType !== 'ALL' ? selectedType : undefined },
        }),
        LocalAPI.get('/super-admin/document-assignments', {
          params: {
            documentType: selectedType !== 'ALL' ? selectedType : undefined,
            gestionnaire: filters.gestionnaire || undefined,
            chefEquipe: filters.chefEquipe || undefined,
            slaStatus: filters.slaStatus || undefined,
          },
        }),
        LocalAPI.get('/super-admin/hierarchy/validation'),
      ]);

      console.log('📊 Document Assignments:', assignmentsResponse.data);

      const allDocumentTypes = [
        { type: 'BULLETIN_SOIN',           displayName: 'Bulletins de soins',           slaApplicable: true  },
        { type: 'COMPLEMENT_INFORMATION',   displayName: "Compléments d'information",     slaApplicable: true  },
        { type: 'ADHESION',                 displayName: 'Adhésions',                     slaApplicable: true  },
        { type: 'RECLAMATION',              displayName: 'Réclamations',                  slaApplicable: true  },
        { type: 'CONTRAT_AVENANT',          displayName: 'Contrats/Avenants',             slaApplicable: false },
        { type: 'DEMANDE_RESILIATION',      displayName: 'Demandes de résiliation',       slaApplicable: false },
        { type: 'CONVENTION_TIERS_PAYANT',  displayName: 'Conventions tiers payant',      slaApplicable: false },
      ];

      console.log('📊 Stats Response:', statsResponse.data);

      const processedStats = allDocumentTypes.map(docType => {
        const stats = statsResponse.data[docType.type] || {};
        console.log(`Processing ${docType.type}:`, stats);

        if (filters.gestionnaire || filters.chefEquipe) {
          const filteredDocs = (assignmentsResponse.data.assignments || []).filter(
            (a: any) => a.documentType === docType.type
          );
          const statusCounts = filteredDocs.reduce((acc: any, doc: any) => {
            const status = doc.statut || 'UPLOADED';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          return {
            ...docType,
            total:              filteredDocs.length,
            aScanner:           statusCounts['UPLOADED'] || 0,
            enCoursScan:        statusCounts['EN_COURS'] || 0,
            scanFinalise:       statusCounts['SCANNE'] || 0,
            enCoursTraitement:  (statusCounts['EN_COURS'] || 0) + (statusCounts['SCANNE'] || 0),
            traite:             statusCounts['TRAITE'] || 0,
            regle:              statusCounts['TRAITE'] || 0,
            avgProcessingTime:  stats.avgProcessingTime || 0,
            slaBreaches:        docType.slaApplicable
              ? filteredDocs.filter((a: any) => a.slaStatus === 'OVERDUE').length
              : 0,
          };
        }

        return {
          ...docType,
          total:             stats.total || 0,
          aScanner:          stats.A_SCANNER || 0,
          enCoursScan:       stats.EN_COURS_SCAN || 0,
          scanFinalise:      stats.SCAN_FINALISE || 0,
          enCoursTraitement: stats.EN_COURS_TRAITEMENT || 0,
          traite:            stats.TRAITE || 0,
          regle:             stats.REGLE || 0,
          avgProcessingTime: stats.avgProcessingTime || 0,
          slaBreaches:       docType.slaApplicable ? (stats.slaBreaches || 0) : 0,
        };
      });

      console.log('📊 Processed Stats (with filters applied):', processedStats);
      setDocumentStats(processedStats);
      setAssignmentStats(assignmentsResponse.data.assignments || []);
      setFaultyDataCount(assignmentsResponse.data.withIssues || 0);
      setHierarchyIssues(hierarchyResponse.data.issues || []);
    } catch (error: any) {
      console.error('Failed to load document analytics:', error);
      console.error('Error details:', error.response?.data || error.message);
      setDocumentStats([]);
      setAssignmentStats([]);
      setHierarchyIssues([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── helpers (unchanged logic) ── */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A_SCANNER':          return 'default';
      case 'EN_COURS_SCAN':      return 'info';
      case 'SCAN_FINALISE':      return 'primary';
      case 'EN_COURS_TRAITEMENT': return 'warning';
      case 'TRAITE':             return 'success';
      case 'REGLE':              return 'success';
      default:                   return 'default';
    }
  };

  const getSlaStatusIcon = (status: string) => {
    switch (status) {
      case 'ON_TIME': return <CheckCircle color="success" />;
      case 'AT_RISK': return <Schedule color="warning" />;
      case 'OVERDUE': return <Error color="error" />;
      default:        return <Schedule />;
    }
  };

  const calculateCompletionRate = (stats: DocumentTypeStats) => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.traite + stats.regle) / stats.total) * 100);
  };

  /* ── filter helper reused in table (unchanged logic) ── */
  const applyTableFilters = (assignment: any) => {
    if (!filters.slaStatus && !filters.gestionnaire && !filters.chefEquipe) {
      if (assignment.gestionnaire === 'NON ASSIGNÉ' && assignment.chefEquipe === 'AUCUN CHEF') return false;
    }
    if (filters.slaStatus    && assignment.slaStatus    !== filters.slaStatus)    return false;
    if (filters.gestionnaire && assignment.gestionnaire !== filters.gestionnaire) return false;
    if (filters.chefEquipe   && assignment.chefEquipe   !== filters.chefEquipe)   return false;
    return true;
  };

  const filteredAssignments = assignmentStats.filter(applyTableFilters);

  /* ── loading state ── */
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        gap={2}
      >
        <LinearProgress
          sx={{
            width: '50%',
            height: 4,
            borderRadius: 2,
            backgroundColor: S.primaryLight,
            '& .MuiLinearProgress-bar': { backgroundColor: S.primaryDark },
          }}
        />
        <Typography variant="body2" sx={{ color: S.textSecondary, fontSize: '0.80rem' }}>
          Chargement des analytics…
        </Typography>
      </Box>
    );
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <Box sx={{ p: 3, backgroundColor: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Page header ── */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={1.5}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Description sx={{ color: S.primaryDark, fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: S.primaryDark,
              letterSpacing: '-0.5px',
              fontSize: { xs: '1.1rem', sm: '1.4rem' },
            }}
          >
            Analytics Documents — Périmètre Complet ARS
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: '6px',
            border: `1px solid #90caf9`,
            backgroundColor: '#e3f2fd',
            color: '#0d47a1',
            fontSize: '0.72rem',
            fontWeight: 600,
            whiteSpace: { xs: 'normal', sm: 'nowrap' },
          }}
        >
          Règle SLA: Date Limite = Date Réception + Délai Contrat
        </Box>
      </Box>

      {/* ── SLA rules info ── */}
      <Alert
        severity="info"
        sx={{
          mb: 2,
          borderRadius: '8px',
          fontSize: '0.80rem',
          '& .MuiAlert-message': { fontSize: '0.80rem' },
        }}
      >
        <strong>Règles SLA (unifiées avec Bordereaux):</strong>&nbsp;
        🟢 Respecté (≤80% délai) &nbsp;|&nbsp; 🟠 À risque (80–100%) &nbsp;|&nbsp; 🔴 En retard (&gt;100%)
      </Alert>

      {/* ── Faulty data alert ── */}
      {faultyDataCount > 0 && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: '8px',
            borderLeft: `4px solid ${S.errorRed}`,
            '& .MuiAlert-message': { fontSize: '0.80rem' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
            ❌ Données défaillantes détectées
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.80rem' }}>
            {faultyDataCount} document(s) avec gestionnaire ou chef d'équipe manquant
          </Typography>
        </Alert>
      )}

      {/* ── Hierarchy issues alert ── */}
      {hierarchyIssues.length > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: '8px',
            '& .MuiAlert-message': { fontSize: '0.80rem' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
            ⚠️ Problèmes de hiérarchie détectés
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.80rem' }}>
            {hierarchyIssues.length} gestionnaire(s) sans chef d'équipe assigné
          </Typography>
        </Alert>
      )}

      {/* ── Filter panel ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: `1px solid ${S.borderFilter}`,
          borderRadius: '8px',
          backgroundColor: S.bgFilterPanel,
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>

          {/* Filter header */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FilterList sx={{ fontSize: 16, color: S.primaryDark }} />
            <Typography
              sx={{
                fontSize: '0.80rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: S.primaryDark,
              }}
            >
              Filtres Dynamiques
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Type de document */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl
                size="small"
                fullWidth
                sx={{ backgroundColor: '#fff', borderRadius: '6px' }}
              >
                <InputLabel sx={{ fontSize: '0.80rem' }}>Type de document</InputLabel>
                <Select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  label="Type de document"
                  sx={{ fontSize: '0.80rem' }}
                >
                  <MenuItem value="ALL" sx={{ fontSize: '0.80rem' }}>Tous les types</MenuItem>
                  <MenuItem value="BULLETIN_SOIN" sx={{ fontSize: '0.80rem' }}>Bulletins de soins</MenuItem>
                  <MenuItem value="COMPLEMENT_INFORMATION" sx={{ fontSize: '0.80rem' }}>Compléments</MenuItem>
                  <MenuItem value="ADHESION" sx={{ fontSize: '0.80rem' }}>Adhésions</MenuItem>
                  <MenuItem value="RECLAMATION" sx={{ fontSize: '0.80rem' }}>Réclamations</MenuItem>
                  <MenuItem value="CONTRAT_AVENANT" sx={{ fontSize: '0.80rem' }}>Contrats</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Gestionnaire */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: S.textSecondary,
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Gestionnaire
              </Typography>
              <Autocomplete
                value={filters.gestionnaire}
                onChange={(event, newValue) =>
                  setFilters({ ...filters, gestionnaire: newValue || '' })
                }
                options={['', 'NON ASSIGNÉ', ...gestionnaires.map(g => g.name)]}
                getOptionLabel={(option) => {
                  if (option === '') return 'Tous';
                  if (option === 'NON ASSIGNÉ') return '❌ Non assigné';
                  return option;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Tous les gestionnaires"
                    size="small"
                    sx={{ backgroundColor: '#fff', borderRadius: '6px', '& input': { fontSize: '0.80rem' } }}
                  />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
              />
            </Grid>

            {/* Chef d'équipe */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: S.textSecondary,
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Chef d'équipe
              </Typography>
              <Autocomplete
                value={filters.chefEquipe}
                onChange={(event, newValue) =>
                  setFilters({ ...filters, chefEquipe: newValue || '' })
                }
                options={['', 'AUCUN CHEF', ...chefs.map(c => c.name)]}
                getOptionLabel={(option) => {
                  if (option === '') return 'Tous';
                  if (option === 'AUCUN CHEF') return '❌ Aucun chef';
                  return option;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Tous les chefs d'équipe"
                    size="small"
                    sx={{ backgroundColor: '#fff', borderRadius: '6px', '& input': { fontSize: '0.80rem' } }}
                  />
                )}
                size="small"
                fullWidth
                clearOnEscape
                disableClearable={false}
              />
            </Grid>

            {/* Statut SLA */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl
                size="small"
                fullWidth
                sx={{ backgroundColor: '#fff', borderRadius: '6px' }}
              >
                <InputLabel sx={{ fontSize: '0.80rem' }}>Statut SLA</InputLabel>
                <Select
                  value={filters.slaStatus}
                  onChange={(e) => setFilters({ ...filters, slaStatus: e.target.value })}
                  label="Statut SLA"
                  sx={{ fontSize: '0.80rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.80rem' }}>Tous</MenuItem>
                  <MenuItem value="ON_TIME" sx={{ fontSize: '0.80rem' }}>🟢 À temps</MenuItem>
                  <MenuItem value="AT_RISK"  sx={{ fontSize: '0.80rem' }}>🟠 À risque</MenuItem>
                  <MenuItem value="OVERDUE" sx={{ fontSize: '0.80rem' }}>🔴 En retard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Reset button */}
          <Box mt={2}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAlt sx={{ fontSize: 15 }} />}
              onClick={() => {
                setFilters({ gestionnaire: '', chefEquipe: '', slaStatus: '' });
                setSelectedType('ALL');
                setPage(0);
              }}
              sx={{
                fontSize: '0.78rem',
                borderColor: S.primaryDark,
                color: S.primaryDark,
                textTransform: 'none',
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: S.primaryDark,
                  color: '#fff',
                },
              }}
            >
              Réinitialiser
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Document type stat cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {documentStats
          .filter(stats => selectedType === 'ALL' || stats.type === selectedType)
          .map((stats) => {
            const accent  = DOC_ACCENTS[stats.type] ?? '#607d8b';
            const rate    = calculateCompletionRate(stats);
            return (
              <Grid item xs={12} sm={6} lg={4} key={stats.type}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${S.borderCard}`,
                    borderLeft: `4px solid ${accent}`,
                    borderRadius: '8px',
                    height: '100%',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
                  }}
                >
                  <CardContent sx={{ pb: '12px !important' }}>

                    {/* Card header */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1.5}
                    >
                      <Typography
                        variant="h6"
                        noWrap
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: S.primaryDark,
                          flex: 1,
                          mr: 1,
                        }}
                      >
                        {stats.displayName}
                      </Typography>
                      <Box display="flex" gap={0.5} flexShrink={0}>
                        {!stats.slaApplicable && (
                          <Box
                            component="span"
                            sx={{
                              px: 0.8,
                              py: 0.2,
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: '#f5f5f5',
                              color: S.textMuted,
                              border: `1px solid #cfd8dc`,
                            }}
                          >
                            Pas de SLA
                          </Box>
                        )}
                        {stats.slaApplicable && stats.slaBreaches > 0 && (
                          <Box
                            component="span"
                            sx={{
                              px: 0.8,
                              py: 0.2,
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: '#fdecea',
                              color: '#b71c1c',
                              border: '1px solid #ef9a9a',
                            }}
                          >
                            {stats.slaBreaches} SLA
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Total count */}
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: accent,
                        lineHeight: 1.1,
                        mb: 1.2,
                      }}
                    >
                      {stats.total}
                    </Typography>

                    {/* Completion rate */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box display="flex" justifyContent="space-between" mb={0.4}>
                        <Typography sx={{ fontSize: '0.72rem', color: S.textSecondary }}>
                          Taux de completion
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: accent }}>
                          {rate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={rate}
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: `${accent}22`,
                          '& .MuiLinearProgress-bar': { backgroundColor: accent, borderRadius: 3 },
                        }}
                      />
                    </Box>

                    {/* Status breakdown grid */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px 12px',
                        pt: 1,
                        borderTop: `1px solid ${S.borderDivider}`,
                      }}
                    >
                      {[
                        { label: 'À scanner',       value: stats.aScanner },
                        { label: 'En cours scan',   value: stats.enCoursScan },
                        { label: 'Scan finalisé',   value: stats.scanFinalise },
                        { label: 'En traitement',   value: stats.enCoursTraitement },
                        { label: 'Traité',          value: stats.traite },
                        { label: 'Réglé',           value: stats.regle, highlight: true },
                      ].map(({ label, value, highlight }) => (
                        <Box key={label}>
                          <Typography sx={{ fontSize: '0.70rem', color: S.textDisabled }}>
                            {label}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: highlight ? '#1b5e20' : S.textPrimary,
                            }}
                          >
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Avg processing time */}
                    {stats.slaApplicable && (
                      <Box
                        sx={{
                          mt: 1.5,
                          pt: 1,
                          borderTop: `1px solid ${S.borderDivider}`,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.72rem', color: S.textDisabled }}>
                          Temps moyen:{' '}
                          <span style={{ fontWeight: 600, color: S.textSecondary }}>
                            {stats.avgProcessingTime.toFixed(1)}h
                          </span>
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
      </Grid>

      {/* ── Document-level assignment table ── */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${S.borderCard}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Table card header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${S.borderDivider}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
            backgroundColor: '#fff',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment sx={{ fontSize: 18, color: S.primaryDark }} />
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: S.primaryDark,
              }}
            >
              Affectations au Niveau Document
            </Typography>
          </Box>
          <Box
            component="span"
            sx={{
              px: 1.2,
              py: 0.35,
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: `1px solid #90caf9`,
              backgroundColor: '#e3f2fd',
              color: '#0d47a1',
              whiteSpace: 'nowrap',
            }}
          >
            {filteredAssignments.length} documents trouvés
          </Box>
        </Box>

        {/* Table */}
        <TableContainer
          sx={{
            maxHeight: 580,
            overflowX: 'auto',
            '&::-webkit-scrollbar':       { height: 6, width: 6 },
            '&::-webkit-scrollbar-track': { backgroundColor: S.bgFilterPanel },
            '&::-webkit-scrollbar-thumb': { backgroundColor: S.scrollThumb, borderRadius: 3 },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  'Référence',
                  'Type Document',
                  'Gestionnaire / Senior',
                  "Chef d'Équipe",
                  'Statut',
                  'SLA',
                  'Affecté le',
                ].map((col) => (
                  <TableCell key={col} {...tableHeaderCell}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssignments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((assignment: any, index) => {
                  const hasFaultyData = assignment.hasIssue;
                  const isEven        = index % 2 === 0;
                  return (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: hasFaultyData
                          ? '#fff5f5'
                          : isEven
                          ? S.bgStripeEven
                          : S.bgStripeOdd,
                        '&:hover': {
                          backgroundColor: hasFaultyData ? '#fdecea' : S.primaryLight,
                        },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Reference */}
                      <TableCell {...tableBodyCell}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {hasFaultyData && (
                            <Warning
                              sx={{ fontSize: 14, color: S.errorRed, flexShrink: 0 }}
                            />
                          )}
                          <Typography
                            sx={{
                              fontSize: '0.81rem',
                              fontWeight: 600,
                              color: S.textPrimary,
                            }}
                          >
                            {assignment.reference}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Document type */}
                      <TableCell {...tableBodyCell}>
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '4px',
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            backgroundColor: `${DOC_ACCENTS[assignment.documentType] ?? '#607d8b'}18`,
                            color: DOC_ACCENTS[assignment.documentType] ?? '#607d8b',
                            border: `1px solid ${DOC_ACCENTS[assignment.documentType] ?? '#607d8b'}44`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {assignment.documentType}
                        </Box>
                      </TableCell>

                      {/* Gestionnaire */}
                      <TableCell {...tableBodyCell}>
                        {assignment.gestionnaire === 'NON ASSIGNÉ' ? (
                          <Box
                            component="span"
                            sx={{
                              px: 0.8,
                              py: 0.25,
                              borderRadius: '4px',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              backgroundColor: '#fdecea',
                              color: '#b71c1c',
                              border: '1px solid #ef9a9a',
                            }}
                          >
                            NON ASSIGNÉ
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '0.81rem', color: S.textPrimary }}>
                            {assignment.gestionnaire}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Chef d'équipe */}
                      <TableCell {...tableBodyCell}>
                        {assignment.chefEquipe === 'AUCUN CHEF' ? (
                          <Box
                            component="span"
                            sx={{
                              px: 0.8,
                              py: 0.25,
                              borderRadius: '4px',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              backgroundColor: '#fdecea',
                              color: '#b71c1c',
                              border: '1px solid #ef9a9a',
                            }}
                          >
                            AUCUN CHEF
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '0.81rem', color: S.textSecondary }}>
                            {assignment.chefEquipe}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Statut */}
                      <TableCell {...tableBodyCell}>
                        <StatutBadge label={assignment.statut} />
                      </TableCell>

                      {/* SLA */}
                      <TableCell {...tableBodyCell}>
                        <SlaBadge status={assignment.slaStatus} />
                      </TableCell>

                      {/* Assigned at */}
                      <TableCell {...tableBodyCell}>
                        <Typography sx={{ fontSize: '0.78rem', color: S.textSecondary }}>
                          {assignment.assignedAt
                            ? new Date(assignment.assignedAt).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Empty state */}
        {filteredAssignments.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              px: 3,
              backgroundColor: S.bgEmptyState,
              border: `1px dashed ${S.borderDashed}`,
              borderRadius: '8px',
              m: 2,
            }}
          >
            <Typography
              sx={{ fontSize: '0.85rem', color: S.textSecondary, mb: 0.5 }}
            >
              Aucune affectation au niveau document trouvée
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: S.errorRed }}>
              ⚠️ L'affectation doit se faire au niveau de chaque élément du bordereau
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {filteredAssignments.length > 0 && (
          <Box
            sx={{
              backgroundColor: S.bgPagination,
              borderTop: `1px solid ${S.borderTable}`,
              px: 1,
            }}
          >
            <TablePagination
              component="div"
              count={filteredAssignments.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Lignes par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: S.textSecondary,
                },
                '& .MuiTablePagination-select': { fontSize: '0.75rem' },
              }}
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default DocumentAnalyticsDashboard;