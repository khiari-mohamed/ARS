import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import { PlayArrow, Stop, Settings, Scanner } from '@mui/icons-material';
import { fetchScanners, startScanJob, getScanJobStatus } from '../services/scanService';

interface Props {
  onScanComplete: () => void;
}

const ScannerControl: React.FC<Props> = ({ onScanComplete }) => {
  const [scanners, setScanners] = useState<any[]>([]);
  const [selectedScanner, setSelectedScanner] = useState('');
  const [scanSettings, setScanSettings] = useState({
    resolution: 300,
    colorMode: 'color',
    duplex: true,
    autoDetect: true,
    brightness: 50,
    contrast: 50
  });
  const [scanning, setScanning] = useState(false);
  const [scanJob, setScanJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanners();
  }, []);

  const loadScanners = async () => {
    try {
      const data = await fetchScanners();
      setScanners(data);
      if (data.length > 0) {
        setSelectedScanner(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load scanners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    if (!selectedScanner) {
      alert('Veuillez sélectionner un scanner');
      return;
    }

    setScanning(true);
    try {
      // Validate scan settings
      if (scanSettings.resolution < 150 || scanSettings.resolution > 600) {
        throw new Error('Résolution invalide (150-600 DPI)');
      }

      const job = await startScanJob(selectedScanner, {
        ...scanSettings,
        timestamp: new Date().toISOString(),
        operator: 'SCAN_TEAM'
      });
      
      setScanJob({
        ...job,
        settings: scanSettings,
        startTime: new Date()
      });
      
      // Real-time job status polling
      const pollInterval = setInterval(async () => {
        try {
          const status = await getScanJobStatus(job.id);
          setScanJob((prev: any) => ({ 
            ...prev, 
            ...status,
            settings: scanSettings // Preserve settings
          }));
          
          if (status.status === 'completed' || status.status === 'completed_assigned' || status.status === 'error') {
            clearInterval(pollInterval);
            setScanning(false);
            
            // Show completion message
            if (status.status === 'completed_assigned') {
              alert(`✅ Scan terminé avec succès!\nBordereau: ${status.reference}\nAssigné automatiquement au Chef d'Équipe`);
            } else if (status.status === 'completed') {
              alert(`✅ Scan terminé avec succès!\nBordereau: ${status.reference}`);
            } else {
              alert(`❌ Erreur de scan: ${status.error || 'Erreur inconnue'}`);
            }
            
            setTimeout(() => {
              setScanJob(null);
              onScanComplete();
            }, 3000);
          }
        } catch (error) {
          console.error('Failed to get job status:', error);
          clearInterval(pollInterval);
          setScanning(false);
          setScanJob(null);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Scan job failed:', error);
      setScanning(false);
      const errorMessage = error.response?.data?.message || error.message || 'Échec du démarrage du scan';
      alert(`❌ Erreur: ${errorMessage}`);
    }
  };

  const handleStopScan = () => {
    if (window.confirm('Êtes-vous sûr de vouloir arrêter le scan en cours?')) {
      setScanning(false);
      setScanJob(null);
      alert('⏹️ Scan arrêté par l\'utilisateur');
    }
  };

  const updateSetting = (key: string, value: any) => {
    setScanSettings(prev => ({ ...prev, [key]: value }));
  };

  const getResolutionLabel = (value: number) => {
    return `${value} DPI`;
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Grid container spacing={3} mb={3}>
        {scanners.map((scanner) => (
          <Grid item xs={12} sm={6} key={scanner.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: selectedScanner === scanner.id ? 2 : 1,
                borderColor: selectedScanner === scanner.id ? 'primary.main' : 'divider'
              }}
              onClick={() => setSelectedScanner(scanner.id)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Scanner color={scanner.status === 'ready' ? 'primary' : 'disabled'} />
                  <Box>
                    <Typography variant="h6">{scanner.name}</Typography>
                    <Chip 
                      label={scanner.status} 
                      color={scanner.status === 'ready' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    Capacités: {scanner.capabilities.join(', ')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Paramètres de Scan
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom fontWeight="medium">
              Résolution: {getResolutionLabel(scanSettings.resolution)}
            </Typography>
            <Slider
              value={scanSettings.resolution}
              onChange={(_, value) => updateSetting('resolution', value)}
              min={150}
              max={600}
              step={50}
              marks={[
                { value: 150, label: '150 DPI' },
                { value: 300, label: '300 DPI' },
                { value: 600, label: '600 DPI' }
              ]}
              sx={{ mt: 2 }}
              disabled={scanning}
            />
            <Typography variant="caption" color="text.secondary">
              Recommandé: 300 DPI pour documents standards
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={scanning}>
              <InputLabel>Mode Couleur</InputLabel>
              <Select
                value={scanSettings.colorMode}
                label="Mode Couleur"
                onChange={(e) => updateSetting('colorMode', e.target.value)}
              >
                <MenuItem value="color">🎨 Couleur (Recommandé)</MenuItem>
                <MenuItem value="grayscale">⚫ Niveaux de gris</MenuItem>
                <MenuItem value="bw">⚪ Noir et blanc</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom fontWeight="medium">
              Luminosité: {scanSettings.brightness}%
            </Typography>
            <Slider
              value={scanSettings.brightness}
              onChange={(_, value) => updateSetting('brightness', value)}
              min={0}
              max={100}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' }
              ]}
              disabled={scanning}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom fontWeight="medium">
              Contraste: {scanSettings.contrast}%
            </Typography>
            <Slider
              value={scanSettings.contrast}
              onChange={(_, value) => updateSetting('contrast', value)}
              min={0}
              max={100}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' }
              ]}
              disabled={scanning}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" gap={3} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={scanSettings.duplex}
                    onChange={(e) => updateSetting('duplex', e.target.checked)}
                    disabled={scanning}
                  />
                }
                label="📄 Scan recto-verso"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={scanSettings.autoDetect}
                    onChange={(e) => updateSetting('autoDetect', e.target.checked)}
                    disabled={scanning}
                  />
                }
                label="🔍 Détection automatique"
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              La détection automatique optimise les paramètres selon le type de document
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {scanning && scanJob && (
        <Alert 
          severity={scanJob.status === 'error' ? 'error' : scanJob.status === 'completed' || scanJob.status === 'completed_assigned' ? 'success' : 'info'} 
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {scanJob.status === 'completed' || scanJob.status === 'completed_assigned' ? 
              'Scan terminé avec succès' : 
              scanJob.status === 'error' ? 
                'Erreur de scan' : 
                'Scan en cours'
            }
          </Typography>
          
          {scanJob.reference && (
            <Typography variant="body2" gutterBottom>
              Bordereau: {scanJob.reference} - Client: {scanJob.clientName}
            </Typography>
          )}
          
          {scanJob.documentCount && (
            <Typography variant="body2" gutterBottom>
              Documents: {scanJob.documentCount} - Statut: {scanJob.currentStatus}
            </Typography>
          )}
          
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <LinearProgress 
              variant="determinate" 
              value={scanJob.progress || 0} 
              sx={{ flexGrow: 1 }} 
            />
            <Typography variant="caption">
              {scanJob.progress || 0}%
            </Typography>
          </Box>
          
          {scanJob.status === 'completed_assigned' && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
              ✓ Assigné automatiquement au Chef d'Équipe
            </Typography>
          )}
        </Alert>
      )}

      <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
        <Button
          variant="contained"
          size="large"
          startIcon={scanning ? <Stop /> : <PlayArrow />}
          onClick={scanning ? handleStopScan : handleStartScan}
          disabled={!selectedScanner || scanners.find((s: any) => s.id === selectedScanner)?.status !== 'ready'}
          color={scanning ? 'error' : 'primary'}
          sx={{ minWidth: 160 }}
        >
          {scanning ? 'Arrêter Scan' : 'Démarrer Scan'}
        </Button>
        
        <Button
          variant="outlined"
          size="large"
          startIcon={<Settings />}
          onClick={loadScanners}
          disabled={scanning}
          sx={{ minWidth: 140 }}
        >
          Actualiser Scanners
        </Button>
      </Box>
      
      {/* Settings Summary */}
      <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="subtitle2" gutterBottom>
          📋 Résumé des Paramètres:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getResolutionLabel(scanSettings.resolution)} • {scanSettings.colorMode === 'color' ? 'Couleur' : scanSettings.colorMode === 'grayscale' ? 'Niveaux de gris' : 'Noir et blanc'} • 
          Luminosité {scanSettings.brightness}% • Contraste {scanSettings.contrast}% • 
          {scanSettings.duplex ? 'Recto-verso' : 'Simple face'} • 
          {scanSettings.autoDetect ? 'Détection auto activée' : 'Détection auto désactivée'}
        </Typography>
      </Box>

      {scanners.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Aucun scanner détecté. Vérifiez la connexion et l'installation des pilotes.
        </Alert>
      )}
    </Box>
  );
};

export default ScannerControl;