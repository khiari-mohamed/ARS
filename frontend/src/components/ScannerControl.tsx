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
import { fetchScanners, startScanJob } from '../services/scanService';

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
    if (!selectedScanner) return;

    setScanning(true);
    try {
      const job = await startScanJob(selectedScanner, scanSettings);
      setScanJob(job);
      
      setTimeout(() => {
        setScanning(false);
        setScanJob(null);
        onScanComplete();
      }, 5000);
    } catch (error) {
      console.error('Scan job failed:', error);
      setScanning(false);
    }
  };

  const handleStopScan = () => {
    setScanning(false);
    setScanJob(null);
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
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Résolution: {getResolutionLabel(scanSettings.resolution)}</Typography>
            <Slider
              value={scanSettings.resolution}
              onChange={(_, value) => updateSetting('resolution', value)}
              min={150}
              max={600}
              step={50}
              marks={[
                { value: 150, label: '150' },
                { value: 300, label: '300' },
                { value: 600, label: '600' }
              ]}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Mode Couleur</InputLabel>
              <Select
                value={scanSettings.colorMode}
                label="Mode Couleur"
                onChange={(e) => updateSetting('colorMode', e.target.value)}
              >
                <MenuItem value="color">Couleur</MenuItem>
                <MenuItem value="grayscale">Niveaux de gris</MenuItem>
                <MenuItem value="bw">Noir et blanc</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Luminosité: {scanSettings.brightness}%</Typography>
            <Slider
              value={scanSettings.brightness}
              onChange={(_, value) => updateSetting('brightness', value)}
              min={0}
              max={100}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Contraste: {scanSettings.contrast}%</Typography>
            <Slider
              value={scanSettings.contrast}
              onChange={(_, value) => updateSetting('contrast', value)}
              min={0}
              max={100}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={scanSettings.duplex}
                    onChange={(e) => updateSetting('duplex', e.target.checked)}
                  />
                }
                label="Scan recto-verso"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={scanSettings.autoDetect}
                    onChange={(e) => updateSetting('autoDetect', e.target.checked)}
                  />
                }
                label="Détection automatique"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {scanning && scanJob && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            Scan en cours - Job ID: {scanJob.id}
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      <Box display="flex" gap={2} justifyContent="center">
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrow />}
          onClick={handleStartScan}
          disabled={!selectedScanner || scanning || scanners.find(s => s.id === selectedScanner)?.status !== 'ready'}
        >
          Démarrer Scan
        </Button>
        
        {scanning && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<Stop />}
            onClick={handleStopScan}
            color="error"
          >
            Arrêter Scan
          </Button>
        )}
        
        <Button
          variant="outlined"
          size="large"
          startIcon={<Settings />}
          onClick={loadScanners}
        >
          Actualiser
        </Button>
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