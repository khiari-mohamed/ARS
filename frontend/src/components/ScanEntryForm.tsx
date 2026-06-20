// src/components/ScanEntryForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Typography,
  Chip,
  IconButton,
  Autocomplete,
  CircularProgress,
  Divider,
} from '@mui/material';
import { AutoAwesome, Refresh, DocumentScanner } from '@mui/icons-material';
import { fetchClients } from '../services/clientService';
import { fetchContractsByClient } from '../services/contractService';
import { classifyDocument } from '../services/boService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  name?: string;
  clientName?: string;
  delaiReglement?: number;
}

interface Classification {
  type: string;
  category: string;
  priority: string;
  confidence: number;
}

interface FormData {
  reference: string;
  clientId: string;
  contractId: string;
  documentType: string;
  nombreDocuments: number;
  delaiReglement: number;
  dateReception: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { value: 'BULLETIN_SOIN', label: 'Bulletin de Soin' },
  { value: 'COMPLEMENT_INFORMATION', label: 'Complément Information' },
  { value: 'ADHESION', label: 'Adhésion' },
  { value: 'RECLAMATION', label: 'Réclamation' },
  { value: 'CONTRAT_AVENANT', label: 'Contrat/Avenant' },
  { value: 'DEMANDE_RESILIATION', label: 'Demande Résiliation' },
  { value: 'CONVENTION_TIERS_PAYANT', label: 'Convention Tiers Payant' },
] as const;

const DEFAULT_FORM: FormData = {
  reference: '',
  clientId: '',
  contractId: '',
  documentType: 'BULLETIN_SOIN',
  nombreDocuments: 1,
  delaiReglement: 30,
  dateReception: new Date().toISOString().split('T')[0],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildReference = (
  client: Client | undefined,
  documentType: string,
): string => {
  const year = new Date().getFullYear();
  // timestamp-based suffix avoids Math.random() collisions
  const suffix = (Date.now() % 99999).toString().padStart(5, '0');
  const clientAbbr = client
    ? client.name
        .split(' ')
        .map((w) => w.charAt(0))
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'CLI';
  const docTypeAbbr =
    DOCUMENT_TYPES.find((dt) => dt.value === documentType)?.value.split('_')[0] ?? 'DOC';
  return `${clientAbbr}-${docTypeAbbr}-${year}-${suffix}`;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const sx = {
  dialog: {
    '& .MuiDialog-paper': {
      borderRadius: 2,
      boxShadow: '0 8px 40px rgba(30,58,95,0.18)',
    },
  },
  dialogTitle: {
    background: 'linear-gradient(135deg, #1b6b3a 0%, #2e7d32 100%)',
    color: '#fff',
    py: 2,
    px: 3,
  },
  dialogContent: {
    px: 3,
    pt: 3,
    pb: 1,
    background: '#f4f7fb',
  },
  section: {
    background: '#fff',
    borderRadius: 2,
    border: '1px solid rgba(0,0,0,0.08)',
    p: 2.5,
    mb: 2,
  },
  sectionTitle: {
    fontWeight: 700,
    color: '#1b6b3a',
    fontSize: '0.78rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    mb: 2,
  },
  classificationBox: {
    background: '#e6f4ed',
    border: '1px solid #a5d6a7',
    borderLeft: '4px solid #1b6b3a',
    borderRadius: 2,
    p: 2,
    mt: 2,
  },
  classificationLabel: {
    color: '#546e7a',
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    fontWeight: 600,
  },
  classificationValue: {
    fontWeight: 700,
    color: '#1b6b3a',
    fontSize: '0.88rem',
  },
  confidenceBadge: (confidence: number) => ({
    display: 'inline-flex',
    alignItems: 'center',
    px: 1,
    py: 0.25,
    borderRadius: 1,
    fontSize: '0.75rem',
    fontWeight: 700,
    background: confidence > 0.8 ? '#e6f4ed' : confidence > 0.5 ? '#fff8e1' : '#fdecea',
    color: confidence > 0.8 ? '#1b6b3a' : confidence > 0.5 ? '#e65100' : '#b71c1c',
    border: `1px solid ${confidence > 0.8 ? '#a5d6a7' : confidence > 0.5 ? '#ffcc80' : '#ef9a9a'}`,
  }),
  generateBtn: {
    background: 'linear-gradient(135deg, #1b6b3a 0%, #2e7d32 100%)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.78rem',
    letterSpacing: 0.5,
    px: 2,
    '&:hover': {
      background: 'linear-gradient(135deg, #145229 0%, #256427 100%)',
    },
    '&:disabled': {
      background: '#cfd8dc',
      color: '#fff',
    },
  },
  refreshBtn: {
    border: '1px solid #a5d6a7',
    color: '#1b6b3a',
    '&:hover': { background: '#e6f4ed', borderColor: '#2e7d32' },
  },
  dialogActions: {
    px: 3,
    py: 2,
    background: '#f4f7fb',
    borderTop: '1px solid #e0e7ef',
    gap: 1,
  },
  cancelBtn: {
    color: '#546e7a',
    borderColor: '#cfd8dc',
    '&:hover': { borderColor: '#546e7a', background: '#f4f7fb' },
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1b6b3a 0%, #2e7d32 100%)',
    color: '#fff',
    fontWeight: 700,
    px: 4,
    '&:hover': { background: 'linear-gradient(135deg, #145229 0%, #256427 100%)' },
    '&:disabled': { background: '#cfd8dc', color: '#fff' },
  },
  inputSx: {
    '& .MuiOutlinedInput-root': {
      background: '#fff',
      '&:hover fieldset': { borderColor: '#2e7d32' },
      '&.Mui-focused fieldset': { borderColor: '#1b6b3a' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1b6b3a' },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const ScanEntryForm: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [classification, setClassification] = useState<Classification | null>(null);

  const clientsRef = useRef<Client[]>([]);
  clientsRef.current = clients;

  const referenceUserEdited = useRef(false);

  // ── Load clients on open ──────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    resetForm();
    setClientsLoading(true);
    fetchClients()
      .then(setClients)
      .catch(() => setError('Impossible de charger la liste des clients.'))
      .finally(() => setClientsLoading(false));
  }, [open]);

  // ── Load contracts when client changes ───────────────────────────────────

  useEffect(() => {
    if (!formData.clientId) {
      setContracts([]);
      setFormData((prev) => ({ ...prev, contractId: '', delaiReglement: 30 }));
      return;
    }
    fetchContractsByClient(formData.clientId)
      .then((data: Contract[]) => {
        setContracts(data);
        if (data.length === 1) {
          setFormData((prev) => ({
            ...prev,
            contractId: data[0].id,
            delaiReglement: data[0].delaiReglement ?? 30,
          }));
        } else if (data.length === 0) {
          setFormData((prev) => ({ ...prev, contractId: '', delaiReglement: 30 }));
        }
      })
      .catch(() => console.error('Failed to load contracts'));
  }, [formData.clientId]);

  // ── Sync delaiReglement with selected contract ────────────────────────────

  useEffect(() => {
    if (!formData.contractId) return;
    const selected = contracts.find((c) => c.id === formData.contractId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        delaiReglement: selected.delaiReglement ?? 30,
      }));
    }
  }, [formData.contractId, contracts]);

  // ── Auto-generate reference (only when not user-edited) ──────────────────

  useEffect(() => {
    if (
      formData.clientId &&
      formData.documentType &&
      !formData.reference &&
      !referenceUserEdited.current
    ) {
      const selectedClient = clientsRef.current.find((c) => c.id === formData.clientId);
      const ref = buildReference(selectedClient, formData.documentType);
      setFormData((prev) => ({ ...prev, reference: ref }));
    }
  }, [formData.clientId, formData.documentType]); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM, dateReception: new Date().toISOString().split('T')[0] });
    setError(null);
    setValidationErrors({});
    setClassification(null);
    referenceUserEdited.current = false;
  }, []);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!formData.reference.trim()) errs.reference = 'La référence est obligatoire';
    if (!formData.clientId) errs.clientId = 'Veuillez sélectionner un client';
    if (formData.nombreDocuments < 1) errs.nombreDocuments = 'Minimum 1 document';
    if (!formData.dateReception) errs.dateReception = 'La date de réception est obligatoire';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleGenerateReference = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedClient = clients.find((c) => c.id === formData.clientId);
      const ref = buildReference(selectedClient, formData.documentType);
      referenceUserEdited.current = false;
      setFormData((prev) => ({ ...prev, reference: ref }));

      try {
        setClassifying(true);
        const result = await classifyDocument(ref);
        setClassification(result);
        if (result?.confidence > 0.8) {
          setFormData((prev) => ({ ...prev, documentType: result.type }));
        }
      } catch {
        // Non-fatal
      } finally {
        setClassifying(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyDocument = useCallback(async () => {
    if (!formData.reference.trim()) return;
    setClassifying(true);
    try {
      const result = await classifyDocument(formData.reference);
      setClassification(result);
      if (result?.confidence > 0.8) {
        setFormData((prev) => ({ ...prev, documentType: result.type }));
      }
    } catch {
      // silent
    } finally {
      setClassifying(false);
    }
  }, [formData.reference]);

  const handleSubmit = async () => {
    if (!validate()) return;
    setError(null);
    setLoading(true);
    try {
      const { LocalAPI } = await import('../services/axios');

      const bordereauResponse = await LocalAPI.post('/bordereaux', {
        reference: formData.reference,
        clientId: formData.clientId,
        contractId: formData.contractId || null,
        type: formData.documentType,
        dateReception: new Date(formData.dateReception),
        delaiReglement: formData.delaiReglement,
        nombreBS: formData.nombreDocuments,
        statut: 'A_SCANNER',
      });

      if (bordereauResponse.data) {
        try {
          await LocalAPI.post('/documents', {
            name: `${formData.reference}.pdf`,
            type: formData.documentType,
            path: `/uploads/scan/${formData.reference}.pdf`,
            bordereauId: bordereauResponse.data.id,
            status: 'UPLOADED',
          });
        } catch {
          console.warn('Document creation failed (non-fatal)');
        }
        onSuccess();
        onClose();
      } else {
        setError("Erreur lors de la création de l'entrée");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Erreur lors de la création de l'entrée");
    } finally {
      setLoading(false);
    }
  };

  // ── Selected client object ────────────────────────────────────────────────

  const selectedClient = clients.find((c) => c.id === formData.clientId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth sx={sx.dialog}>
      {/* Title */}
      <DialogTitle sx={sx.dialogTitle}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <DocumentScanner sx={{ fontSize: 22 }} />
          <Typography variant="h6" fontWeight={700} component="span">
            Nouvelle Entrée SCAN
          </Typography>
          <Chip
            label="Bordereau + Document"
            size="small"
            sx={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.70rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
          {classification && (
            <Chip
              label={`${classification.type} · ${Math.round(classification.confidence * 100)}%`}
              size="small"
              sx={{
                background: 'rgba(255,255,255,0.92)',
                color: '#1b6b3a',
                fontWeight: 700,
                fontSize: '0.70rem',
              }}
            />
          )}
          {classifying && <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.8)' }} />}
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={sx.dialogContent}>
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2, borderRadius: 2, fontSize: '0.82rem' }}
          >
            {error}
          </Alert>
        )}

        {/* Reference section */}
        <Box sx={sx.section}>
          <Typography sx={sx.sectionTitle}>Référence du Document</Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Référence *"
                value={formData.reference}
                onChange={(e) => {
                  referenceUserEdited.current = true;
                  setFormData((prev) => ({ ...prev, reference: e.target.value }));
                  if (validationErrors.reference) {
                    setValidationErrors((prev) => ({ ...prev, reference: undefined }));
                  }
                }}
                onBlur={handleClassifyDocument}
                error={!!validationErrors.reference}
                helperText={validationErrors.reference}
                placeholder="Ex: CLI-BULL-2024-00001"
                sx={sx.inputSx}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={handleGenerateReference}
                  startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
                  disabled={loading}
                  fullWidth
                  sx={sx.generateBtn}
                  size="small"
                >
                  Générer
                </Button>
                <IconButton
                  onClick={handleClassifyDocument}
                  disabled={classifying || !formData.reference}
                  title="Classifier le document"
                  size="small"
                  sx={sx.refreshBtn}
                >
                  {classifying ? <CircularProgress size={16} /> : <Refresh />}
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Client & Contract section */}
        <Box sx={sx.section}>
          <Typography sx={sx.sectionTitle}>Client &amp; Contrat</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {/* Fixed: was plain Select in original — now Autocomplete for consistency + better UX */}
              <Autocomplete
                options={clients}
                getOptionLabel={(o) => o.name}
                value={selectedClient}
                onChange={(_, newValue) => {
                  setFormData((prev) => ({ ...prev, clientId: newValue?.id ?? '', contractId: '' }));
                  if (validationErrors.clientId) {
                    setValidationErrors((prev) => ({ ...prev, clientId: undefined }));
                  }
                }}
                loading={clientsLoading}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                noOptionsText="Aucun client trouvé"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Client *"
                    placeholder="Tapez pour rechercher…"
                    error={!!validationErrors.clientId}
                    helperText={validationErrors.clientId}
                    sx={sx.inputSx}
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {clientsLoading && <CircularProgress size={14} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={sx.inputSx}>
                <InputLabel>Contrat</InputLabel>
                <Select
                  value={formData.contractId}
                  label="Contrat"
                  onChange={(e) => setFormData((prev) => ({ ...prev, contractId: e.target.value }))}
                  disabled={!formData.clientId || contracts.length === 0}
                >
                  <MenuItem value="">Aucun</MenuItem>
                  {contracts.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.clientName ?? c.name ?? c.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Document details section */}
        <Box sx={sx.section}>
          <Typography sx={sx.sectionTitle}>Détails du Document</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={sx.inputSx}>
                <InputLabel>Type de Document *</InputLabel>
                <Select
                  value={formData.documentType}
                  label="Type de Document *"
                  onChange={(e) => setFormData((prev) => ({ ...prev, documentType: e.target.value }))}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Nombre de Documents *"
                value={formData.nombreDocuments}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setFormData((prev) => ({ ...prev, nombreDocuments: val }));
                }}
                inputProps={{ min: 1 }}
                error={!!validationErrors.nombreDocuments}
                helperText={validationErrors.nombreDocuments}
                sx={sx.inputSx}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de Réception *"
                value={formData.dateReception}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateReception: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={!!validationErrors.dateReception}
                helperText={validationErrors.dateReception}
                sx={sx.inputSx}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Délai Règlement (jours)"
                value={formData.delaiReglement}
                disabled
                helperText={
                  formData.contractId
                    ? 'Défini par le contrat sélectionné'
                    : 'Valeur par défaut (30 jours)'
                }
                sx={{
                  ...sx.inputSx,
                  '& .MuiInputBase-root': { background: '#f4f7fb' },
                }}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>

        {/* AI Classification result */}
        {classification && (
          <Box sx={sx.classificationBox}>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <DocumentScanner sx={{ fontSize: 16, color: '#1b6b3a' }} />
              <Typography
                sx={{ fontWeight: 700, color: '#1b6b3a', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Classification AI
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5, borderColor: '#a5d6a7' }} />
            <Grid container spacing={1.5}>
              {[
                { label: 'Type', value: classification.type },
                { label: 'Catégorie', value: classification.category },
                { label: 'Priorité', value: classification.priority },
              ].map(({ label, value }) => (
                <Grid item xs={6} sm={3} key={label}>
                  <Typography sx={sx.classificationLabel}>{label}</Typography>
                  <Typography sx={sx.classificationValue}>{value}</Typography>
                </Grid>
              ))}
              <Grid item xs={6} sm={3}>
                <Typography sx={sx.classificationLabel}>Confiance</Typography>
                <Box sx={sx.confidenceBadge(classification.confidence)} mt={0.25}>
                  {Math.round(classification.confidence * 100)}%
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={sx.dialogActions}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          sx={sx.cancelBtn}
          size="small"
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.reference.trim()}
          sx={sx.submitBtn}
          size="small"
        >
          {loading ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={14} color="inherit" />
              Création…
            </Box>
          ) : (
            "Créer l'entrée"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScanEntryForm;