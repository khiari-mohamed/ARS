import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete,
  Checkbox, TablePagination, LinearProgress, Tooltip, TableContainer
} from '@mui/material';
import { SwapHoriz, Info } from '@mui/icons-material';
import {
  fetchEligibleAssignees, fetchDossiers, reassignDossiers,
  EligibleAssignee, DossierBS, AssignmentEntityType, AssignmentDocumentType
} from './../services/bsAssignmentService';
import { useAuth } from '../contexts/AuthContext';

// ─── design tokens (shared design system) ──────────────────────────────────
const T = {
  navy:       '#1e3a5f',
  navyLight:  '#e8f0fe',
  text:       '#37474f',
  textSec:    '#546e7a',
  textMuted:  '#78909c',
  border:     '#e0e7ef',
  borderCard: 'rgba(0,0,0,0.08)',
  stripe:     '#f4f7fb',
  success:    { bg: '#e6f4ed', text: '#1b6b3a', border: '#a5d6a7' },
  warning:    { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  error:      { bg: '#fdecea', text: '#b71c1c', border: '#ef9a9a' },
  info:       { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9' },
  cards: {
    blue:   '#2196f3',
    cyan:   '#00bcd4',
    green:  '#4caf50',
    red:    '#f44336',
    purple: '#9c27b0',
  },
};

const cardBase = {
  elevation: 0,
  sx: {
    border: `1px solid ${T.borderCard}`,
    borderRadius: '8px',
    transition: 'box-shadow .2s',
    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
  },
};

const tableHeaderSx = {
  bgcolor: T.navy,
  '& .MuiTableCell-head': {
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.70rem',
    letterSpacing: '0.4px',
    borderRight: `1px solid rgba(255,255,255,0.10)`,
    py: 1.2,
    px: 1.5,
    '&:last-child': { borderRight: 'none' },
  },
};

const tableBodySx = {
  '& .MuiTableRow-root': {
    '&:nth-of-type(odd)':  { bgcolor: '#fff' },
    '&:nth-of-type(even)': { bgcolor: T.stripe },
    '&:hover':             { bgcolor: T.navyLight },
    transition: 'background-color .15s',
  },
  '& .MuiTableCell-body': {
    fontSize: '0.81rem',
    color: T.text,
    borderRight: `1px solid ${T.border}`,
    py: 0.9,
    px: 1.5,
    '&:last-child': { borderRight: 'none' },
  },
};

const outlinedBtnSx = {
  borderColor: T.navy,
  color: T.navy,
  fontWeight: 600,
  fontSize: '0.78rem',
  '&:hover': { bgcolor: T.navy, color: '#fff', borderColor: T.navy },
};

const containedBtnSx = {
  bgcolor: T.navy,
  fontWeight: 600,
  fontSize: '0.78rem',
  '&:hover': { bgcolor: '#16304f' },
};

const dialogTitleSx = {
  bgcolor: T.stripe,
  borderBottom: `1px solid ${T.border}`,
  fontWeight: 700,
  color: T.navy,
  fontSize: '1rem',
};

const sectionHeadingTitleSx = { fontWeight: 700, color: T.navy, fontSize: '1rem', lineHeight: 1.3 };
const sectionHeadingSubSx = { color: T.textSec, fontSize: '0.78rem', mt: 0.2 };

const alertSx = (kind: 'info' | 'success' | 'warning' | 'error') => ({
  bgcolor: T[kind].bg,
  color: T[kind].text,
  border: `1px solid ${T[kind].border}`,
  '& .MuiAlert-icon': { color: T[kind].text },
});

const ROLE_LABEL: Record<string, string> = {
  CHEF_EQUIPE: "Chef d'Équipe",
  GESTIONNAIRE_SENIOR: 'Gestionnaire Senior',
  GESTIONNAIRE: 'Gestionnaire'
};

const ROLE_COLOR: Record<string, string> = {
  CHEF_EQUIPE: '#0d47a1',
  GESTIONNAIRE_SENIOR: '#1b6b3a',
  GESTIONNAIRE: '#546e7a'
};

const RoleChip: React.FC<{ role: string }> = ({ role }) => (
  <Box
    component="span"
    sx={{
      px: 1, py: 0.25, borderRadius: '4px', fontSize: '0.70rem', fontWeight: 700,
      color: ROLE_COLOR[role] || '#546e7a',
      backgroundColor: `${ROLE_COLOR[role] || '#546e7a'}18`,
      border: `1px solid ${ROLE_COLOR[role] || '#546e7a'}44`,
      whiteSpace: 'nowrap'
    }}
  >
    {ROLE_LABEL[role] || role}
  </Box>
);

const BSReassignmentManager: React.FC = () => {
  const { user } = useAuth() as { user?: { id: string; fullName?: string } };

  const [dossiers, setDossiers] = useState<DossierBS[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);

  const [assignees, setAssignees] = useState<EligibleAssignee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const [filterOwnerRole, setFilterOwnerRole] = useState('');
  const [search, setSearch] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [entityType, setEntityType] = useState<AssignmentEntityType>('BS');
  const [documentType, setDocumentType] = useState<AssignmentDocumentType | ''>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<EligibleAssignee | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultAlert, setResultAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAssignees = async () => {
    try {
      const data = await fetchEligibleAssignees(user?.id);
      setAssignees(data);
    } catch (e) {
      console.error('Failed to load eligible assignees', e);
    }
  };

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const data = await fetchDossiers({
        entityType,
        documentType: entityType === 'DOCUMENT' && documentType ? documentType : undefined,
        ownerRole: filterOwnerRole || undefined,
        search: search || undefined,
        unassignedOnly,
        page: page + 1,
        pageSize: rowsPerPage
      });
      setDossiers(data.dossiers);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load dossiers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssignees(); }, [user?.id]);
  useEffect(() => { loadDossiers(); /* eslint-disable-next-line */ }, [entityType, documentType, filterOwnerRole, unassignedOnly, page, rowsPerPage]);

  const handleSearch = () => { setPage(0); loadDossiers(); };

  const toggleSelectAll = () => {
    if (selected.length === dossiers.length) setSelected([]);
    else setSelected(dossiers.map(d => d.id));
  };

  const toggleSelectOne = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openDialogFor = (ids: string[]) => {
    setSelected(ids);
    setTargetUser(null);
    setReason('');
    setDialogOpen(true);
  };

  const handleReassign = async () => {
    if (!targetUser || !user?.id || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await reassignDossiers({
        entityType,
        bulletinSoinIds: selected,
        targetUserId: targetUser.id,
        performedByUserId: user.id,
        reason: reason || undefined
      });
      setResultAlert({
        type: res.failed > 0 ? 'error' : 'success',
        message: `${res.assigned} élément(s) réaffecté(s) vers ${targetUser.fullName}${res.failed ? `, ${res.failed} échec(s)` : ''}. Les statuts n'ont pas été modifiés.`
      });
      setDialogOpen(false);
      setSelected([]);
      await Promise.all([loadDossiers(), loadAssignees()]);
    } catch (e: any) {
      setResultAlert({ type: 'error', message: e?.response?.data?.message || 'Erreur lors de la réaffectation' });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => ({
    total,
    unassignedOnPage: dossiers.filter(d => !d.owner).length
  }), [total, dossiers]);
  const entityLabel = entityType === 'BS' ? 'BS' : entityType === 'BORDEREAU' ? 'bordereau' : 'document';

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: '#f8faff', minHeight: '100vh' }}>
      <Alert severity="info" icon={<Info fontSize="small" />} sx={{ mb: 3, ...alertSx('info') }}>
        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
          Cette réaffectation change uniquement le <strong>responsable</strong> de l'élément sélectionné.
          Le <strong>statut/état</strong> du {entityLabel} et de ses documents n'est jamais modifié. Éligibles: Chef d'Équipe,
          Gestionnaire Senior, Gestionnaire — dans n'importe quelle combinaison.
        </Typography>
      </Alert>

      {resultAlert && (
        <Alert
          severity={resultAlert.type}
          sx={{ mb: 2, ...alertSx(resultAlert.type) }}
          onClose={() => setResultAlert(null)}
        >
          {resultAlert.message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card {...cardBase}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Typography variant="body2" sx={{ color: T.textSec, fontSize: '0.78rem' }}>
                Total {entityLabel} (filtrés)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, color: T.navy }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card {...cardBase} sx={{ ...cardBase.sx, borderLeft: `3px solid ${T.cards.blue}` }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Typography variant="body2" sx={{ color: T.textSec, fontSize: '0.78rem' }}>
                Sélectionnés
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, color: T.cards.blue }}>
                {selected.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card {...cardBase} sx={{ ...cardBase.sx, borderLeft: `3px solid ${T.warning.text}` }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Typography variant="body2" sx={{ color: T.textSec, fontSize: '0.78rem' }}>
                Non Assignés (page actuelle)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, color: T.warning.text }}>
                {stats.unassignedOnPage}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper {...cardBase} sx={{ ...cardBase.sx, p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Type d'élément</InputLabel>
            <Select
              value={entityType}
              label="Type d'élément"
              onChange={e => {
                setEntityType(e.target.value as AssignmentEntityType);
                setDocumentType('');
                setSelected([]);
                setPage(0);
              }}
            >
              <MenuItem value="BS">Bulletins de soin</MenuItem>
              <MenuItem value="BORDEREAU">Bordereaux entiers</MenuItem>
              <MenuItem value="DOCUMENT">Documents individuels</MenuItem>
            </Select>
          </FormControl>

          {entityType === 'DOCUMENT' && (
            <FormControl size="small" sx={{ minWidth: 230 }}>
              <InputLabel>Type de document</InputLabel>
              <Select
                value={documentType}
                label="Type de document"
                onChange={e => { setPage(0); setDocumentType(e.target.value as AssignmentDocumentType | ''); }}
              >
                <MenuItem value="">Tous les types</MenuItem>
                <MenuItem value="BULLETIN_SOIN">Bulletin de soin</MenuItem>
                <MenuItem value="COMPLEMENT_INFORMATION">Complément d'information</MenuItem>
                <MenuItem value="ADHESION">Adhésion</MenuItem>
                <MenuItem value="RECLAMATION">Réclamation</MenuItem>
                <MenuItem value="CONTRAT_AVENANT">Contrat / avenant</MenuItem>
                <MenuItem value="DEMANDE_RESILIATION">Demande de résiliation</MenuItem>
                <MenuItem value="CONVENTION_TIERS_PAYANT">Convention tiers payant</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Rôle du responsable actuel</InputLabel>
            <Select value={filterOwnerRole} label="Rôle du responsable actuel" onChange={e => { setPage(0); setFilterOwnerRole(e.target.value); }}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="CHEF_EQUIPE">Chef d'Équipe</MenuItem>
              <MenuItem value="GESTIONNAIRE_SENIOR">Gestionnaire Senior</MenuItem>
              <MenuItem value="GESTIONNAIRE">Gestionnaire</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Rechercher (référence, assuré, société)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Assignation</InputLabel>
            <Select
              value={unassignedOnly ? 'UNASSIGNED' : 'ALL'}
              label="Assignation"
              onChange={e => { setPage(0); setUnassignedOnly(e.target.value === 'UNASSIGNED'); }}
            >
              <MenuItem value="ALL">Tous</MenuItem>
              <MenuItem value="UNASSIGNED">Non assignés</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={handleSearch} sx={outlinedBtnSx}>
            Rechercher
          </Button>

          <Button
            variant="contained"
            startIcon={<SwapHoriz />}
            disabled={selected.length === 0}
            onClick={() => openDialogFor(selected)}
            sx={{ ml: 'auto', ...containedBtnSx }}
          >
            Réaffecter ({selected.length})
          </Button>
        </Box>
      </Paper>

      <Paper {...cardBase}>
        {loading && <LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: T.navy } }} />}
        <TableContainer sx={{ borderRadius: '6px', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead sx={tableHeaderSx}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={dossiers.length > 0 && selected.length === dossiers.length}
                    indeterminate={selected.length > 0 && selected.length < dossiers.length}
                    onChange={toggleSelectAll}
                    sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                  />
                </TableCell>
                <TableCell>Référence / nom</TableCell>
                <TableCell>Assuré / type</TableCell>
                <TableCell>Société</TableCell>
                <TableCell>Bordereau</TableCell>
                <TableCell>Statut (non modifiable)</TableCell>
                <TableCell>Responsable actuel</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={tableBodySx}>
              {dossiers.map(d => (
                <TableRow key={d.id} hover selected={selected.includes(d.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.includes(d.id)} onChange={() => toggleSelectOne(d.id)} />
                  </TableCell>
                  <TableCell>{d.numBs || d.reference || d.name || d.id}</TableCell>
                  <TableCell>{d.nomAssure || d.type || '—'}</TableCell>
                  <TableCell>{d.nomSociete || d.clientName || '—'}</TableCell>
                  <TableCell>{d.bordereauReference || '—'}</TableCell>
                  <TableCell>
                    <Tooltip title="Le statut ne change pas lors d'une réaffectation">
                      <Chip
                        label={d.etat || d.status || d.statut || '—'}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.70rem', height: 22 }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>{d.owner ? d.owner.fullName : <em>Non assigné</em>}</TableCell>
                  <TableCell>{d.owner ? <RoleChip role={d.owner.role} /> : '—'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={() => openDialogFor([d.id])} sx={outlinedBtnSx}>
                      Réaffecter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {dossiers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ color: T.textMuted, fontSize: '0.81rem' }}>
                    Aucun dossier trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ borderTop: `1px solid ${T.border}` }}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, minWidth: { xs: 280, sm: 380 } } }}
      >
        <DialogTitle sx={dialogTitleSx}>
          Réaffecter {selected.length} {entityLabel}(s)
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="warning" sx={{ my: 2, ...alertSx('warning') }}>
            Le statut (état) des éléments sélectionnés restera inchangé après cette opération.
          </Alert>
          <Autocomplete
            options={assignees}
            groupBy={(o) => ROLE_LABEL[o.role] || o.role}
            getOptionLabel={(o) => `${o.fullName} — ${o.currentLoad} dossier(s) actif(s)`}
            value={targetUser}
            onChange={(_, v) => setTargetUser(v)}
            renderInput={(params) => (
              <TextField {...params} label="Nouveau responsable" placeholder="Chef d'Équipe, Gestionnaire Senior ou Gestionnaire" />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                  <span>{option.fullName}</span>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RoleChip role={option.role} />
                    <Typography variant="caption" sx={{ color: T.textMuted, fontSize: '0.72rem' }}>
                      {option.currentLoad}/{option.capacity}
                    </Typography>
                  </Box>
                </Box>
              </li>
            )}
          />
          <TextField
            sx={{ mt: 2 }}
            fullWidth
            multiline
            rows={2}
            label="Raison (optionnel)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: T.textSec, fontWeight: 600, fontSize: '0.78rem' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!targetUser || submitting}
            onClick={handleReassign}
            startIcon={<SwapHoriz />}
            sx={containedBtnSx}
          >
            Confirmer la réaffectation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BSReassignmentManager;