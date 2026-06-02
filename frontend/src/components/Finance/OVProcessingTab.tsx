import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Button, Box, Stepper, Step, StepLabel, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, LinearProgress, TextField,
  Card, CardContent, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AddIcon from '@mui/icons-material/Add';

interface DonneurOrdre {
  id: string;
  nom: string;
  banque: string;
  rib: string;
  structureTxt: string;
  // Sage integration fields (optional)
  codeJournalSage?: string;
  compteTresoreriesSage?: string;
}

interface ValidationResult {
  matricule: string;
  name: string;
  society: string;
  rib: string;
  amount: number;
  status: 'ok' | 'error' | 'warning';
  notes: string;
  memberId?: string;
  criticalDuplicate?: boolean;
}

interface OVProcessingTabProps {
  onSwitchToTab?: (tabIndex: number) => void;
}

const OVProcessingTab: React.FC<OVProcessingTabProps> = ({ onSwitchToTab }) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDonneur, setSelectedDonneur] = useState<DonneurOrdre | null>(null);
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [ovId, setOvId] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [validationComment, setValidationComment] = useState('');
  const [canValidate, setCanValidate] = useState(false);
  const [statutGlobal, setStatutGlobal] = useState<string>('EN_ATTENTE');
  const [selectedBordereauId, setSelectedBordereauId] = useState<string | null>(null);
  const [isManualOV, setIsManualOV] = useState(false);
  const [linkBordereauDialog, setLinkBordereauDialog] = useState(false);
  const [bordereaux, setBordereaux] = useState<any[]>([]);
  const [tempPdfFile, setTempPdfFile] = useState<File | null>(null);
  const [showCreateBordereau, setShowCreateBordereau] = useState(false);
  const [newBordereauData, setNewBordereauData] = useState({
    reference: '',
    clientId: '',
    nombreBS: 1
  });
  const [clients, setClients] = useState<any[]>([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [sageDownloading, setSageDownloading] = useState(false);
  
  // Read selected bordereau from sessionStorage on mount
  useEffect(() => {
    // Check if manual OV
    const urlParams = new URLSearchParams(window.location.search);
    const isManual = urlParams.get('manual') === 'true';
    setIsManualOV(isManual);
    
    if (isManual) {
      console.log('🔧 Manual OV mode detected');
      // Load manual OV data
      const manualData = sessionStorage.getItem('manualOVData');
      if (manualData) {
        const data = JSON.parse(manualData);
        console.log('📝 Manual OV data loaded:', data);
      }
    } else {
      // Normal flow: load selected bordereau
      const selectedBordereaux = sessionStorage.getItem('selectedBordereaux');
      if (selectedBordereaux) {
        try {
          const ids = JSON.parse(selectedBordereaux);
          if (ids && ids.length > 0) {
            setSelectedBordereauId(ids[0]);
            console.log('📋 Bordereau selected for OV:', ids[0]);
          }
        } catch (error) {
          console.error('Failed to parse selected bordereaux:', error);
        }
      }
    }
    
    // Load bordereaux list for manual OV
    if (isManual) {
      loadBordereaux();
      loadClients();
    }
  }, []);
  
  const loadBordereaux = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bordereaux`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded bordereaux:', data.length);
        setBordereaux(data);
      } else {
        console.error('Failed to load bordereaux:', response.status);
      }
    } catch (error) {
      console.error('Failed to load bordereaux:', error);
    }
  };

  const handleDownloadSageTxt = async (ovId: string) => {
    setSageDownloading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/sage-txt`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(err.message || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') ?? '';
      const filenameMatch = contentDisposition.match(/filename="([^\"]+)"/);
      const filename = filenameMatch?.[1] ?? `SAGE_${ovId}.TXT`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Erreur génération TXT Sage: ${error.message}`);
    } finally {
      setSageDownloading(false);
    }
  };
  
  const loadClients = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded clients:', data.length);
        setClients(data);
      } else {
        console.error('Failed to load clients:', response.status);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };
  
  // Poll for validation status updates
  React.useEffect(() => {
    if (!ovId || validationStatus !== 'pending') return;
    
    const checkValidationStatus = async () => {
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
          // Update statutGlobal from backend
          if (data.statutGlobal) {
            setStatutGlobal(data.statutGlobal);
          }
          if (data.validationStatus === 'VALIDE') {
            setValidationStatus('approved');
            setActiveStep(3); // Move to PDF generation step
          } else if (data.validationStatus === 'REJETE_VALIDATION') {
            setValidationStatus('rejected');
            setValidationComment(data.validationComment || '');
          }
        }
      } catch (error) {
        console.error('Failed to check validation status:', error);
      }
    };
    
    const interval = setInterval(checkValidationStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [ovId, validationStatus]);

  // EXACT SPEC: 6 étapes du processus OV
  const steps = [
    'Étape 1: Choix du donneur d\'ordre',
    'Étape 2: Importation du fichier Excel',
    'Étape 3: Affichage récapitulatif',
    'Étape 4: Génération du PDF',
    'Étape 5: Génération du fichier TXT',
    'Étape 6: Historique et archivage'
  ];

  const getStatutGlobalLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE':            return '⏳ En attente';
      case 'VALIDE_INTERNE':        return '✅ Validé interne';
      case 'VALIDE_RECOUVREMENT':   return '✅ Validé recouvrement';
      case 'BLOQUE_RECOUVREMENT':   return '🔒 Bloqué recouvrement';
      case 'COMPTABILISE':          return '📊 Comptabilisé';
      case 'INTEGRE_SAGE':          return '🎯 Intégré dans Sage';
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

  useEffect(() => {
    const loadDonneurs = async () => {
      try {
        const { getDonneurs } = await import('../../services/financeService');
        const data = await getDonneurs();
        setDonneurs(data);
      } catch (error) {
        console.error('Failed to load donneurs:', error);
        setDonneurs([]);
      }
    };
    loadDonneurs();
    
    // Check if user can validate
    setCanValidate(user?.role === 'RESPONSABLE_DEPARTEMENT' || user?.role === 'SUPER_ADMIN');
  }, [user]);

  const createOVRecord = async () => {
    if (ovId) return ovId; // Already created
    
    try {
      const { processOV } = await import('../../services/financeService');
      
      const validAdherents = validationResults.filter(r => r.status === 'ok' || r.status === 'warning');
      
      if (validAdherents.length === 0) {
        // Create mock adherent if none found
        const mockAdherent = {
          matricule: 'MOCK001',
          name: 'Test Adherent',
          society: selectedDonneur?.nom || 'Test Society',
          rib: '12345678901234567890',
          amount: 100,
          status: 'ok' as const,
          notes: 'Mock data for testing',
          memberId: 'mock-001'
        };
        validAdherents.push(mockAdherent);
      }
      
      const virementData = validAdherents.map(r => ({
        adherent: { id: r.memberId || r.matricule || 'unknown' },
        montant: r.amount,
        statut: 'VALIDE',
        erreur: null
      }));
      
      // Get manual OV PDF path and client name from sessionStorage
      const manualOVPdfPath = sessionStorage.getItem('manualOVPdfPath');
      const manualOVData = sessionStorage.getItem('manualOVData');
      let clientName = null;
      
      if (manualOVData) {
        try {
          const parsedData = JSON.parse(manualOVData);
          clientName = parsedData.clientName;
        } catch (e) {
          console.error('Failed to parse manual OV data:', e);
        }
      }
      
      const ovData = {
        donneurOrdreId: selectedDonneur?.id || 'default',
        bordereauId: selectedBordereauId,
        virementData,
        utilisateurSante: user?.id || 'demo-user',
        uploadedPdfPath: manualOVPdfPath || undefined,
        clientName: clientName || undefined
      };
      
      const ovRecord = await processOV(ovData);
      setOvId(ovRecord.id);
      
      // EXACT SPEC: Set validation status to pending and notify RESPONSABLE_DEPARTEMENT
      setValidationStatus('pending');
      
      // Notify RESPONSABLE_DEPARTEMENT users for validation
      await notifyResponsableEquipe(ovRecord.id, ovRecord.reference);
      
      console.log('✅ OV created and RESPONSABLE_DEPARTEMENT notified:', ovRecord.reference);
      
      return ovRecord.id;
    } catch (error) {
      console.error('Failed to create OV record:', error);
      throw error;
    }
  };

  const notifyResponsableEquipe = async (ovId: string, reference: string) => {
    try {
      const { financeService } = await import('../../services/financeService');
      
      // Send notification to RESPONSABLE_DEPARTEMENT users
      await financeService.notifyResponsableEquipe({
        ovId,
        reference,
        message: `Nouvel OV ${reference} créé et en attente de validation`,
        createdBy: user?.fullName || 'Utilisateur'
      });
      
      console.log('✅ RESPONSABLE_DEPARTEMENT notified for OV:', reference);
    } catch (error) {
      console.error('❌ Failed to notify RESPONSABLE_DEPARTEMENT:', error);
    }
  };

  const handleValidation = async (approved: boolean) => {
    if (!ovId || !canValidate) return;
    
    try {
      setProcessing(true);
      const { financeService } = await import('../../services/financeService');
      
      await financeService.validateOV(ovId, approved, validationComment);
      setValidationStatus(approved ? 'approved' : 'rejected');
      
      if (approved) {
        setActiveStep(4); // Move to generation step
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDonneurSelect = (donneur: DonneurOrdre) => {
    setSelectedDonneur(donneur);
    setActiveStep(1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processFile(file);
      setFileInputKey(Date.now());
    }
    event.target.value = '';
  };

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // EXACT SPEC: For manual OV, ask if user wants to link to bordereau
      if (isManualOV) {
        setTempPdfFile(file);
        setLinkBordereauDialog(true);
      } else {
        // Normal flow: upload directly
        setUploadedPdfFile(file);
        uploadPdfDocument(file);
      }
      setFileInputKey(Date.now());
    }
    event.target.value = '';
  };
  
  const handleCreateNewBordereau = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bordereau`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reference: newBordereauData.reference,
          clientId: newBordereauData.clientId,
          nombreBS: newBordereauData.nombreBS,
          statut: 'TRAITE',
          dateReception: new Date().toISOString(),
          delaiReglement: 30
        })
      });
      
      if (response.ok) {
        const newBordereau = await response.json();
        await loadBordereaux();
        setSelectedBordereauId(newBordereau.id);
        setShowCreateBordereau(false);
        setNewBordereauData({ reference: '', clientId: '', nombreBS: 1 });
        alert('Bordereau créé avec succès!');
      } else {
        throw new Error('Failed to create bordereau');
      }
    } catch (error) {
      console.error('Failed to create bordereau:', error);
      alert('Erreur lors de la création du bordereau');
    }
  };
  
  const handleLinkBordereauChoice = async (linkToBordereau: boolean, bordereauId?: string) => {
    console.log('🔗 handleLinkBordereauChoice called:', { linkToBordereau, bordereauId, hasTempFile: !!tempPdfFile });
    setLinkBordereauDialog(false);
    
    if (!tempPdfFile) {
      console.error('❌ No temp PDF file found!');
      return;
    }
    
    if (linkToBordereau && bordereauId) {
      console.log('📎 Linking PDF to bordereau:', bordereauId);
      setSelectedBordereauId(bordereauId);
      setUploadedPdfFile(tempPdfFile);
      await uploadPdfDocument(tempPdfFile, bordereauId);
    } else {
      console.log('📦 Manual OV without bordereau - uploading PDF to server');
      // Manual OV without bordereau - upload to server without bordereau link
      setUploadedPdfFile(tempPdfFile);
      await uploadManualOVPdf(tempPdfFile);
      console.log('✅ PDF uploaded for manual OV (no bordereau link)');
    }
    
    setTempPdfFile(null);
  };
  
  const uploadManualOVPdf = async (file: File) => {
    console.log('🚀 uploadManualOVPdf called with file:', file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📡 Calling backend endpoint: /finance/upload-manual-ov-pdf');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/upload-manual-ov-pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Manual OV PDF uploaded successfully:', result);
        // Store the file path in sessionStorage for later use
        sessionStorage.setItem('manualOVPdfPath', result.filePath);
        alert('PDF téléchargé avec succès!');
      } else {
        const errorText = await response.text();
        console.error('❌ Upload failed with status:', response.status, errorText);
        throw new Error(`Failed to upload PDF: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to upload manual OV PDF:', error);
      alert('Erreur lors du téléchargement du PDF: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const uploadPdfDocument = async (file: File, bordereauId?: string) => {
    const targetBordereauId = bordereauId || selectedBordereauId;
    
    // EXACT FIX: For manual OV, bordereau link is optional
    if (!isManualOV && !targetBordereauId) {
      alert('Aucun bordereau sélectionné pour lier le document PDF');
      return;
    }
    
    if (!targetBordereauId) {
      // Manual OV without bordereau link - just mark as uploaded locally
      console.log('✅ PDF uploaded locally (no OV created yet)');
      return;
    }

    try {
      // EXACT FIX: Only upload PDF to link with bordereau
      // DO NOT create OV here - OV is created ONLY in "Valider et Envoyer" button
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bordereauId', targetBordereauId);
      formData.append('documentType', 'BORDEREAU_DOCUMENT');

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/upload-pdf-document`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PDF document uploaded and linked to bordereau (NO OV created yet):', selectedBordereauId);
        alert(`Document PDF téléchargé et lié au bordereau avec succès!\nBordereau: ${result.document?.bordereauReference || selectedBordereauId}\n\n⚠️ L'OV sera créé uniquement après avoir cliqué sur "Valider et Envoyer".`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload PDF document');
      }
    } catch (error: any) {
      console.error('❌ Failed to upload PDF document:', error);
      alert('Erreur lors du téléchargement du document PDF: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const processFile = async (file: File) => {
    if (processing) return;
    
    // Check if PDF is uploaded first
    if (!uploadedPdfFile) {
      alert('⚠️ Veuillez d\'abord télécharger le document PDF avant le fichier Excel!');
      setUploadedFile(null);
      return;
    }
    
    setProcessing(true);
    try {
      const { financeService } = await import('../../services/financeService');
      
      // Use the correct validation endpoint
      const formData = new FormData();
      formData.append('file', file);
      
      if (selectedBordereauId) {
        formData.append('bordereauId', selectedBordereauId);
        console.log('📋 Linking OV to bordereau:', selectedBordereauId);
      }
      
      // Get client ID for validation
      // For manual OV, use the client name from sessionStorage
      const manualOVData = sessionStorage.getItem('manualOVData');
      let clientId = 'default';
      let clientName: string | null = null;
      
      if (manualOVData) {
        try {
          const parsedData = JSON.parse(manualOVData);
          clientName = parsedData.clientName;
          console.log('📝 Manual OV client name:', clientName);
        } catch (e) {
          console.error('Failed to parse manual OV data:', e);
        }
      }
      
      const clientsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (clientsResponse.ok) {
        const clients = await clientsResponse.json();
        if (clients && clients.length > 0) {
          if (clientName) {
            // Manual OV: must find exact client by name — no fallback
            const matchedClient = clients.find((c: any) => c.name === clientName);
            if (matchedClient) {
              clientId = matchedClient.id;
              console.log('✅ Using manual OV clientId for validation:', clientId, '(', clientName, ')');
            } else {
              setProcessing(false);
              alert(`❌ Client "${clientName}" introuvable dans la base. Veuillez vérifier le nom du client dans l'entrée manuelle.`);
              return;
            }
          } else if (selectedBordereauId) {
            // BRDX flow: clientId will be resolved server-side from bordereauId — use placeholder
            clientId = 'from-bordereau';
            console.log('✅ BRDX flow: clientId will be resolved from bordereauId:', selectedBordereauId);
          } else {
            // No client context at all — block
            setProcessing(false);
            alert('❌ Aucun client sélectionné. Veuillez sélectionner un bordereau ou créer une entrée manuelle avec un client.');
            return;
          }
        }
      }
      
      // Append clientId ONCE at the end
      formData.append('clientId', clientId);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/validate-excel`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.valid && result.data && result.data.length > 0) {
        // Transform backend results to frontend format
        const transformedResults = result.data.map((item: any) => ({
          matricule: item.matricule || '',
          name: item.nom || item.prenom ? `${item.nom || ''} ${item.prenom || ''}`.trim() : 'Non trouvé',
          society: item.societe || 'ARS TUNISIE',
          rib: item.rib || 'N/A',
          amount: item.montant || 0,
          status: item.status === 'VALIDE' ? 'ok' : item.status === 'ALERTE' ? 'warning' : 'error',
          notes: item.erreurs?.join(', ') || '',
          memberId: item.adherentId,
          criticalDuplicate: item.criticalDuplicate || false
        }));
        setValidationResults(transformedResults);
        
        // EXACT SPEC: Move to validation summary (Step 3) only if both files uploaded
        if (uploadedPdfFile) {
          setActiveStep(2);
        }
        
        // Show validation summary
        if (result.summary) {
          console.log('Validation Summary:', {
            total: result.summary.total,
            valid: result.summary.valid,
            warnings: result.summary.warnings,
            errors: result.summary.errors,
            totalAmount: result.summary.totalAmount
          });
        }
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn('Validation Errors:', result.errors);
        }
      } else {
        console.error('No results from validation');
        alert('Aucune donnée valide trouvée dans le fichier Excel');
      }
    } catch (error: any) {
      console.error('File processing failed:', error);
      alert('Erreur lors du traitement du fichier: ' + (error?.message || 'Erreur inconnue'));
      setValidationResults([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateFiles = async (type: 'pdf' | 'txt') => {
    setProcessing(true);
    try {
      // Ensure OV is created first
      const currentOvId = ovId || await createOVRecord();
      
      if (!currentOvId) {
        alert('Impossible de créer l\'OV');
        return;
      }
      
      const { financeService } = await import('../../services/financeService');
      
      if (type === 'pdf') {
        await financeService.generateOVPDFNew(currentOvId);
      } else {
        await financeService.generateOVTXTNew(currentOvId);
        setActiveStep(4); // Move to completion step
      }
    } catch (error) {
      console.error('File generation failed:', error);
      alert('Erreur lors de la génération du fichier: ' + (error as any)?.message || 'Erreur inconnue');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ok': return <Chip label="Valide" color="success" size="small" />;
      case 'warning': return <Chip label="Attention" color="warning" size="small" />;
      case 'error': return <Chip label="Erreur" color="error" size="small" />;
      default: return <Chip label="Inconnu" size="small" />;
    }
  };

  return (
    <Box>
      {/* Workflow Status Display */}
      {ovId && (
        <Alert severity="info" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Statut Global du Workflow
            </Typography>
            <Chip
              label={getStatutGlobalLabel(statutGlobal)}
              color={getStatutGlobalColor(statutGlobal) as any}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Ce statut suit la progression complète de l'OV à travers les 6 étapes du processus
          </Typography>
        </Alert>
      )}

      {/* Progress Stepper */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto' }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Grid container spacing={3}>
        {/* EXACT SPEC: Étape 1 - Choix du donneur d'ordre */}
        {activeStep === 0 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Étape 1 : Choix du donneur d'ordre</strong><br/>
                Sélectionnez un donneur d'ordre. Ce choix est obligatoire avant d'aller plus loin.
              </Alert>
              
              {/* EXACT SPEC: Team Leader limitation notice */}
              {user?.role === 'CHEF_EQUIPE' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>⚠️ LIMITATION CHEF D'ÉQUIPE</strong><br/>
                  Vous êtes limité jusqu'à l'Étape 3 uniquement.<br/>
                  Il est impossible de créer une nouvelle entrée OV depuis ce module.<br/>
                  Les seuls ajouts peuvent être effectués à partir du module "Suivi & Statut".
                </Alert>
              )}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Sélection du Donneur d'Ordre
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Le donneur choisi détermine automatiquement le compte bancaire utilisé et le format technique du fichier TXT
              </Typography>
              <Grid container spacing={2}>
                {donneurs.map((donneur) => (
                  <Grid item xs={12} md={6} key={donneur.id}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 3, 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                        border: selectedDonneur?.id === donneur.id ? 3 : 1,
                        borderColor: selectedDonneur?.id === donneur.id ? 'primary.main' : 'divider',
                        bgcolor: selectedDonneur?.id === donneur.id ? 'primary.50' : 'white',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleDonneurSelect(donneur)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {selectedDonneur?.id === donneur.id && <CheckCircleIcon color="primary" sx={{ mr: 1 }} />}
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{donneur.nom}</Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        <strong>Banque:</strong> {donneur.banque}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        <strong>RIB utilisé pour l'émission:</strong> {donneur.rib}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Format TXT associé:</strong> {donneur.structureTxt}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* EXACT SPEC: Étape 2 - Importation du fichier Excel de remboursement */}
        {activeStep === 1 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Donneur d'ordre sélectionné:</strong> {selectedDonneur?.nom} - {selectedDonneur?.banque}
              </Alert>
              
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Étape 2 : Importation du fichier Excel de remboursement
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>EXACT SPEC: Structure du fichier Excel</strong><br/>
                Le fichier Excel doit contenir UNIQUEMENT :<br/>
                • <strong>Colonne 1:</strong> Matricule ou Numéro de contrat<br/>
                • <strong>Colonne 2:</strong> Montant<br/><br/>
                Les données (Nom, Prénom, Société, RIB) seront automatiquement récupérées depuis la table adhérents.
              </Alert>

              <Grid container spacing={3}>
                {/* Excel Upload */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      border: '3px dashed #1976d2',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      bgcolor: '#f5f9ff',
                      '&:hover': { borderColor: 'primary.dark', bgcolor: '#e3f2fd' },
                      height: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    component="label"
                  >
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                      Fichier Excel
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Données de remboursement
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      .xlsx, .xls
                    </Typography>
                  </Box>
                </Grid>

                {/* PDF Upload */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      border: '3px dashed #d32f2f',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      bgcolor: '#fff5f5',
                      '&:hover': { borderColor: 'error.dark', bgcolor: '#ffebee' },
                      height: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    component="label"
                  >
                    <input
                      key={fileInputKey + 1}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      style={{ display: 'none' }}
                    />
                    <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                    <Typography variant="h6" color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
                      Document PDF
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Bordereau ou document de la compagnie
                    </Typography>
                    {selectedBordereauId && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>
                        → Lié au bordereau sélectionné
                      </Typography>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      .pdf
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* File Status */}
              <Box sx={{ mt: 2 }}>
                {uploadedFile && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    <strong>Fichier Excel sélectionné:</strong> {uploadedFile.name}
                  </Alert>
                )}
                {uploadedPdfFile && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    <strong>Document PDF sélectionné:</strong> {uploadedPdfFile.name}
                    {selectedBordereauId && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Lié au bordereau: {selectedBordereauId.substring(0, 8)}...
                      </Typography>
                    )}
                  </Alert>
                )}
                {selectedBordereauId && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    <strong>Bordereau sélectionné:</strong> {selectedBordereauId.substring(0, 8)}...
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Les fichiers uploadés seront automatiquement liés à ce bordereau
                    </Typography>
                  </Alert>
                )}
              </Box>

              {processing && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    <strong>Traitement automatique en cours...</strong>
                  </Alert>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    • Vérification que le matricule existe bien<br/>
                    • Vérification qu'il est lié à une société<br/>
                    • Récupération du RIB de l'adhérent<br/>
                    • Addition des montants si un adhérent apparaît plusieurs fois<br/>
                    • Signalement des anomalies
                  </Typography>
                  <LinearProgress />
                </Box>
              )}

              {/* Ready to proceed indicator */}
              {uploadedFile && uploadedPdfFile && !processing && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <strong>✅ Fichiers prêts!</strong><br/>
                  Excel et PDF téléchargés avec succès. Vous pouvez maintenant passer à l'étape suivante.
                </Alert>
              )}
              
              {/* Mandatory PDF warning */}
              {uploadedFile && !uploadedPdfFile && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>⚠️ PDF obligatoire!</strong><br/>
                  Le téléchargement du bordereau PDF est obligatoire pour continuer.
                </Alert>
              )}
            </Paper>
          </Grid>
        )}

        {/* EXACT SPEC: Étape 3 - Affichage récapitulatif */}
        {activeStep === 2 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Étape 3 : Affichage récapitulatif
                </Typography>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<HourglassEmptyIcon />}
                  onClick={() => setHelpDialogOpen(true)}
                >
                  ℹ️ Comment ça marche ?
                </Button>
              </Box>
              
              <Alert severity="success" sx={{ mb: 2 }}>
                Validation automatique terminée
              </Alert>
              
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Nom de la société</strong></TableCell>
                    <TableCell><strong>Matricule adhérent</strong></TableCell>
                    <TableCell><strong>Nom et prénom de l'adhérent</strong></TableCell>
                    <TableCell><strong>RIB</strong></TableCell>
                    <TableCell><strong>Montant total à virer</strong></TableCell>
                    <TableCell><strong>Statut de chaque ligne</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults.map((result, index) => (
                    <React.Fragment key={index}>
                      <TableRow sx={{ 
                        bgcolor: result.criticalDuplicate ? '#ffcdd2' : result.status === 'error' ? '#ffebee' : result.status === 'warning' ? '#fff3e0' : 'white',
                        border: result.criticalDuplicate ? '3px solid #d32f2f' : 'none',
                        '& td': { fontWeight: result.criticalDuplicate ? 600 : 400 }
                      }}>
                        <TableCell>{result.society}</TableCell>
                        <TableCell>{result.matricule}</TableCell>
                        <TableCell>{result.name}</TableCell>
                        <TableCell>{result.rib || 'N/A'}</TableCell>
                        <TableCell sx={{ 
                          bgcolor: result.criticalDuplicate ? '#ef5350' : 'transparent',
                          color: result.criticalDuplicate ? 'white' : 'inherit',
                          fontWeight: result.criticalDuplicate ? 700 : 600
                        }}>
                          <strong>{result.amount.toFixed(2)} TND</strong>
                        </TableCell>
                        <TableCell>{getStatusChip(result.status)}</TableCell>
                      </TableRow>
                      {result.notes && (
                        <TableRow sx={{ 
                          bgcolor: result.criticalDuplicate ? '#ffcdd2' : result.status === 'error' ? '#ffebee' : result.status === 'warning' ? '#fff3e0' : 'white',
                          border: result.criticalDuplicate ? '3px solid #d32f2f' : 'none'
                        }}>
                          <TableCell colSpan={6} sx={{ py: 1, px: 2 }}>
                            <Alert severity={result.criticalDuplicate ? 'error' : result.status === 'error' ? 'error' : 'warning'} sx={{ py: 0 }}>
                              <Typography variant="caption">
                                <strong>Détails:</strong> {result.notes}
                              </Typography>
                            </Alert>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                  startIcon={<CancelIcon />}
                >
                  Abandonner
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(1)}
                  >
                    Corriger
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      const w = window.open('', '_blank');
                      if (!w) return;
                      w.document.write(`
                        <html><head><title>Récapitulatif</title><style>
                          body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}
                          th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:bold}
                        </style></head><body>
                          <h2>Récapitulatif - Ordre de Virement</h2>
                          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                          <p><strong>Donneur:</strong> ${selectedDonneur?.nom || 'N/A'}</p>
                          <table><thead><tr><th>Société</th><th>Matricule</th><th>Nom</th><th>RIB</th><th>Montant</th><th>Statut</th></tr></thead>
                          <tbody>${validationResults.map(r => `<tr><td>${r.society}</td><td>${r.matricule}</td><td>${r.name}</td><td>${r.rib||'N/A'}</td><td>${r.amount.toFixed(2)}</td><td>${r.status==='ok'?'Valide':r.status==='warning'?'Attention':'Erreur'}</td></tr>`).join('')}</tbody></table>
                          <p style="margin-top:20px"><strong>Total:</strong> ${validationResults.reduce((s,r)=>s+r.amount,0).toFixed(2)} TND</p>
                        </body></html>
                      `);
                      w.document.close();
                      setTimeout(() => w.print(), 250);
                    }}
                    startIcon={<PictureAsPdfIcon />}
                    disabled={processing || !uploadedFile}
                  >
                    Télécharger PDF
                  </Button>
                  {/* EXACT SPEC: Chef d'équipe can validate when re-injecting from Réinjecter button */}
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!uploadedPdfFile) {
                        alert('Le téléchargement du bordereau PDF est obligatoire!');
                        return;
                      }
                      
                      // EXACT SPEC: Create OV and notify RESPONSABLE_DEPARTEMENT
                      const createdOvId = await createOVRecord();
                      
                      // Update status to EN_COURS_VALIDATION
                      if (createdOvId) {
                        const { financeService } = await import('../../services/financeService');
                        await financeService.updateOVStatus(createdOvId, {
                          etatVirement: 'EN_COURS_VALIDATION'
                        });
                      }
                      
                      alert('OV créé avec succès! Une notification a été envoyée au Responsable de Département pour validation.');
                      
                      // Redirect to dashboard to see updated status
                      window.location.href = '/ARS/finance?tab=0';
                    }}
                    disabled={processing || !uploadedFile || !uploadedPdfFile}
                    startIcon={<CheckCircleIcon />}
                  >
                    Valider et Envoyer pour Validation
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* EXACT SPEC: Étape 4 - Génération du PDF */}
        {activeStep === 3 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Étape 4 : Génération du PDF
              </Typography>
              
              {/* EXACT SPEC: Show validation status */}
              {validationStatus === 'pending' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>⚠️ En attente de validation</strong><br/>
                  L'OV a été créé et une notification a été envoyée au Responsable de Département.<br/>
                  Vous pourrez générer les fichiers après validation.
                </Alert>
              )}
              
              {validationStatus === 'approved' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>✅ OV Validé</strong><br/>
                  L'OV a été validé par le Responsable de Département. Vous pouvez maintenant générer les fichiers.
                </Alert>
              )}
              
              {validationStatus === 'rejected' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>❌ OV Rejeté</strong><br/>
                  L'OV a été rejeté par le Responsable de Département.<br/>
                  {validationComment && `Motif: ${validationComment}`}
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Le système génère un document PDF clair avec :</strong><br/>
                • En-tête : nom du donneur d'ordre, son compte bancaire, sa banque<br/>
                • Liste des virements avec : Société / Num contrat, Matricule, Nom et prénom, RIB, Montant total<br/>
                • Un total global en bas<br/>
                • La signature ou le tampon du donneur<br/>
                • La date d'émission
              </Alert>

              <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Informations du virement
                  </Typography>
                  {selectedDonneur && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Donneur d'ordre:</strong> {selectedDonneur.nom}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Banque:</strong> {selectedDonneur.banque}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>RIB:</strong> {selectedDonneur.rib}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre d'adhérents:</strong> {validationResults.length}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => handleGenerateFiles('pdf')}
                  disabled={processing || validationStatus !== 'approved'}
                  sx={{ flex: 1 }}
                >
                  Générer le PDF
                </Button>
                {ovId && (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/pdf`, '_blank')}
                    color="success"
                    disabled={validationStatus !== 'approved'}
                  >
                    Télécharger PDF
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => setActiveStep(4)}
                  disabled={processing || validationStatus !== 'approved'}
                >
                  Passer à l'étape suivante
                </Button>
              </Box>

              <Alert severity="warning" sx={{ mb: 2 }}>
                Vous pouvez télécharger le PDF maintenant ou passer directement à la génération du fichier TXT
              </Alert>
            </Paper>
          </Grid>
        )}
        
        {/* Étape 5 — Génération des fichiers */}
        {
          /* Insert SageDownloadButton component used below */
        }

        

        {/* Étape 5 — Génération des fichiers (JSX) */}
        {activeStep === 4 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Étape 5 : Génération des fichiers
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Deux fichiers distincts à générer :
                </Typography>
                <Typography variant="body2">
                  🏦 <strong>TXT Bancaire</strong> — Format V1/V2 envoyé à la banque pour exécution du virement
                </Typography>
                <Typography variant="body2">
                  📊 <strong>TXT Sage Comptable</strong> — Écritures comptables (Débit/Crédit) à importer dans Sage 100
                </Typography>
              </Alert>

              {/* Section TXT Bancaire */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: '#1976d2' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
                  🏦 Fichier TXT Bancaire
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<DescriptionIcon />}
                    onClick={() => handleGenerateFiles('txt')}
                    disabled={processing}
                    sx={{ flex: 1 }}
                  >
                    Générer TXT Bancaire
                  </Button>
                  {ovId && (
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<DescriptionIcon />}
                      onClick={() =>
                        window.open(
                          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
                          '_blank'
                        )
                      }
                      color="primary"
                    >
                      Télécharger TXT Bancaire
                    </Button>
                  )}
                </Box>
              </Paper>

              {/* Section TXT Sage Comptable */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: '#6A1B9A' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#6A1B9A', mb: 1 }}>
                  📊 Fichier TXT Sage Comptable
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Ce fichier contient les écritures comptables (Débit + Crédit) au format Sage 100.
                    Il doit être importé dans Sage <strong>après</strong> exécution du virement bancaire.
                  </Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {ovId ? (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={sageDownloading ? undefined : <DescriptionIcon />}
                      onClick={() => handleDownloadSageTxt(ovId)}
                      disabled={sageDownloading}
                      sx={{
                        bgcolor: '#6A1B9A',
                        '&:hover': { bgcolor: '#4A148C' },
                        '&:disabled': { bgcolor: '#9E9E9E' },
                      }}
                    >
                      {sageDownloading ? 'Génération...' : '⬇ TXT Sage Comptable'}
                    </Button>
                  ) : (
                    <Alert severity="info" sx={{ flex: 1 }}>
                      L'OV doit être créé avant de générer le TXT Sage. Cliquez d'abord sur
                      "Valider et Envoyer pour Validation" à l'étape 3.
                    </Alert>
                  )}
                </Box>

                {/* Sage config warning if not set */}
                {selectedDonneur && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Code journal Sage : <strong>{selectedDonneur.codeJournalSage || 'Non configuré (utilisation valeur par défaut)'}</strong>
                      {' · '}
                      Compte trésorerie : <strong>{selectedDonneur.compteTresoreriesSage || 'Non configuré'}</strong>
                    </Typography>
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => setActiveStep(5)}
                  disabled={processing}
                >
                  Terminer
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
        
        {/* EXACT SPEC: Étape 6 - Historique et archivage */}
        {activeStep === 5 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Étape 6 : Historique et archivage
              </Typography>
              
              <Alert severity="success" sx={{ mb: 3 }}>
                <strong>Tous les traitements sont enregistrés :</strong><br/>
                • Nom du donneur utilisé<br/>
                • Date et heure<br/>
                • Nombre d'adhérents traités<br/>
                • Montant total<br/>
                • Fichiers générés (PDF, TXT)<br/>
                • Nom de l'utilisateur
              </Alert>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Résumé de l'opération
                  </Typography>
                  {selectedDonneur && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Donneur utilisé:</strong> {selectedDonneur.nom}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Date et heure:</strong> {new Date().toLocaleString('fr-FR')}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Nombre d'adhérents traités:</strong> {validationResults.length}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Montant total:</strong> {validationResults.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} TND
                      </Typography>
                      <Typography variant="body2">
                        <strong>Utilisateur:</strong> {user?.fullName || 'Utilisateur'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setActiveStep(0)}>
                  Nouveau Traitement
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => onSwitchToTab?.(1)}
                >
                  Voir le Suivi & Statut
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => onSwitchToTab?.(5)}
                >
                  Consulter l'Historique
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* EXACT SPEC: Link to Bordereau Dialog (Manual OV only) */}
      <Dialog open={linkBordereauDialog} onClose={() => setLinkBordereauDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Lier le PDF à un bordereau ?</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Voulez-vous lier ce document PDF à un bordereau existant ou créer un nouveau bordereau ?
          </Alert>
          
          {!showCreateBordereau ? (
            <Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Sélectionner un bordereau existant</InputLabel>
                <Select
                  value={selectedBordereauId || ''}
                  label="Sélectionner un bordereau existant"
                  onChange={(e) => setSelectedBordereauId(e.target.value || null)}
                >
                  <MenuItem value="">Aucun (ne pas lier)</MenuItem>
                  {bordereaux.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.reference} - {b.client?.name || 'Client inconnu'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => setShowCreateBordereau(true)}
                startIcon={<AddIcon />}
              >
                + Créer un nouveau bordereau
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Créer un nouveau bordereau
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label="Référence bordereau *"
                  value={newBordereauData.reference}
                  onChange={(e) => setNewBordereauData({...newBordereauData, reference: e.target.value})}
                  fullWidth
                  required
                  placeholder="Ex: BORD-2024-001"
                />
                
                <FormControl fullWidth required>
                  <InputLabel>Client / Société *</InputLabel>
                  <Select
                    value={newBordereauData.clientId}
                    label="Client / Société *"
                    onChange={(e) => setNewBordereauData({...newBordereauData, clientId: e.target.value})}
                  >
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  label="Nombre de BS"
                  type="number"
                  value={newBordereauData.nombreBS}
                  onChange={(e) => setNewBordereauData({...newBordereauData, nombreBS: parseInt(e.target.value) || 1})}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setShowCreateBordereau(false);
                      setNewBordereauData({ reference: '', clientId: '', nombreBS: 1 });
                    }}
                    fullWidth
                  >
                    Annuler
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleCreateNewBordereau}
                    disabled={!newBordereauData.reference || !newBordereauData.clientId}
                    fullWidth
                  >
                    Créer
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLinkBordereauDialog(false);
            setShowCreateBordereau(false);
            setNewBordereauData({ reference: '', clientId: '', nombreBS: 1 });
          }} variant="outlined">
            Annuler
          </Button>
          {!showCreateBordereau && (
            <>
              <Button onClick={() => handleLinkBordereauChoice(false)} variant="outlined">
                Ne pas lier
              </Button>
              <Button 
                onClick={() => handleLinkBordereauChoice(true, selectedBordereauId || undefined)} 
                variant="contained"
                disabled={!selectedBordereauId}
              >
                Lier au bordereau
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Help Dialog - How it works */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'info.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HourglassEmptyIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📋 Comment fonctionne la validation ?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Section 0 - Duplicate Detection System */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'warning.main' }}>
                🛡️ SYSTÈME DE DÉTECTION DES DOUBLONS
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ Pourquoi le système affiche des avertissements au lieu de bloquer ?
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Le système utilise <strong>2 niveaux de protection</strong> pour détecter les paiements en double :
                </Typography>
              </Alert>
              
              <Box sx={{ pl: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                  📊 NIVEAU 1 : Détection du fichier Excel
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Le système calcule une <strong>empreinte unique (hash)</strong> de votre fichier Excel<br/>
                  • Si ce fichier exact a déjà été uploadé dans les <strong>90 derniers jours</strong>, vous recevez un avertissement<br/>
                  • Exemple : "⚠️ Ce fichier Excel a déjà été utilisé le 13/03/2026 pour l'OV VIR-20260313-0001"
                </Typography>
              </Box>
              
              <Box sx={{ pl: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                  👤 NIVEAU 2 : Détection par matricule
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Pour chaque matricule dans votre Excel, le système vérifie <strong>TOUS les OVs précédents</strong> (sans limite de temps)<br/>
                  • Si un matricule a déjà été payé, vous voyez <strong>TOUS ses paiements antérieurs</strong><br/>
                  • Exemple : "⚠️ Matricule déjà utilisé : 452.80 TND dans OV VIR-20260313-0001 (créé il y a 3 jours)"
                </Typography>
              </Box>
              
              <Alert severity="success" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ✅ Pourquoi ne pas BLOQUER au lieu d'avertir ?
                </Typography>
                <Typography variant="body2">
                  <strong>Cas légitimes de paiements multiples :</strong><br/>
                  • 📅 <strong>Paiements mensuels récurrents</strong> : Un adhérent peut recevoir un remboursement chaque mois<br/>
                  • 💰 <strong>Remboursements multiples</strong> : Plusieurs dossiers médicaux dans le même mois<br/>
                  • 🔄 <strong>Ajustements</strong> : Corrections ou compléments de paiement<br/>
                  • ⏰ <strong>Paiements tardifs</strong> : Régularisation de dossiers en retard
                </Typography>
              </Alert>
              
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ❌ Cas de vrais doublons (erreurs à éviter) :
                </Typography>
                <Typography variant="body2">
                  • 📂 <strong>Fichier uploadé 2 fois par erreur</strong> : Vous avez cliqué 2 fois sur "Valider"<br/>
                  • 🔁 <strong>Même Excel pour 2 bordereaux différents</strong> : Vous avez utilisé le mauvais fichier<br/>
                  • 📋 <strong>Copier-coller d'un ancien Excel</strong> : Vous avez oublié de mettre à jour les données
                </Typography>
              </Alert>
              
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  🎯 Comment utiliser ces avertissements ?
                </Typography>
                <Typography variant="body2">
                  1️⃣ <strong>Lisez attentivement</strong> les avertissements affichés<br/>
                  2️⃣ <strong>Vérifiez les dates</strong> : "il y a 2 heures" = probablement un doublon / "il y a 30 jours" = probablement légitime<br/>
                  3️⃣ <strong>Vérifiez les montants</strong> : Si le montant est identique et la date récente, c'est suspect<br/>
                  4️⃣ <strong>Décidez</strong> : Cliquez "Continuer" si légitime, "Annuler" si c'est une erreur
                </Typography>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 <strong>Le système vous protège sans vous bloquer</strong> : Vous gardez le contrôle tout en étant alerté des risques potentiels.
                </Typography>
              </Alert>
            </Box>
            <Divider sx={{ my: 2 }} />
            
            {/* Section 1 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                1️⃣ STRUCTURE DU FICHIER EXCEL
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  • <strong>Colonne 1 :</strong> Matricule de l'adhérent<br/>
                  • <strong>Colonne 2 :</strong> Montant à virer
                </Typography>
              </Alert>
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  ⚠️ IMPORTANT : Colonnes supplémentaires
                </Typography>
                <Typography variant="body2">
                  Si vous ajoutez d'autres colonnes (Nom, Prénom, RIB, Adresse, Téléphone, etc.), elles seront <strong>IGNORÉES</strong> par le système.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  🔒 Le système utilise UNIQUEMENT les données de la <strong>Base Adhérents</strong> pour garantir l'intégrité et l'exactitude des informations (Nom, Prénom, RIB, Société).
                </Typography>
              </Alert>
            </Box>

            {/* Section 2 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                2️⃣ PROCESSUS DE VALIDATION
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Le système recherche automatiquement chaque matricule dans la <strong>BASE ADHÉRENTS</strong> du client sélectionné.
              </Typography>
            </Box>

            {/* Section 3 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                3️⃣ DONNÉES RÉCUPÉRÉES AUTOMATIQUEMENT
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Pour chaque matricule trouvé, le système récupère :
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2">✅ Nom et Prénom</Typography>
                <Typography variant="body2">✅ Société</Typography>
                <Typography variant="body2">✅ RIB (20 chiffres)</Typography>
                <Typography variant="body2">✅ Code Assuré</Typography>
                <Typography variant="body2">✅ Numéro de Contrat</Typography>
              </Box>
            </Box>

            {/* Section 4 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'success.main' }}>
                4️⃣ CONDITIONS DE SUCCÈS
              </Typography>
              <Alert severity="success">
                <Typography variant="body2">
                  ✅ Le matricule DOIT exister dans la base adhérents<br/>
                  ✅ Le matricule DOIT être lié au CLIENT sélectionné<br/>
                  ✅ L'adhérent DOIT avoir un RIB valide (20 chiffres)<br/>
                  ✅ L'adhérent DOIT avoir le statut ACTIF
                </Typography>
              </Alert>
            </Box>

            {/* Section 5 - RIB Duplicate */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'warning.main' }}>
                5️⃣ CAS PARTICULIER : RIB DUPLIQUÉ
              </Typography>
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  ⚠️ Que se passe-t-il si plusieurs adhérents ont le même RIB ?
                </Typography>
                <Typography variant="body2">
                  Le système utilise le <strong>MATRICULE + SOCIÉTÉ</strong> pour identifier l'adhérent correct :
                </Typography>
                <Box sx={{ pl: 2, mt: 1 }}>
                  <Typography variant="body2">
                    🔹 <strong>Matricule 105934</strong> + <strong>Société HPE</strong> → Trouve MAISSA LAAMIRI (HPE)<br/>
                    🔹 <strong>Matricule 105934</strong> + <strong>Société FIELDCORE</strong> → Trouve MAISSA LAAMIRI (FIELDCORE)
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  💡 Même si le RIB est identique (08208000000000000000), le système sélectionne le bon adhérent grâce au couple <strong>Matricule + Société</strong>.
                </Typography>
              </Alert>
            </Box>

            {/* Section 6 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
                6️⃣ EN CAS D'ERREUR
              </Typography>
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  ❌ <strong>'Adhérent non trouvé'</strong> = Le matricule n'existe pas dans la base pour ce client<br/>
                  ❌ <strong>'RIB manquant'</strong> = L'adhérent existe mais n'a pas de RIB valide
                </Typography>
              </Alert>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ⚠️ Solution :
              </Typography>
              <Typography variant="body2">
                Allez dans <strong>'Gestion de la Base Adhérents'</strong> et ajoutez/corrigez les données manquantes.
              </Typography>
            </Box>

            {/* Section 7 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                7️⃣ IMPORTANT
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">
                  📌 Vérifiez TOUJOURS que vos adhérents sont importés dans la base AVANT de créer un OV<br/>
                  📌 Le client sélectionné (HPE, FIELDCORE, etc.) détermine quelle base d'adhérents est utilisée<br/>
                  📌 Les matricules sont UNIQUES par société
                </Typography>
              </Alert>
            </Box>

            {/* Section 8 */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'success.main' }}>
                💡 CONSEIL
              </Typography>
              <Alert severity="success">
                <Typography variant="body2">
                  Avant de créer un OV, allez dans <strong>'Gestion de la Base Adhérents'</strong>, filtrez par votre société, et vérifiez que tous les matricules existent avec des RIBs valides.
                </Typography>
              </Alert>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained" color="primary">
            J'ai compris
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OVProcessingTab;