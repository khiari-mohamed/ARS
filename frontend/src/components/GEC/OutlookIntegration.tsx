import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Email,
  Settings,
  CheckCircle,
  Error,
  Send,
  Visibility,
  VisibilityOff,
  Save,
  Science
} from '@mui/icons-material';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

const OutlookIntegration: React.FC = () => {
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    host: process.env.REACT_APP_SMTP_HOST || 'smtp.gnet.tn',
    port: parseInt(process.env.REACT_APP_SMTP_PORT || '465'),
    secure: process.env.REACT_APP_SMTP_SECURE === 'true' || true,
    user: process.env.REACT_APP_SMTP_USER || '',
    password: '',
    from: process.env.REACT_APP_SMTP_FROM || 'ARS Tunisia <noreply@arstunisia.com>'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailStats, setEmailStats] = useState({
    sent: 0,
    failed: 0,
    lastSent: null as Date | null
  });

  useEffect(() => {
    loadSMTPConfig();
    loadEmailStats();
  }, []);

  const loadSMTPConfig = async () => {
    console.log('📧 Loading SMTP config...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('📧 SMTP config response:', response.status);
      
      if (response.ok) {
        const config = await response.json();
        setSMTPConfig(prev => ({ ...prev, ...config }));
        setConnectionStatus('success');
        setStatusMessage('Configuration SMTP chargée');
      }
    } catch (error) {
      console.error('Failed to load SMTP config:', error);
    }
  };

  const loadEmailStats = async () => {
    console.log('📊 Loading email stats...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('📊 Email stats response:', response.status);
      
      if (response.ok) {
        const stats = await response.json();
        setEmailStats(stats);
      }
    } catch (error) {
      console.error('Failed to load email stats:', error);
    }
  };

  const handleSaveConfig = async () => {
    console.log('💾 Saving SMTP config:', smtpConfig);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smtpConfig)
      });
      console.log('💾 Save config response:', response.status);
      
      if (response.ok) {
        setConnectionStatus('success');
        setStatusMessage('Configuration SMTP sauvegardée avec succès');
      } else {
        setConnectionStatus('error');
        setStatusMessage('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    console.log('🧪 Testing SMTP connection:', smtpConfig);
    setConnectionStatus('testing');
    setStatusMessage('Test de connexion en cours...');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smtpConfig)
      });
      console.log('🧪 Test connection response:', response.status);
      
      if (response.ok) {
        setConnectionStatus('success');
        setStatusMessage('Connexion SMTP réussie!');
      } else {
        const error = await response.json();
        setConnectionStatus('error');
        setStatusMessage(`Échec de connexion: ${error.message}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage('Erreur lors du test de connexion');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'testing': return <Settings className="animate-spin" />;
      default: return <Settings />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'testing': return 'info';
      default: return 'info';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center">
        <Email sx={{ mr: 1 }} />
        Configuration SMTP
      </Typography>

      {/* Status Alert */}
      {statusMessage && (
        <Alert 
          severity={getStatusColor() as any} 
          sx={{ mb: 3 }}
          icon={getStatusIcon()}
        >
          {statusMessage}
        </Alert>
      )}

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Emails Envoyés
                  </Typography>
                  <Typography variant="h4" component="div">
                    {emailStats.sent}
                  </Typography>
                </Box>
                <Send color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Échecs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {emailStats.failed}
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Dernier Envoi
                  </Typography>
                  <Typography variant="body1" component="div">
                    {emailStats.lastSent ? new Date(emailStats.lastSent).toLocaleString('fr-FR') : 'Aucun'}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SMTP Configuration */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Paramètres SMTP
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Serveur SMTP"
              value={smtpConfig.host}
              onChange={(e) => setSMTPConfig(prev => ({ ...prev, host: e.target.value }))}
              placeholder="smtp.example.com"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={smtpConfig.port}
              onChange={(e) => setSMTPConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={smtpConfig.secure}
                  onChange={(e) => setSMTPConfig(prev => ({ ...prev, secure: e.target.checked }))}
                />
              }
              label="SSL/TLS"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nom d'utilisateur"
              value={smtpConfig.user}
              onChange={(e) => setSMTPConfig(prev => ({ ...prev, user: e.target.value }))}
              placeholder="username@example.com"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={smtpConfig.password}
              onChange={(e) => setSMTPConfig(prev => ({ ...prev, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <Tooltip title={showPassword ? 'Masquer' : 'Afficher'}>
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Tooltip>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Adresse d'expéditeur"
              value={smtpConfig.from}
              onChange={(e) => setSMTPConfig(prev => ({ ...prev, from: e.target.value }))}
              placeholder="ARS Tunisia <noreply@arstunisia.com>"
              helperText="Format: Nom <email@domaine.com>"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Science />}
                onClick={handleTestConnection}
                disabled={loading || connectionStatus === 'testing'}
              >
                {connectionStatus === 'testing' ? 'Test en cours...' : 'Tester la Connexion'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveConfig}
                disabled={loading}
              >
                Sauvegarder
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default OutlookIntegration;