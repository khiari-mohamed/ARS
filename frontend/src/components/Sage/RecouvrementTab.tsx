import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Checkbox, Chip, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Grid, Card, CardContent, Stack, TablePagination,
  Collapse, InputAdornment, Tooltip
} from '@mui/material';
import { CheckCircle, Cancel, FilterList, FilterListOff, Download as DownloadIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const token = () => localStorage.getItem('token');
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });

// ─── Shared cell styles ───────────────────────────────────────────────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.8,
  px: 1.5,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

interface OrdreVirement {
  id: string;
  numeroOrdre: string;
  montantTotal: number;
  recouvrementStatus: 'ATTENTE_RECOUVREMENT' | 'AUTORISE' | 'NON_AUTORISE';
  recouvrementRecouvre: boolean;
  dateRecouvrementRecouvre: string | null;
  recouvrementComment: string | null;
  statutGlobal: 'EN_ATTENTE' | 'VALIDE_INTERNE' | 'VALIDE_RECOUVREMENT' | 'BLOQUE_RECOUVREMENT' | 'COMPTABILISE' | 'INTEGRE_SAGE';
  client: { name?: string; nom?: string; modeRecuperation: string };
  createdAt: string;
  // ── Additional fields used by new filters (returned by backend) ──
  dateCreation?: string;
  recouvrementValidatedAt?: string | null;
  typeOperation?: string | null;       // REMBOURSEMENT | TPA
  utilisateurSante?: string | null;
  utilisateurFinance?: string | null;
  utilisateurSanteNom?: string | null;    // User name for Sante
  utilisateurFinanceNom?: string | null;  // User name for Finance
  codeAssure?: string | null;          // from contract / adherent
}

const RecouvrementTab: React.FC = () => {
  // ── Existing state (unchanged) ────────────────────────────────────────────
  const [ovs, setOvs] = useState<OrdreVirement[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ATTENTE_RECOUVREMENT' | 'AUTORISE' | 'NON_AUTORISE'>('ALL');
  const [recouvrementFilter, setRecouvrementFilter] = useState<'ALL' | 'RECOUVRE' | 'NON_RECOUVRE'>('ALL');
  const [statutGlobalFilter, setStatutGlobalFilter] = useState<'ALL' | 'EN_ATTENTE' | 'VALIDE_INTERNE' | 'VALIDE_RECOUVREMENT' | 'BLOQUE_RECOUVREMENT' | 'COMPTABILISE' | 'INTEGRE_SAGE'>('ALL');
  const [commentDialog, setCommentDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'AUTORISE' | 'NON_AUTORISE'>('AUTORISE');
  const { user } = useAuth();

  // ── New filter state ──────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numeroOrdre, setNumeroOrdre] = useState('');
  const [codeAssure, setCodeAssure] = useState('');
  const [dateOrdreFrom, setDateOrdreFrom] = useState('');
  const [dateOrdreTo, setDateOrdreTo] = useState('');
  const [dateValidationFrom, setDateValidationFrom] = useState('');
  const [dateValidationTo, setDateValidationTo] = useState('');
  const [typeOperation, setTypeOperation] = useState('');     // '' | 'REMBOURSEMENT' | 'TPA'
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const [utilisateur, setUtilisateur] = useState('');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  // ── Existing effects & handlers (unchanged) ───────────────────────────────
  useEffect(() => {
    loadOVs();
    loadTemplates();
    loadActiveTemplate();
  }, [filter, recouvrementFilter]);

  const loadOVs = async () => {
    setLoading(true);
    try {
      const url = filter !== 'ALL'
        ? `${API}/finance/recouvrement/all?status=${filter}`
        : `${API}/finance/recouvrement/all`;

      const res = await fetch(url, { headers: headers() });
      let data = await res.json();

      if (recouvrementFilter === 'RECOUVRE') {
        data = data.filter((ov: OrdreVirement) => ov.recouvrementRecouvre);
      } else if (recouvrementFilter === 'NON_RECOUVRE') {
        data = data.filter((ov: OrdreVirement) => !ov.recouvrementRecouvre);
      }

      setOvs(data);
      setPage(0);
    } catch (error) {
      console.error('Error loading OVs:', error);
    }
    setLoading(false);
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${API}/finance/sage/templates`, { headers: headers() });
      const data = await res.json();
      setTemplates(data.filter((t: any) => t.type === 'TXT'));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadActiveTemplate = async () => {
    try {
      const res = await fetch(`${API}/finance/sage/active-template?type=TXT`, { headers: headers() });
      const data = await res.json();
      setActiveTemplate(data);
    } catch (error) {
      console.error('Error loading active template:', error);
    }
  };

  const handleBulkValidation = async (status: 'AUTORISE' | 'NON_AUTORISE') => {
    if (selected.length === 0) return;
    setAction(status);
    setCommentDialog(true);
  };

  const confirmBulkValidation = async () => {
    try {
      await fetch(`${API}/finance/recouvrement/bulk-validate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ordreVirementIds: selected, status: action, comment }),
      });
      setCommentDialog(false);
      setComment('');
      setSelected([]);
      loadOVs();
    } catch (error) {
      console.error('Error validating:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AUTORISE':     return 'success';
      case 'NON_AUTORISE': return 'error';
      default:             return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AUTORISE':     return 'Autorisé';
      case 'NON_AUTORISE': return 'Non Autorisé';
      default:             return 'En Attente';
    }
  };

  const getStatutGlobalLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE':            return 'En attente';
      case 'VALIDE_INTERNE':        return 'Validé interne';
      case 'VALIDE_RECOUVREMENT':   return 'Validé recouvrement';
      case 'BLOQUE_RECOUVREMENT':   return 'Bloqué recouvrement';
      case 'COMPTABILISE':          return 'Comptabilisé';
      case 'INTEGRE_SAGE':          return 'Intégré dans Sage';
      default:                      return statut;
    }
  };

  const getStatutGlobalColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE':            return 'default';
      case 'VALIDE_INTERNE':        return 'info';
      case 'VALIDE_RECOUVREMENT':   return 'success';
      case 'BLOQUE_RECOUVREMENT':   return 'error';
      case 'COMPTABILISE':          return 'primary';
      case 'INTEGRE_SAGE':          return 'success';
      default:                      return 'default';
    }
  };

  // ── New: client-side advanced filtering ──────────────────────────────────
  const applyAdvancedFilters = (list: OrdreVirement[]): OrdreVirement[] => {
    let result = list;

    // Par numéro d'ordre
    if (numeroOrdre.trim()) {
      result = result.filter(ov =>
        ov.numeroOrdre?.toLowerCase().includes(numeroOrdre.trim().toLowerCase())
      );
    }

    // Par client (code assuré)
    if (codeAssure.trim()) {
      result = result.filter(ov =>
        ov.codeAssure?.toLowerCase().includes(codeAssure.trim().toLowerCase()) ||
        ov.client?.name?.toLowerCase().includes(codeAssure.trim().toLowerCase()) ||
        ov.client?.nom?.toLowerCase().includes(codeAssure.trim().toLowerCase())
      );
    }

    // Par période — date d'ordre
    if (dateOrdreFrom) {
      result = result.filter(ov => {
        const d = ov.dateCreation || ov.createdAt;
        return d && new Date(d) >= new Date(dateOrdreFrom);
      });
    }
    if (dateOrdreTo) {
      result = result.filter(ov => {
        const d = ov.dateCreation || ov.createdAt;
        return d && new Date(d) <= new Date(dateOrdreTo + 'T23:59:59');
      });
    }

    // Par période — date de validation
    if (dateValidationFrom) {
      result = result.filter(ov =>
        ov.recouvrementValidatedAt &&
        new Date(ov.recouvrementValidatedAt) >= new Date(dateValidationFrom)
      );
    }
    if (dateValidationTo) {
      result = result.filter(ov =>
        ov.recouvrementValidatedAt &&
        new Date(ov.recouvrementValidatedAt) <= new Date(dateValidationTo + 'T23:59:59')
      );
    }

    // Par type d'opération (REMBOURSEMENT / TPA)
    if (typeOperation) {
      result = result.filter(ov =>
        ov.typeOperation?.toUpperCase() === typeOperation.toUpperCase()
      );
    }

    // Par montant
    if (montantMin !== '') {
      result = result.filter(ov => ov.montantTotal >= parseFloat(montantMin));
    }
    if (montantMax !== '') {
      result = result.filter(ov => ov.montantTotal <= parseFloat(montantMax));
    }

    // Par service / utilisateur
    if (utilisateur.trim()) {
      const q = utilisateur.trim().toLowerCase();
      result = result.filter(ov =>
        ov.utilisateurSante?.toLowerCase().includes(q) ||
        ov.utilisateurFinance?.toLowerCase().includes(q)
      );
    }

    // Par statut global (6 étapes du workflow)
    if (statutGlobalFilter !== 'ALL') {
      result = result.filter(ov => ov.statutGlobal === statutGlobalFilter);
    }

    return result;
  };

  const resetAdvancedFilters = () => {
    setNumeroOrdre('');
    setCodeAssure('');
    setDateOrdreFrom('');
    setDateOrdreTo('');
    setDateValidationFrom('');
    setDateValidationTo('');
    setTypeOperation('');
    setMontantMin('');
    setMontantMax('');
    setUtilisateur('');
    setPage(0);
  };

  const hasAdvancedFilters = !!(
    numeroOrdre || codeAssure || dateOrdreFrom || dateOrdreTo ||
    dateValidationFrom || dateValidationTo || typeOperation ||
    montantMin || montantMax || utilisateur
  );

  const filteredOvs = applyAdvancedFilters(ovs);
  const pagedOvs = filteredOvs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ═══ Download Handlers ═══════════════════════════════════════════════════
  const handleDownloadSingle = async (ovId: string) => {
    setDownloading(ovId);
    try {
      const url = selectedTemplateId
        ? `${API}/finance/ordres-virement/${ovId}/sage-txt?templateId=${selectedTemplateId}`
        : `${API}/finance/ordres-virement/${ovId}/sage-txt`;
      
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `SAGE_${ovId}.TXT`;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      alert(`Erreur génération TXT Sage: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadBulk = async () => {
    if (selected.length === 0) {
      alert('Veuillez sélectionner au moins un ordre de virement');
      return;
    }
    setBulkDownloading(true);
    try {
      const body = selectedTemplateId
        ? { ordreVirementIds: selected, templateId: selectedTemplateId }
        : { ordreVirementIds: selected };
      
      const res = await fetch(`${API}/finance/sage-txt-batch`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `SAGE_BATCH_${Date.now()}.TXT`;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      alert(`Erreur génération TXT Sage groupé: ${error.message}`);
    } finally {
      setBulkDownloading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>

      {/* ── Primary Filter Panel ── */}
      <Box
        sx={{
          p: 2, mb: 2,
          bgcolor: '#f0f4ff',
          border: '1px solid #d0dff5',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Filtres &amp; Actions
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {hasAdvancedFilters && (
              <Chip
                label={`${[numeroOrdre, codeAssure, dateOrdreFrom, dateOrdreTo, dateValidationFrom, dateValidationTo, typeOperation, montantMin, montantMax, utilisateur].filter(Boolean).length} filtre(s) actif(s)`}
                size="small"
                color="primary"
                onDelete={resetAdvancedFilters}
                sx={{ fontWeight: 600, fontSize: '0.70rem' }}
              />
            )}
            <Button
              size="small"
              variant={showAdvanced ? 'contained' : 'outlined'}
              startIcon={showAdvanced ? <FilterListOff /> : <FilterList />}
              onClick={() => setShowAdvanced(v => !v)}
              sx={{
                fontWeight: 600, fontSize: '0.75rem',
                ...(showAdvanced ? { bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' } } : {}),
              }}
            >
              {showAdvanced ? 'Masquer' : 'Filtres avancés'}
            </Button>
          </Stack>
        </Box>

        {/* ── Basic filters (always visible) ── */}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut Recouvrement</InputLabel>
              <Select value={filter} onChange={(e) => setFilter(e.target.value as any)} label="Statut Recouvrement">
                <MenuItem value="ALL">Tous</MenuItem>
                <MenuItem value="ATTENTE_RECOUVREMENT">En Attente</MenuItem>
                <MenuItem value="AUTORISE">Autorisé</MenuItem>
                <MenuItem value="NON_AUTORISE">Non Autorisé</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Recouvré</InputLabel>
              <Select value={recouvrementFilter} onChange={(e) => setRecouvrementFilter(e.target.value as any)} label="Recouvré">
                <MenuItem value="ALL">Tous</MenuItem>
                <MenuItem value="RECOUVRE">Recouvré</MenuItem>
                <MenuItem value="NON_RECOUVRE">Non Recouvré</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut Global (Workflow)</InputLabel>
              <Select value={statutGlobalFilter} onChange={(e) => setStatutGlobalFilter(e.target.value as any)} label="Statut Global (Workflow)">
                <MenuItem value="ALL">Tous</MenuItem>
                <MenuItem value="EN_ATTENTE">En attente</MenuItem>
                <MenuItem value="VALIDE_INTERNE">Validé interne</MenuItem>
                <MenuItem value="VALIDE_RECOUVREMENT">Validé recouvrement</MenuItem>
                <MenuItem value="BLOQUE_RECOUVREMENT">Bloqué recouvrement</MenuItem>
                <MenuItem value="COMPTABILISE">Comptabilisé</MenuItem>
                <MenuItem value="INTEGRE_SAGE">Intégré dans Sage</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="N° Ordre"
              value={numeroOrdre}
              onChange={(e) => { setNumeroOrdre(e.target.value); setPage(0); }}
              placeholder="Rechercher par numéro..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            {selected.length > 0 ? (
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<CheckCircle />}
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleBulkValidation('AUTORISE')}
                  sx={{ fontWeight: 600, whiteSpace: 'nowrap', flex: 1 }}
                >
                  Autoriser ({selected.length})
                </Button>
                <Button
                  startIcon={<Cancel />}
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => handleBulkValidation('NON_AUTORISE')}
                  sx={{ fontWeight: 600, whiteSpace: 'nowrap', flex: 1 }}
                >
                  Rejeter ({selected.length})
                </Button>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={resetAdvancedFilters}
                disabled={!hasAdvancedFilters}
                sx={{ fontWeight: 600 }}
              >
                Réinitialiser
              </Button>
            )}
          </Grid>
          {selected.length > 0 && (
            <Grid item xs={12} md={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <InputLabel>Template Sage</InputLabel>
                  <Select
                    value={selectedTemplateId || ''}
                    onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                    label="Template Sage"
                  >
                    <MenuItem value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Défaut" size="small" color="primary" sx={{ fontSize: '0.65rem' }} />
                        {activeTemplate?.usingHardcoded ? 'Format hardcodé (entreprise)' : activeTemplate?.template?.name}
                      </Box>
                    </MenuItem>
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {t.isDefault && <Chip label="Défaut" size="small" color="success" sx={{ fontSize: '0.65rem' }} />}
                          {t.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  startIcon={bulkDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                  variant="contained"
                  size="small"
                  onClick={handleDownloadBulk}
                  disabled={bulkDownloading}
                  sx={{ 
                    fontWeight: 600, 
                    bgcolor: '#6A1B9A', 
                    '&:hover': { bgcolor: '#4A148C' },
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  {bulkDownloading ? 'Génération...' : `📊 Télécharger TXT Sage (${selected.length} OV)`}
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>

        {/* ── Advanced filters (collapsible) ── */}
        <Collapse in={showAdvanced}>
          <Box
            sx={{
              mt: 2, pt: 2,
              borderTop: '1px solid #d0dff5',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}
            >
              Filtres avancés
            </Typography>
            <Grid container spacing={1.5}>

              {/* Client / Code assuré */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Client / Code assuré"
                  value={codeAssure}
                  onChange={(e) => { setCodeAssure(e.target.value); setPage(0); }}
                  placeholder="Nom client ou code..."
                />
              </Grid>

              {/* Type opération */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type d'opération</InputLabel>
                  <Select
                    value={typeOperation}
                    onChange={(e) => { setTypeOperation(e.target.value); setPage(0); }}
                    label="Type d'opération"
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
                    <MenuItem value="TPA">TPA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Utilisateur / Service */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Service / Utilisateur"
                  value={utilisateur}
                  onChange={(e) => { setUtilisateur(e.target.value); setPage(0); }}
                  placeholder="Nom utilisateur..."
                />
              </Grid>

              {/* Montant min */}
              <Grid item xs={12} sm={6} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Montant min"
                  type="number"
                  value={montantMin}
                  onChange={(e) => { setMontantMin(e.target.value); setPage(0); }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><span style={{ fontSize: '0.70rem', color: '#90a4ae' }}>TND</span></InputAdornment> }}
                  inputProps={{ min: 0, step: 0.001 }}
                />
              </Grid>

              {/* Montant max */}
              <Grid item xs={12} sm={6} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Montant max"
                  type="number"
                  value={montantMax}
                  onChange={(e) => { setMontantMax(e.target.value); setPage(0); }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><span style={{ fontSize: '0.70rem', color: '#90a4ae' }}>TND</span></InputAdornment> }}
                  inputProps={{ min: 0, step: 0.001 }}
                />
              </Grid>

              {/* Séparateur visuel */}
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#546e7a', display: 'block', mb: 0.5 }}>
                  Période — Date d'ordre
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date d'ordre — Début"
                  type="date"
                  value={dateOrdreFrom}
                  onChange={(e) => { setDateOrdreFrom(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date d'ordre — Fin"
                  type="date"
                  value={dateOrdreTo}
                  onChange={(e) => { setDateOrdreTo(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#546e7a', display: 'block', mb: 0.5 }}>
                  Période — Date de validation recouvrement
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date validation — Début"
                  type="date"
                  value={dateValidationFrom}
                  onChange={(e) => { setDateValidationFrom(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date validation — Fin"
                  type="date"
                  value={dateValidationTo}
                  onChange={(e) => { setDateValidationTo(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

            </Grid>
          </Box>
        </Collapse>
      </Box>

      {/* ── Table Card ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
          <CircularProgress sx={{ color: '#6A1B9A' }} />
        </Box>
      ) : (
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 2 }}>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              pb={1.5}
              mb={2}
              sx={{ borderBottom: '2px solid #e8edf5' }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                Ordres de Virement — Recouvrement
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {filteredOvs.length} ordre(s)
                {filteredOvs.length !== ovs.length && ` (filtrés sur ${ovs.length})`}
                {selected.length > 0 && ` — ${selected.length} sélectionné(s)`}
              </Typography>
            </Box>

            {filteredOvs.length === 0 ? (
              <Box
                sx={{
                  p: 5, textAlign: 'center',
                  bgcolor: '#f8faff', borderRadius: 2,
                  border: '1px dashed #c5d4e8',
                }}
              >
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Aucun ordre de virement trouvé
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {hasAdvancedFilters ? 'Modifiez les filtres avancés' : 'Modifiez les filtres pour afficher les données'}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid #dde3ef',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { height: 6, width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ ...HEAD_CELL_SX, px: 1 }}>
                          <Checkbox
                            sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                            checked={selected.length === filteredOvs.length && filteredOvs.length > 0}
                            onChange={(e) => setSelected(e.target.checked ? filteredOvs.map(ov => ov.id) : [])}
                          />
                        </TableCell>
                        <TableCell sx={HEAD_CELL_SX}>N° Ordre</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Client</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Code Assuré</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Mode Récupération</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Type Opération</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Montant</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut Recouvrement</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Statut Global</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Recouvré</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Date Ordre</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Date Validation</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Date Recouvrement</TableCell>
                        <TableCell sx={HEAD_CELL_SX}>Utilisateur</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, minWidth: 160 }}>Commentaire</TableCell>
                        <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedOvs.map((ov, index) => (
                        <TableRow
                          key={ov.id}
                          sx={{
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                            '&:hover': { backgroundColor: '#e8f0fe' },
                            '&:last-child td': { borderBottom: 0 },
                          }}
                        >
                          <TableCell padding="checkbox" sx={{ ...BODY_CELL_SX, px: 1 }}>
                            <Checkbox
                              size="small"
                              checked={selected.includes(ov.id)}
                              onChange={(e) => setSelected(e.target.checked ? [...selected, ov.id] : selected.filter(id => id !== ov.id))}
                            />
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {ov.numeroOrdre}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {ov.client?.name || ov.client?.nom || '—'}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, fontFamily: 'monospace', fontSize: '0.75rem', color: '#37474f' }}>
                            {ov.codeAssure || '—'}
                          </TableCell>
                          <TableCell sx={BODY_CELL_SX}>
                            <Chip label={ov.client?.modeRecuperation || '—'} size="small" sx={{ fontSize: '0.70rem' }} />
                          </TableCell>
                          <TableCell sx={BODY_CELL_SX}>
                            {ov.typeOperation ? (
                              <Chip
                                label={ov.typeOperation}
                                size="small"
                                sx={{
                                  fontSize: '0.70rem', fontWeight: 700,
                                  bgcolor: ov.typeOperation === 'TPA' ? '#e3f2fd' : '#e8f5e9',
                                  color: ov.typeOperation === 'TPA' ? '#0d47a1' : '#1b5e20',
                                }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right', fontWeight: 600, color: '#1b5e20', whiteSpace: 'nowrap' }}>
                            {ov.montantTotal.toFixed(3)}{' '}
                            <span style={{ fontSize: '0.72rem', color: '#78909c' }}>TND</span>
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                            <Chip
                              label={getStatusLabel(ov.recouvrementStatus)}
                              color={getStatusColor(ov.recouvrementStatus) as any}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                            <Chip
                              label={getStatutGlobalLabel(ov.statutGlobal)}
                              color={getStatutGlobalColor(ov.statutGlobal) as any}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                            />
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                            <Chip
                              label={ov.recouvrementRecouvre ? 'Oui' : 'Non'}
                              color={ov.recouvrementRecouvre ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.70rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                            {(ov.dateCreation || ov.createdAt)
                              ? new Date(ov.dateCreation || ov.createdAt).toLocaleDateString('fr-FR')
                              : '—'}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                            {ov.recouvrementValidatedAt
                              ? new Date(ov.recouvrementValidatedAt).toLocaleDateString('fr-FR')
                              : '—'}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                            {ov.recouvrementValidatedAt
                              ? new Date(ov.recouvrementValidatedAt).toLocaleDateString('fr-FR')
                              : '—'}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#546e7a' }}>
                            {ov.utilisateurSanteNom || ov.utilisateurFinanceNom || '—'}
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, color: '#546e7a', maxWidth: 200 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                              {ov.recouvrementComment || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'center' }}>
                            <Tooltip 
                              title={
                                ov.recouvrementStatus === 'NON_AUTORISE' 
                                  ? '🔒 Bloqué par le recouvrement - Paiement non reçu. Seul le Super Admin peut débloquer.'
                                  : ov.recouvrementStatus === 'ATTENTE_RECOUVREMENT'
                                  ? '⏳ En attente de validation par le service recouvrement'
                                  : 'Télécharger le fichier TXT Sage'
                              }
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={downloading === ov.id ? <CircularProgress size={14} /> : <DownloadIcon />}
                                  onClick={() => handleDownloadSingle(ov.id)}
                                  disabled={downloading === ov.id || ov.recouvrementStatus === 'NON_AUTORISE' || ov.recouvrementStatus === 'ATTENTE_RECOUVREMENT'}
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    borderColor: ov.recouvrementStatus === 'AUTORISE' ? '#6A1B9A' : '#ccc',
                                    color: ov.recouvrementStatus === 'AUTORISE' ? '#6A1B9A' : '#999',
                                    '&:hover': ov.recouvrementStatus === 'AUTORISE' ? { borderColor: '#4A148C', bgcolor: 'rgba(106,27,154,0.04)' } : {},
                                    whiteSpace: 'nowrap',
                                    minWidth: 90
                                  }}
                                >
                                  {downloading === ov.id ? 'En cours...' : ov.recouvrementStatus === 'AUTORISE' ? 'TXT Sage' : '🔒 Bloqué'}
                                </Button>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box
                  sx={{
                    mt: 1.5,
                    bgcolor: '#f4f7fb',
                    borderRadius: 1.5,
                    border: '1px solid #e0e7ef',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <TablePagination
                    component="div"
                    count={filteredOvs.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    labelRowsPerPage="Lignes par page :"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Comment Dialog (unchanged) ── */}
      <Dialog
        open={commentDialog}
        onClose={() => setCommentDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid #e0e7ef',
            bgcolor: action === 'AUTORISE' ? '#e6f4ed' : '#fdecea',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
            {action === 'AUTORISE' ? '✅ Autoriser' : '❌ Rejeter'} {selected.length} ordre(s)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Saisir un commentaire..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', bgcolor: '#fafbfc', gap: 1 }}>
          <Button onClick={() => setCommentDialog(false)} variant="outlined">Annuler</Button>
          <Button
            onClick={confirmBulkValidation}
            variant="contained"
            color={action === 'AUTORISE' ? 'success' : 'error'}
            sx={{ fontWeight: 600 }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default RecouvrementTab;