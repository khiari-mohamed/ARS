// src/components/GED/DocumentIngestionTab.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Alert,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LocalAPI } from '../../services/axios';
import { fetchContractsByClient } from '../../services/contractService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  name?: string;
  clientName?: string;
}

interface Metadata {
  clientId: string;
  contractId: string;
  type: string;
  numberOfDocs: number;
  bordereauRef: string;
  dateReception: string;
}

interface PaperStreamStatus {
  inputFolder?: string;
  pendingBatches?: number;
  totalProcessed?: number;
  totalQuarantined?: number;
  successRate?: number;
  watcherActive?: boolean;
}

interface UploadResult {
  success: boolean;
  fileName: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { value: 'BULLETIN_SOIN',          label: 'Bulletin de Soin' },
  { value: 'COMPLEMENT_INFORMATION', label: 'Complément Information' },
  { value: 'ADHESION',               label: 'Adhésion' },
  { value: 'RECLAMATION',            label: 'Réclamation' },
  { value: 'CONTRAT_AVENANT',        label: 'Contrat/Avenant' },
  { value: 'DEMANDE_RESILIATION',    label: 'Demande Résiliation' },
  { value: 'CONVENTION_TIERS_PAYANT','label': 'Convention Tiers Payant' },
] as const;

const DEFAULT_METADATA: Metadata = {
  clientId: '',
  contractId: '',
  type: 'BULLETIN_SOIN',
  numberOfDocs: 1,
  bordereauRef: '',
  dateReception: new Date().toISOString().split('T')[0],
};

const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.tiff';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
};

const isImage = (f: File) => f.type.startsWith('image/');

// ─── Styles ───────────────────────────────────────────────────────────────────

const sx = {
  panel: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 2,
    boxShadow: 'none',
    p: 2.5,
  },
  sectionTitle: {
    fontWeight: 700,
    color: '#1e3a5f',
    fontSize: '0.78rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    mb: 2,
  },
  dropZone: (dragging: boolean) => ({
    border: `2px dashed ${dragging ? '#1e3a5f' : '#d0dff5'}`,
    borderRadius: 2,
    p: { xs: 3, sm: 4 },
    textAlign: 'center' as const,
    cursor: 'pointer',
    mb: 2,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    background: dragging ? '#f0f4ff' : '#f4f7fb',
    transition: 'all 0.18s ease',
    '&:hover': {
      borderColor: '#1e3a5f',
      background: '#f0f4ff',
    },
  }),
  inputSx: {
    '& .MuiOutlinedInput-root': {
      background: '#fff',
      '&:hover fieldset': { borderColor: '#2563a8' },
      '&.Mui-focused fieldset': { borderColor: '#1e3a5f' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1e3a5f' },
  },
  fileCard: {
    border: '1px solid #e0e7ef',
    borderRadius: 1.5,
    p: 1.5,
    mb: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: '#f4f7fb',
    transition: 'box-shadow 0.15s',
    '&:hover': { boxShadow: '0 2px 8px rgba(30,58,95,0.08)' },
  },
  fileIconBox: (color: string) => ({
    width: 36,
    height: 36,
    borderRadius: 1,
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  removeBtn: {
    color: '#b71c1c',
    minWidth: 0,
    p: 0.5,
    '&:hover': { background: '#fdecea' },
  },
  scannerBtn: {
    borderColor: '#d0dff5',
    color: '#1e3a5f',
    fontWeight: 600,
    fontSize: '0.78rem',
    mb: 2,
    '&:hover': { borderColor: '#1e3a5f', background: '#f0f4ff' },
  },
  submitBtn: (disabled: boolean) => ({
    background: disabled ? '#cfd8dc' : 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)',
    color: '#fff',
    fontWeight: 700,
    mt: 2.5,
    py: 1.25,
    fontSize: '0.85rem',
    letterSpacing: 0.3,
    '&:hover': {
      background: disabled ? '#cfd8dc' : 'linear-gradient(135deg, #163050 0%, #1d4f8c 100%)',
    },
  }),
  previewEmpty: {
    height: 300,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #d0dff5',
    borderRadius: 2,
    color: '#90a4ae',
    gap: 1,
  },
  dialogTitle: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)',
    color: '#fff',
    py: 2,
    px: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  psMetricBox: {
    background: '#f4f7fb',
    border: '1px solid #e0e7ef',
    borderRadius: 1.5,
    p: 1.5,
    textAlign: 'center' as const,
  },
  psLabel: {
    color: '#546e7a',
    fontSize: '0.68rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    fontWeight: 600,
    mb: 0.25,
  },
  psValue: (color?: string) => ({
    fontWeight: 800,
    fontSize: '1.25rem',
    color: color ?? '#1e3a5f',
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentIngestionTab: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState<Metadata>(DEFAULT_METADATA);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // PaperStream dialog — Fix: store resolve ref outside state to avoid
  // React's functional-updater pitfall when calling setState(fn)
  const [psDialogOpen, setPsDialogOpen] = useState(false);
  const [psStatus, setPsStatus] = useState<PaperStreamStatus | null>(null);
  const [psLoading, setPsLoading] = useState(false);
  const [psImporting, setPsImporting] = useState(false);
  const [psResult, setPsResult] = useState<{ count: number } | null>(null);
  const dialogResolveRef = useRef<((v: boolean) => void) | null>(null);

  // ── Load clients ──────────────────────────────────────────────────────────

  useEffect(() => {
    setClientsLoading(true);
    LocalAPI.get('/clients')
      .then((res) => setClients(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  // ── Load contracts when client changes ────────────────────────────────────

  useEffect(() => {
    if (!metadata.clientId) {
      setContracts([]);
      setMetadata((prev) => ({ ...prev, contractId: '' }));
      return;
    }
    fetchContractsByClient(metadata.clientId)
      .then((data) => {
        setContracts(data);
        if (data.length === 1) {
          setMetadata((prev) => ({ ...prev, contractId: data[0].id }));
        }
      })
      .catch(() => setContracts([]));
  }, [metadata.clientId]);

  // ── File handling ─────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: File[]) => {
    setUploadedFiles((prev) => {
      // Deduplicate by stable key
      const existingKeys = new Set(prev.map(fileKey));
      const novel = incoming.filter((f) => !existingKeys.has(fileKey(f)));
      return [...prev, ...novel];
    });
    setUploadResults(null);

    const firstImage = incoming.find(isImage);
    if (firstImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(firstImage);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) addFiles(Array.from(files));
    // Reset input so the same file can be re-added after removal
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files);
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setPreview(null);
      else if (!next.some(isImage)) setPreview(null);
      return next;
    });
  };

  // ── PaperStream dialog ────────────────────────────────────────────────────

  const handleScannerImport = async () => {
    setPsLoading(true);
    setPsResult(null);
    setPsStatus(null);
    setPsDialogOpen(true);
    try {
      const res = await LocalAPI.get('/documents/paperstream/status');
      setPsStatus(res.data);
    } catch {
      setPsStatus({});
    } finally {
      setPsLoading(false);
    }
  };

  const handlePsConfirm = async () => {
    setPsImporting(true);
    try {
      const res = await LocalAPI.post('/scan/paperstream-import');
      setPsResult({ count: res.data?.importedCount ?? 0 });
    } catch (err: any) {
      setPsResult({ count: -1 }); // signals error
    } finally {
      setPsImporting(false);
    }
  };

  const handlePsClose = () => {
    setPsDialogOpen(false);
    setPsStatus(null);
    setPsResult(null);
    if (psResult && psResult.count > 0) {
      // Reload only after a successful import
      window.location.reload();
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (uploadedFiles.length === 0) return 'Veuillez sélectionner au moins un fichier.';
    if (!metadata.clientId) return 'Veuillez sélectionner un client.';
    if (metadata.numberOfDocs < 1) return 'Le nombre de documents doit être ≥ 1.';
    if (!metadata.dateReception) return 'La date de réception est obligatoire.';
    return null;
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleSaveAndNotify = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const results: UploadResult[] = await Promise.all(
        uploadedFiles.map(async (file, idx) => {
          try {
            const formData = new FormData();
            formData.append('files', file);
            formData.append('name', file.name);
            formData.append('type', metadata.type);
            if (metadata.bordereauRef.trim()) {
              formData.append('bordereauId', metadata.bordereauRef.trim());
            }
            await LocalAPI.post('/documents/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadProgress(Math.round(((idx + 1) / uploadedFiles.length) * 100));
            return { success: true, fileName: file.name };
          } catch (e: any) {
            return {
              success: false,
              fileName: file.name,
              error: e?.response?.data?.message ?? e?.message ?? 'Erreur inconnue',
            };
          }
        }),
      );

      setUploadResults(results);

      const allOk = results.every((r) => r.success);
      if (allOk) {
        // Reset form on full success
        setUploadedFiles([]);
        setPreview(null);
        setMetadata({ ...DEFAULT_METADATA, dateReception: new Date().toISOString().split('T')[0] });
      }
    } finally {
      setUploading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const isSubmitDisabled = uploading || uploadedFiles.length === 0 || !metadata.clientId;
  const successCount = uploadResults?.filter((r) => r.success).length ?? 0;
  const failCount = uploadResults?.filter((r) => !r.success).length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Grid container spacing={2}>
        {/* ── Left: Upload + Metadata ──────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Box sx={sx.panel}>
            <Typography sx={sx.sectionTitle}>Ingestion de Documents</Typography>
            <Divider sx={{ mb: 2, borderColor: '#e0e7ef' }} />

            {/* Drop zone */}
            <Box
              component="label"
              sx={sx.dropZone(dragging)}
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept={ACCEPTED_FORMATS}
                onChange={handleFileInput}
                multiple
                style={{ display: 'none' }}
              />
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#e3f2fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 30, color: '#1e3a5f' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', mb: 0.5 }}>
                Glissez-déposez vos fichiers ici
              </Typography>
              <Typography sx={{ color: '#546e7a', fontSize: '0.75rem', mb: 0.5 }}>
                ou cliquez pour sélectionner
              </Typography>
              <Typography sx={{ color: '#90a4ae', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                PDF · JPG · PNG · TIFF
              </Typography>
            </Box>

            {/* Scanner import button */}
            <Button
              variant="outlined"
              startIcon={<FolderIcon />}
              onClick={handleScannerImport}
              fullWidth
              size="small"
              sx={sx.scannerBtn}
            >
              Importer depuis le dossier Scanner
            </Button>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <Box mb={2}>
                <Typography sx={{ ...sx.sectionTitle, mb: 1 }}>
                  {uploadedFiles.length} fichier{uploadedFiles.length > 1 ? 's' : ''} sélectionné{uploadedFiles.length > 1 ? 's' : ''}
                </Typography>
                {uploadedFiles.map((file, idx) => (
                  // Fix: stable key using file properties, not index
                  <Box key={fileKey(file)} sx={sx.fileCard}>
                    <Box sx={sx.fileIconBox(isImage(file) ? '#e3f2fd' : '#f0f4ff')}>
                      {isImage(file)
                        ? <ImageIcon sx={{ fontSize: 18, color: '#2196f3' }} />
                        : <InsertDriveFileIcon sx={{ fontSize: 18, color: '#1e3a5f' }} />
                      }
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.80rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </Typography>
                      <Typography sx={{ color: '#546e7a', fontSize: '0.70rem' }}>
                        {formatBytes(file.size)}
                      </Typography>
                    </Box>
                    {uploadResults && (
                      <Chip
                        label={uploadResults[idx]?.success ? 'OK' : 'Erreur'}
                        color={uploadResults[idx]?.success ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.65rem', fontWeight: 700, height: 20 }}
                      />
                    )}
                    <Button
                      size="small"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={uploading}
                      sx={sx.removeBtn}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {/* Upload progress */}
            {uploading && (
              <Box mb={2}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    background: '#e0e7ef',
                    '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #1e3a5f, #2563a8)' },
                  }}
                />
                <Typography sx={{ color: '#546e7a', fontSize: '0.72rem', mt: 0.5, textAlign: 'right' }}>
                  {uploadProgress}%
                </Typography>
              </Box>
            )}

            {/* Upload results */}
            {uploadResults && !uploading && (
              <Alert
                severity={failCount === 0 ? 'success' : failCount === uploadResults.length ? 'error' : 'warning'}
                icon={failCount === 0 ? <CheckCircleOutlineIcon /> : undefined}
                sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.80rem' }}
              >
                {failCount === 0
                  ? `${successCount} document${successCount > 1 ? 's' : ''} enregistré${successCount > 1 ? 's' : ''} avec succès.`
                  : `${successCount} réussi · ${failCount} échoué${failCount > 1 ? 's' : ''}`
                }
                {uploadResults.filter((r) => !r.success).map((r) => (
                  <Box key={r.fileName} sx={{ mt: 0.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: '#b71c1c' }}>
                      {r.fileName}: {r.error}
                    </Typography>
                  </Box>
                ))}
              </Alert>
            )}

            {/* Form error */}
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)} sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.80rem' }}>
                {formError}
              </Alert>
            )}

            <Divider sx={{ mb: 2, borderColor: '#e0e7ef' }} />
            <Typography sx={sx.sectionTitle}>Métadonnées du Document</Typography>

            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" sx={sx.inputSx}>
                  <InputLabel>Client *</InputLabel>
                  <Select
                    value={metadata.clientId}
                    onChange={(e) => setMetadata((p) => ({ ...p, clientId: e.target.value }))}
                    label="Client *"
                    endAdornment={clientsLoading ? <CircularProgress size={14} sx={{ mr: 2 }} /> : null}
                  >
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small" sx={sx.inputSx}>
                  <InputLabel>Contrat</InputLabel>
                  <Select
                    value={metadata.contractId}
                    onChange={(e) => setMetadata((p) => ({ ...p, contractId: e.target.value }))}
                    label="Contrat"
                    disabled={!metadata.clientId || contracts.length === 0}
                  >
                    {/* Fix: removed stale "Aucun contrat disponible" MenuItem mixed with populated list */}
                    <MenuItem value="">Aucun</MenuItem>
                    {contracts.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.clientName ?? c.name ?? c.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small" sx={sx.inputSx}>
                  <InputLabel>Type de Document *</InputLabel>
                  <Select
                    value={metadata.type}
                    onChange={(e) => setMetadata((p) => ({ ...p, type: e.target.value }))}
                    label="Type de Document *"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre de documents"
                  type="number"
                  value={metadata.numberOfDocs}
                  onChange={(e) => {
                    // Fix: parseInt with radix + NaN guard
                    const v = parseInt(e.target.value, 10);
                    setMetadata((p) => ({ ...p, numberOfDocs: isNaN(v) ? 1 : Math.max(1, v) }));
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ min: 1 }}
                  sx={sx.inputSx}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de Réception *"
                  type="date"
                  value={metadata.dateReception}
                  onChange={(e) => setMetadata((p) => ({ ...p, dateReception: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={sx.inputSx}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Référence Bordereau (optionnel)"
                  value={metadata.bordereauRef}
                  onChange={(e) => setMetadata((p) => ({ ...p, bordereauRef: e.target.value }))}
                  fullWidth
                  size="small"
                  helperText="Laissez vide si aucun bordereau associé"
                  placeholder="Ex: REF2025001"
                  sx={sx.inputSx}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              onClick={handleSaveAndNotify}
              disabled={isSubmitDisabled}
              fullWidth
              sx={sx.submitBtn(isSubmitDisabled)}
            >
              {uploading
                ? <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={15} color="inherit" />
                    Enregistrement…
                  </Box>
                : `Enregistrer ${uploadedFiles.length > 0 ? uploadedFiles.length : ''} document${uploadedFiles.length !== 1 ? 's' : ''}`
              }
            </Button>
          </Box>
        </Grid>

        {/* ── Right: Preview ───────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Box sx={sx.panel}>
            <Typography sx={sx.sectionTitle}>Aperçu du Document</Typography>
            <Divider sx={{ mb: 2, borderColor: '#e0e7ef' }} />

            {preview ? (
              <Box textAlign="center">
                <img
                  src={preview}
                  alt="Aperçu du document"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 420,
                    border: '1px solid #e0e7ef',
                    borderRadius: 8,
                    objectFit: 'contain',
                  }}
                />
              </Box>
            ) : uploadedFiles.length > 0 ? (
              <Box>
                {uploadedFiles.map((file) => (
                  <Card
                    key={fileKey(file)}
                    variant="outlined"
                    sx={{
                      mb: 1.5,
                      border: '1px solid #e0e7ef',
                      borderRadius: 1.5,
                      boxShadow: 'none',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.5} p={1.5}>
                      <Box sx={sx.fileIconBox(isImage(file) ? '#e3f2fd' : '#f0f4ff')}>
                        {isImage(file)
                          ? <ImageIcon sx={{ color: '#2196f3', fontSize: 20 }} />
                          : <InsertDriveFileIcon sx={{ color: '#1e3a5f', fontSize: 20 }} />
                        }
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Typography sx={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </Typography>
                        <Typography sx={{ color: '#546e7a', fontSize: '0.72rem' }}>
                          {file.type || 'Fichier'} · {formatBytes(file.size)}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box sx={sx.previewEmpty}>
                <InsertDriveFileIcon sx={{ fontSize: 48, color: '#d0dff5' }} />
                <Typography sx={{ color: '#90a4ae', fontSize: '0.82rem', fontWeight: 500 }}>
                  Sélectionnez un document pour voir l'aperçu
                </Typography>
                <Typography sx={{ color: '#b0bec5', fontSize: '0.72rem' }}>
                  PDF · JPG · PNG · TIFF
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* ── PaperStream Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={psDialogOpen}
        onClose={psImporting ? undefined : handlePsClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle sx={sx.dialogTitle}>
          <FolderIcon sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="0.95rem">
            Statut PaperStream
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
          {psLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} sx={{ color: '#1e3a5f' }} />
            </Box>
          ) : psResult ? (
            /* Post-import result */
            psResult.count < 0 ? (
              <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                L'import PaperStream a échoué. Vérifiez que le service est configuré et relancez.
              </Alert>
            ) : psResult.count === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                Aucun nouveau fichier détecté. Placez des fichiers dans le dossier PaperStream et relancez.
              </Alert>
            ) : (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ borderRadius: 1.5 }}>
                {psResult.count} fichier{psResult.count > 1 ? 's' : ''} importé{psResult.count > 1 ? 's' : ''} avec succès.
              </Alert>
            )
          ) : psStatus ? (
            /* Status display */
            <>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>
                  Dossier surveillé:{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: '#1e3a5f', fontFamily: 'monospace' }}>
                    {psStatus.inputFolder ?? './paperstream-input'}
                  </Box>
                </Typography>
                <Chip
                  label={psStatus.watcherActive ? 'Actif' : 'Inactif'}
                  color={psStatus.watcherActive ? 'success' : 'error'}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                />
              </Box>

              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: 'En attente',   value: psStatus.pendingBatches   ?? 0, color: '#e65100' },
                  { label: 'Traités',      value: psStatus.totalProcessed   ?? 0, color: '#1e3a5f' },
                  { label: 'Quarantaine',  value: psStatus.totalQuarantined ?? 0, color: '#b71c1c' },
                  { label: 'Taux succès',  value: `${psStatus.successRate?.toFixed(1) ?? 0}%`, color: '#1b6b3a' },
                ].map(({ label, value, color }) => (
                  <Grid item xs={6} key={label}>
                    <Box sx={sx.psMetricBox}>
                      <Typography sx={sx.psLabel}>{label}</Typography>
                      <Typography sx={sx.psValue(color)}>{value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography sx={{ color: '#546e7a', fontSize: '0.78rem' }}>
                Voulez-vous déclencher un import manuel des fichiers PaperStream ?
              </Typography>
            </>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e7ef', gap: 1 }}>
          <Button
            onClick={handlePsClose}
            disabled={psImporting}
            variant="outlined"
            size="small"
            sx={{ color: '#546e7a', borderColor: '#cfd8dc', '&:hover': { borderColor: '#546e7a' } }}
          >
            {psResult ? 'Fermer' : 'Annuler'}
          </Button>
          {!psResult && !psLoading && (
            <Button
              onClick={handlePsConfirm}
              variant="contained"
              size="small"
              disabled={psImporting}
              startIcon={psImporting ? <CircularProgress size={14} color="inherit" /> : <FolderIcon />}
              sx={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)',
                color: '#fff',
                fontWeight: 700,
                '&:hover': { background: 'linear-gradient(135deg, #163050 0%, #1d4f8c 100%)' },
                '&:disabled': { background: '#cfd8dc', color: '#fff' },
              }}
            >
              {psImporting ? 'Import en cours…' : 'Déclencher l\'import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentIngestionTab;