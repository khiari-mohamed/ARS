import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Fade
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  PictureAsPdf,
  Description,
  Archive,
  GetApp,
  Close,
  OpenInNew,
  Refresh,
  WarningAmber,
  InsertDriveFile
} from '@mui/icons-material';
//import { TxtFormatValidator } from './TxtFormatValidator';

interface OVValidationModalProps {
  open: boolean;
  onClose: () => void;
  ovId: string;
  ovReference: string;
  onValidated: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Palette premium (cohérente avec le thème navy/slate utilisé côté exports)
// ─────────────────────────────────────────────────────────────────────────
const COLORS = {
  navy: '#1E3A5F',
  navyLight: '#2E5F8E',
  accent: '#2196F3',
  slate: '#2C3E50',
  success: '#1B8A4C',
  successBg: '#E8F5E9',
  error: '#C0392B',
  errorBg: '#FDECEA',
  warning: '#D35400',
  warningBg: '#FFF3E0',
  border: '#E1E8F0',
  bgLight: '#F7F9FC',
  muted: '#8592A6',
};

// ─────────────────────────────────────────────────────────────────────────
// Panneau document réutilisable (affichage simultané bordereau / OV)
// ─────────────────────────────────────────────────────────────────────────
interface DocumentPanelProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onExpand: () => void;
  accentColor: string;
}

const DocumentPanel: React.FC<DocumentPanelProps> = ({
  title,
  subtitle,
  icon,
  url,
  loading,
  error,
  onRetry,
  onExpand,
  accentColor
}) => (
  <Paper
    elevation={0}
    sx={{
      border: `1px solid ${COLORS.border}`,
      borderRadius: 2,
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#fff',
      transition: 'box-shadow .2s ease',
      '&:hover': { boxShadow: '0 4px 16px rgba(30,58,95,0.08)' }
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.25,
        borderBottom: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.bgLight
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ color: accentColor, display: 'flex' }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: COLORS.slate, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: COLORS.muted, display: 'block' }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title="Recharger">
          <span>
            <IconButton size="small" onClick={onRetry} disabled={loading}>
              <Refresh fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Plein écran">
          <span>
            <IconButton size="small" onClick={onExpand} disabled={!url}>
              <OpenInNew fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>

    {loading && <LinearProgress sx={{ height: 2 }} />}

    <Box sx={{ flex: 1, minHeight: 420, position: 'relative', bgcolor: '#EEF1F5' }}>
      {loading && !url && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <CircularProgress size={28} sx={{ color: accentColor }} />
          <Typography variant="caption" sx={{ color: COLORS.muted }}>
            Chargement du document…
          </Typography>
        </Box>
      )}

      {!loading && error && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 3,
            textAlign: 'center'
          }}
        >
          <InsertDriveFile sx={{ fontSize: 36, color: '#B0BAC9' }} />
          <Typography variant="body2" sx={{ color: COLORS.muted }}>
            {error}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={onRetry}>
            Réessayer
          </Button>
        </Box>
      )}

      {url && (
        <iframe
          src={url}
          title={title}
          style={{ width: '100%', height: '100%', minHeight: 420, border: 'none', display: 'block' }}
        />
      )}
    </Box>
  </Paper>
);

// ─────────────────────────────────────────────────────────────────────────
// Composant principal — logique métier strictement identique à l'original
// ─────────────────────────────────────────────────────────────────────────
const OVValidationModal: React.FC<OVValidationModalProps> = ({
  open,
  onClose,
  ovId,
  ovReference,
  onValidated
}) => {
  const [activeStep, setActiveStep] = useState(0); // 0=Step4, 1=Step5, 2=Step6
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [ovDetails, setOvDetails] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [txtGenerated, setTxtGenerated] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'deposited' | 'not_validated' | null>(null);
  const [finalizationComplete, setFinalizationComplete] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: ''
  });
  const [showTxtValidator, setShowTxtValidator] = useState(false);
  const [txtContent, setTxtContent] = useState('');

  // NOTE CLIENT — affichage simultané Bordereau + OV (sans navigation entre écrans)
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);
  const [uploadedPdfLoading, setUploadedPdfLoading] = useState(false);
  const [uploadedPdfError, setUploadedPdfError] = useState<string | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfLoading, setGeneratedPdfLoading] = useState(false);
  const [generatedPdfError, setGeneratedPdfError] = useState<string | null>(null);

  const steps = [
    'Étape 4: Validation de l\'upload',
    'Étape 5: Génération des fichiers',
    'Étape 6: Finalisation'
  ];

  React.useEffect(() => {
    if (open && ovId) {
      loadOVDetails();
      setActiveStep(0);
      setValidationStatus(null);
      setPdfGenerated(false);
      setTxtGenerated(false);
      setFinalStatus(null);
      setFinalizationComplete(false);
      setComment('');

      // Reset du visualiseur de documents + libération des anciens blobs
      setUploadedPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setGeneratedPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setUploadedPdfError(null);
      setGeneratedPdfError(null);
    }
  }, [open, ovId]);

  // Libération des blobs au démontage du composant
  React.useEffect(() => {
    return () => {
      if (uploadedPdfUrl) URL.revokeObjectURL(uploadedPdfUrl);
      if (generatedPdfUrl) URL.revokeObjectURL(generatedPdfUrl);
    };
  }, []);

  const loadOVDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📋 OV Details loaded:', { id: data.id, bordereauId: data.bordereauId, uploadedPdfPath: data.uploadedPdfPath });
        setOvDetails(data);
      }
    } catch (error) {
      console.error('Failed to load OV details:', error);
    }
  };

  // ── Chargement du PDF Bordereau uploadé (même logique/priorités que l'ancien onClick) ──
  const loadUploadedPdf = useCallback(async (details: any) => {
    setUploadedPdfLoading(true);
    setUploadedPdfError(null);
    try {
      const { LocalAPI } = await import('../../services/axios');

      // Priorité 1 : documents liés au bordereau (OVs injectés via Excel)
      if (details?.bordereauId) {
        try {
          const response = await LocalAPI.get(`/finance/ov-documents/bordereau/${details.bordereauId}`);
          const ovDocuments = response.data;

          const pdfDoc = ovDocuments.find((doc: any) =>
            doc.name?.toLowerCase().endsWith('.pdf')
          );

          if (pdfDoc) {
            const docResponse = await LocalAPI.get(
              `/finance/ordres-virement/${pdfDoc.ordreVirementId}/documents/${pdfDoc.id}/pdf`,
              { responseType: 'blob' }
            );
            const blob = new Blob([docResponse.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            setUploadedPdfUrl(blobUrl);
            setUploadedPdfLoading(false);
            return;
          }
        } catch (bordereauError) {
          console.log('No bordereau documents found, trying uploaded PDF...');
        }
      }

      // Priorité 2 : fallback OV manuel
      try {
        const response = await LocalAPI.get(`/finance/ordres-virement/${ovId}/uploaded-pdf`, {
          responseType: 'blob'
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        setUploadedPdfUrl(blobUrl);
        setUploadedPdfLoading(false);
        return;
      } catch (uploadedPdfError) {
        console.log('No uploaded PDF found');
      }

      setUploadedPdfError('Aucun PDF uploadé trouvé pour cet OV');
    } catch (error: any) {
      console.error('❌ Error loading uploaded PDF:', error);
      setUploadedPdfError(error.response?.data?.message || error.message || 'Erreur lors du chargement du PDF');
    } finally {
      setUploadedPdfLoading(false);
    }
  }, [ovId]);

  // ── Chargement du PDF OV généré ──
  const loadGeneratedPdf = useCallback(async () => {
    setGeneratedPdfLoading(true);
    setGeneratedPdfError(null);
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get(`/finance/ordres-virement/${ovId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      setGeneratedPdfUrl(blobUrl);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setGeneratedPdfError('Erreur lors du chargement du PDF OV');
    } finally {
      setGeneratedPdfLoading(false);
    }
  }, [ovId]);

  // Déclenche le chargement simultané dès l'arrivée sur l'Étape 4
  React.useEffect(() => {
    if (activeStep === 0 && ovDetails) {
      loadUploadedPdf(ovDetails);
      loadGeneratedPdf();
    }
  }, [activeStep, ovDetails]);

  const handleStep4Validation = async (approved: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validation/${ovId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            approved,
            comment: comment || undefined
          })
        }
      );

      if (response.ok) {
        setValidationStatus(approved ? 'approved' : 'rejected');
        if (approved) {
          setActiveStep(1); // Move to Step 5
        } else {
          alert('OV rejeté - Motif enregistré');
          onValidated();
          onClose();
        }
      } else {
        alert('Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFiles = async () => {
    setLoading(true);
    try {
      // Generate PDF
      const pdfResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/generate-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (pdfResponse.ok) {
        console.log('✅ PDF generated successfully');
        setPdfGenerated(true);
      } else {
        console.error('❌ PDF generation failed:', await pdfResponse.text());
      }

      // Generate TXT
      const txtResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/generate-txt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (txtResponse.ok) {
        console.log('✅ TXT generated successfully');
        setTxtGenerated(true);
      } else {
        console.error('❌ TXT generation failed:', await txtResponse.text());
        alert('Erreur lors de la génération du fichier TXT');
      }

      if (pdfResponse.ok && txtResponse.ok) {
        // Auto-download PDF
        const pdfBlob = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/pdf`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.blob());
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const pdfLink = document.createElement('a');
        pdfLink.href = pdfUrl;
        pdfLink.download = `OV_${ovReference}.pdf`;
        pdfLink.click();
        URL.revokeObjectURL(pdfUrl);

        // Auto-download TXT and show validator
        const txtBlob = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.blob());
        const txtUrl = URL.createObjectURL(txtBlob);
        const txtLink = document.createElement('a');
        txtLink.href = txtUrl;
        txtLink.download = `OV_${ovReference}.txt`;
        txtLink.click();
        URL.revokeObjectURL(txtUrl);

        // Fetch TXT content for validation (only for ATTIJARI format)
        const txtContentResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => r.text());

        // Check if it's ATTIJARI format (starts with 110104)
        if (txtContentResponse.trim().startsWith('110104')) {
          setTxtContent(txtContentResponse);
          setShowTxtValidator(true);
        }

        setActiveStep(2); // Move to Step 6
      }
    } catch (error) {
      console.error('❌ File generation failed:', error);
      alert('Erreur lors de la génération des fichiers: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalValidation = async (deposited: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validation/${ovId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            approved: deposited,
            comment: comment || undefined
          })
        }
      );

      if (response.ok) {
        setFinalizationComplete(true);
        alert(deposited ? 'Virement déposé avec succès!' : 'Virement marqué comme non validé');
        onValidated();
      } else {
        alert('Erreur lors de la finalisation');
      }
    } catch (error) {
      console.error('Final validation failed:', error);
      alert('Erreur lors de la finalisation');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // ÉTAPE 4 — Bordereau + OV affichés côte à côte (note client appliquée)
  // ─────────────────────────────────────────────────────────────────────
  const renderStep4 = () => {
    const isAlreadyValidated =
      ovDetails?.validationStatus === 'VALIDE' ||
      ovDetails?.validationStatus === 'REJETE_VALIDATION' ||
      ovDetails?.etatVirement === 'VIREMENT_DEPOSE' ||
      ovDetails?.etatVirement === 'VIREMENT_NON_VALIDE';
    const currentStatus = ovDetails?.etatVirement;
    const validationStatusValue = ovDetails?.validationStatus;

    return (
      <Box>
        {isAlreadyValidated && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${COLORS.warning}55`,
              borderLeft: `4px solid ${COLORS.warning}`,
              bgcolor: COLORS.warningBg
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <WarningAmber sx={{ color: COLORS.warning, fontSize: 26, mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.warning }}>
                  Cet OV a déjà été traité
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 1 }}>
                  <Chip
                    size="small"
                    label={
                      (currentStatus === 'VIREMENT_DEPOSE' && 'Virement Déposé') ||
                      (currentStatus === 'VIREMENT_NON_VALIDE' && 'Virement Non Validé') ||
                      (validationStatusValue === 'VALIDE' && 'Validé par Responsable') ||
                      (validationStatusValue === 'REJETE_VALIDATION' && 'Rejeté par Responsable') ||
                      'Statut inconnu'
                    }
                    sx={{
                      bgcolor: '#fff',
                      fontWeight: 600,
                      color: COLORS.warning,
                      border: `1px solid ${COLORS.warning}55`
                    }}
                  />
                </Box>
                {ovDetails?.validatedBy && (
                  <Typography variant="body2" sx={{ color: COLORS.slate }}>
                    Action effectuée par <strong>{ovDetails.validatedBy}</strong>
                    {ovDetails?.validatedAt && (
                      <> le {new Date(ovDetails.validatedAt).toLocaleString('fr-FR')}</>
                    )}
                  </Typography>
                )}
                {ovDetails?.validationComment && (
                  <Typography variant="body2" sx={{ color: COLORS.muted, mt: 0.5, fontStyle: 'italic' }}>
                    « {ovDetails.validationComment} »
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1.5, color: COLORS.slate, fontWeight: 600 }}>
                  Poursuivre modifiera le statut existant. Assurez-vous que c'est bien votre intention.
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.slate }}>
            Contrôle des documents
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.muted }}>
            Bordereau et Ordre de Virement affichés côte à côte pour comparaison directe
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <DocumentPanel
              title="Bordereau Uploadé"
              subtitle="Document source déposé par le Chef d'équipe"
              icon={<Description fontSize="small" />}
              url={uploadedPdfUrl}
              loading={uploadedPdfLoading}
              error={uploadedPdfError}
              onRetry={() => loadUploadedPdf(ovDetails)}
              onExpand={() =>
                uploadedPdfUrl && setPdfViewer({ open: true, url: uploadedPdfUrl, title: 'Bordereau Uploadé' })
              }
              accentColor={COLORS.accent}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DocumentPanel
              title="Ordre de Virement Généré"
              subtitle={`Document système — ${ovReference}`}
              icon={<PictureAsPdf fontSize="small" />}
              url={generatedPdfUrl}
              loading={generatedPdfLoading}
              error={generatedPdfError}
              onRetry={() => loadGeneratedPdf()}
              onExpand={() =>
                generatedPdfUrl && setPdfViewer({ open: true, url: generatedPdfUrl, title: `PDF OV - ${ovReference}` })
              }
              accentColor={COLORS.navy}
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Motif / Commentaire"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Motif du rejet ou commentaire..."
          sx={{ mt: 3 }}
        />
      </Box>
    );
  };

  const renderStep5 = () => (
    <Box>
      <Alert severity="success" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <strong>Étape 5 —</strong> Validation approuvée. Génération des fichiers finaux.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${pdfGenerated ? COLORS.success : COLORS.border}`,
              bgcolor: pdfGenerated ? COLORS.successBg : '#fff'
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <PictureAsPdf sx={{ color: pdfGenerated ? COLORS.success : '#B0BAC9', fontSize: 30 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.slate }}>
                  PDF Final de l'OV
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.muted }}>
                  {pdfGenerated ? 'Généré avec succès' : 'En attente de génération'}
                </Typography>
              </Box>
              {pdfGenerated && <CheckCircle sx={{ color: COLORS.success }} />}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${txtGenerated ? COLORS.success : COLORS.border}`,
              bgcolor: txtGenerated ? COLORS.successBg : '#fff'
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Description sx={{ color: txtGenerated ? COLORS.success : '#B0BAC9', fontSize: 30 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.slate }}>
                  Fichier TXT
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.muted }}>
                  {txtGenerated ? 'Généré avec succès' : 'En attente de génération'}
                </Typography>
              </Box>
              {txtGenerated && <CheckCircle sx={{ color: COLORS.success }} />}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {!pdfGenerated || !txtGenerated ? (
        <>
          <Button
            variant="contained"
            onClick={handleGenerateFiles}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <GetApp />}
            fullWidth
            size="large"
            sx={{
              bgcolor: COLORS.navy,
              borderRadius: 2,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: COLORS.navyLight }
            }}
          >
            {loading ? 'Génération en cours…' : 'Générer les fichiers'}
          </Button>
          {loading && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
        </>
      ) : (
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          Fichiers générés avec succès — vous pouvez passer à la finalisation.
        </Alert>
      )}
    </Box>
  );

  const renderStep6 = () => {
    if (finalizationComplete) {
      return (
        <Box>
          <Alert severity="success" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            <strong>Étape 6 —</strong> Finalisation terminée
          </Alert>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.bgLight,
              textAlign: 'center'
            }}
          >
            <Archive sx={{ fontSize: 40, color: COLORS.navy, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.slate }}>
              Processus terminé avec succès
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.muted, mt: 1 }}>
              {new Date().toLocaleString('fr-FR')} · Responsable Département · OV {ovReference}
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.muted, mt: 1 }}>
              L'ordre de virement a été traité et archivé. Vous pouvez fermer cette fenêtre.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Alert severity="warning" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Étape 6 —</strong> Choisissez le statut final
        </Alert>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper
              onClick={() => setFinalStatus('deposited')}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                border: finalStatus === 'deposited' ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.border}`,
                bgcolor: finalStatus === 'deposited' ? COLORS.successBg : '#fff',
                transition: 'all .15s ease',
                '&:hover': { borderColor: COLORS.success }
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: COLORS.success, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.success }}>
                Virement Déposé
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.muted }}>
                Tout est conforme, le virement est validé
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              onClick={() => setFinalStatus('not_validated')}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                border: finalStatus === 'not_validated' ? `2px solid ${COLORS.error}` : `1px solid ${COLORS.border}`,
                bgcolor: finalStatus === 'not_validated' ? COLORS.errorBg : '#fff',
                transition: 'all .15s ease',
                '&:hover': { borderColor: COLORS.error }
              }}
            >
              <Cancel sx={{ fontSize: 40, color: COLORS.error, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.error }}>
                Virement Non Validé
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.muted }}>
                Erreur détectée, le virement est rejeté
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {finalStatus === 'not_validated' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motif du rejet (obligatoire)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précisez le motif du rejet..."
            required
            sx={{ mb: 1 }}
          />
        )}
      </Box>
    );
  };

  const getStepActions = () => {
    switch (activeStep) {
      case 0: // Step 4
        return (
          <>
            <Button onClick={onClose} disabled={loading} sx={{ color: COLORS.muted, textTransform: 'none' }}>
              Fermer
            </Button>
            <Button
              onClick={() => handleStep4Validation(false)}
              disabled={loading}
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Rejeter
            </Button>
            <Button
              onClick={() => handleStep4Validation(true)}
              disabled={loading}
              variant="contained"
              startIcon={<CheckCircle />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: COLORS.success,
                '&:hover': { bgcolor: '#146b3a' }
              }}
            >
              Approuver
            </Button>
          </>
        );
      case 1: // Step 5
        return (
          <>
            <Button onClick={() => setActiveStep(0)} sx={{ color: COLORS.muted, textTransform: 'none' }}>
              Retour
            </Button>
            <Button
              onClick={() => setActiveStep(2)}
              disabled={!pdfGenerated || !txtGenerated}
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: COLORS.navy,
                '&:hover': { bgcolor: COLORS.navyLight }
              }}
            >
              Continuer vers Finalisation
            </Button>
          </>
        );
      case 2: // Step 6
        if (finalizationComplete) {
          return (
            <>
              <Button onClick={() => setActiveStep(1)} sx={{ color: COLORS.muted, textTransform: 'none' }}>
                Retour
              </Button>
              <Button
                onClick={onClose}
                variant="contained"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: COLORS.navy,
                  '&:hover': { bgcolor: COLORS.navyLight }
                }}
              >
                Fermer
              </Button>
            </>
          );
        } else {
          return (
            <>
              <Button onClick={() => setActiveStep(1)} sx={{ color: COLORS.muted, textTransform: 'none' }}>
                Retour
              </Button>
              <Button
                onClick={() => {
                  if (finalStatus === 'deposited') {
                    handleFinalValidation(true);
                  } else if (finalStatus === 'not_validated') {
                    handleFinalValidation(false);
                  }
                }}
                disabled={loading || !finalStatus || (finalStatus === 'not_validated' && !comment.trim())}
                variant="contained"
                startIcon={
                  loading ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : finalStatus === 'deposited' ? (
                    <CheckCircle />
                  ) : (
                    <Cancel />
                  )
                }
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: finalStatus === 'deposited' ? COLORS.success : COLORS.error,
                  '&:hover': { bgcolor: finalStatus === 'deposited' ? '#146b3a' : '#9a2d21' }
                }}
              >
                {loading ? 'Finalisation...' : 'Finaliser'}
              </Button>
            </>
          );
        }
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '92vh', borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 100%)`,
            color: '#fff',
            px: 3,
            py: 2.5,
            position: 'relative'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Validation Ordre de Virement — {ovReference}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
            Processus de validation · Responsable de Département
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.85)' }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: COLORS.bgLight }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '0.85rem' },
                    '& .Mui-active': { color: `${COLORS.navy} !important` },
                    '& .Mui-completed': { color: `${COLORS.success} !important` }
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Fade in key={activeStep} timeout={300}>
          <Box>
            {activeStep === 0 && renderStep4()}
            {activeStep === 1 && renderStep5()}
            {activeStep === 2 && renderStep6()}
          </Box>
        </Fade>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: `1px solid ${COLORS.border}`, bgcolor: '#fff' }}>
        {getStepActions()}
      </DialogActions>

      {/* Visualiseur plein écran (réutilisé par les 2 panneaux via le bouton "Plein écran") */}
      <Dialog
        open={pdfViewer.open}
        onClose={() => setPdfViewer({ open: false, url: '', title: '' })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '92vh', borderRadius: 2 } }}
      >
        <DialogTitle sx={{ py: 1.5, px: 2.5, borderBottom: `1px solid ${COLORS.border}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.slate }}>
              {pdfViewer.title}
            </Typography>
            <IconButton size="small" onClick={() => setPdfViewer({ open: false, url: '', title: '' })}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {pdfViewer.url ? (
            <iframe
              src={pdfViewer.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={pdfViewer.title}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default OVValidationModal;