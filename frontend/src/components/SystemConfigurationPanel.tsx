import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Email,
  Sms,
  Hub as Integration,
  ExpandMore,
  Science as Test,
  Save,
  Refresh,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { fetchSystemConfiguration, updateSystemConfiguration, testEmailConfiguration, testSMSConfiguration } from '../services/superAdminService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SystemConfigurationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ email: false, sms: false });
  const [showPasswords, setShowPasswords] = useState(false);
  const [testResultDialog, setTestResultDialog] = useState({ open: false, type: '', success: false, message: '' });

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const data = await fetchSystemConfiguration();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load system configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      await updateSystemConfiguration(config);
      alert('Configuration sauvegardée avec succès!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(prev => ({ ...prev, email: true }));
    try {
      const result = await testEmailConfiguration(config.email);
      setTestResultDialog({
        open: true,
        type: 'Email',
        success: result,
        message: result ? 'Test email envoyé avec succès!' : 'Échec du test email. Vérifiez la configuration.'
      });
    } catch (error) {
      setTestResultDialog({
        open: true,
        type: 'Email',
        success: false,
        message: 'Erreur lors du test email.'
      });
    } finally {
      setTesting(prev => ({ ...prev, email: false }));
    }
  };

  const handleTestSMS = async () => {
    setTesting(prev => ({ ...prev, sms: true }));
    try {
      const result = await testSMSConfiguration(config.sms);
      setTestResultDialog({
        open: true,
        type: 'SMS',
        success: result,
        message: result ? 'Test SMS envoyé avec succès!' : 'Échec du test SMS. Vérifiez la configuration.'
      });
    } catch (error) {
      setTestResultDialog({
        open: true,
        type: 'SMS',
        success: false,
        message: 'Erreur lors du test SMS.'
      });
    } finally {
      setTesting(prev => ({ ...prev, sms: false }));
    }
  };

  const updateEmailConfig = (field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      email: {
        ...prev.email,
        smtp: {
          ...prev.email.smtp,
          [field]: value
        }
      }
    }));
  };

  const updateEmailAuth = (field: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      email: {
        ...prev.email,
        smtp: {
          ...prev.email.smtp,
          auth: {
            ...prev.email.smtp.auth,
            [field]: value
          }
        }
      }
    }));
  };

  const updateSMSConfig = (field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      sms: {
        ...prev.sms,
        [field]: value
      }
    }));
  };

  const updateIntegrationConfig = (integration: string, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [integration]: {
          ...prev.integrations[integration],
          [field]: value
        }
      }
    }));
  };

  const updateEmailTemplate = (templateId: string, field: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      email: {
        ...prev.email,
        templates: {
          ...prev.email.templates,
          [templateId]: {
            ...prev.email.templates[templateId],
            [field]: value
          }
        }
      }
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading || !config) {
    return <Box>Chargement...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Configuration Système
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadConfiguration}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveConfiguration}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Box>
      </Box>

      {/* Configuration Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="configuration tabs">
            <Tab icon={<Email />} label="Email/SMTP" />
            <Tab icon={<Sms />} label="SMS" />
            <Tab icon={<Integration />} label="Intégrations" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Email Configuration */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Configuration SMTP
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Serveur SMTP"
                value={config.email.smtp.host}
                onChange={(e) => updateEmailConfig('host', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={config.email.smtp.port}
                onChange={(e) => updateEmailConfig('port', parseInt(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom d'utilisateur"
                value={config.email.smtp.auth.user}
                onChange={(e) => updateEmailAuth('user', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mot de passe"
                type={showPasswords ? 'text' : 'password'}
                value={config.email.smtp.auth.pass}
                onChange={(e) => updateEmailAuth('pass', e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.email.smtp.secure}
                    onChange={(e) => updateEmailConfig('secure', e.target.checked)}
                  />
                }
                label="Connexion sécurisée (SSL/TLS)"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<Test />}
                onClick={handleTestEmail}
                disabled={testing.email}
              >
                {testing.email ? 'Test en cours...' : 'Tester la configuration'}
              </Button>
            </Grid>

            {/* Email Templates */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Modèles d'Email
              </Typography>
              {Object.entries(config.email.templates).map(([templateId, template]: [string, any]) => (
                <Accordion key={templateId}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>{templateId.replace('_', ' ').toUpperCase()}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Sujet"
                          value={template.subject}
                          onChange={(e) => updateEmailTemplate(templateId, 'subject', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Corps du message"
                          value={template.body}
                          onChange={(e) => updateEmailTemplate(templateId, 'body', e.target.value)}
                          helperText="Variables disponibles: {{reference}}, {{client}}, {{date}}"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* SMS Configuration */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Configuration SMS
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fournisseur SMS"
                value={config.sms.provider}
                onChange={(e) => updateSMSConfig('provider', e.target.value)}
                helperText="Ex: twilio, nexmo, etc."
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Clé API"
                type={showPasswords ? 'text' : 'password'}
                value={config.sms.apiKey}
                onChange={(e) => updateSMSConfig('apiKey', e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numéro expéditeur"
                value={config.sms.sender}
                onChange={(e) => updateSMSConfig('sender', e.target.value)}
                helperText="Format international: +33123456789"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<Test />}
                onClick={handleTestSMS}
                disabled={testing.sms}
              >
                {testing.sms ? 'Test en cours...' : 'Tester la configuration'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Integrations Configuration */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Intégrations Système
              </Typography>
            </Grid>

            {Object.entries(config.integrations).map(([integrationId, integration]: [string, any]) => (
              <Grid item xs={12} key={integrationId}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        {integrationId.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip
                          label={integration.enabled ? 'Activé' : 'Désactivé'}
                          color={integration.enabled ? 'success' : 'default'}
                          size="small"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={integration.enabled}
                              onChange={(e) => updateIntegrationConfig(integrationId, 'enabled', e.target.checked)}
                            />
                          }
                          label=""
                        />
                      </Box>
                    </Box>

                    {integration.enabled && (
                      <Grid container spacing={2}>
                        {Object.entries(integration.config).map(([configKey, configValue]: [string, any]) => (
                          <Grid item xs={12} sm={6} key={configKey}>
                            <TextField
                              fullWidth
                              label={configKey.replace('_', ' ').toUpperCase()}
                              value={configValue}
                              onChange={(e) => {
                                const newConfig = { ...integration.config, [configKey]: e.target.value };
                                updateIntegrationConfig(integrationId, 'config', newConfig);
                              }}
                              size="small"
                            />
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Card>

      {/* Test Result Dialog */}
      <Dialog open={testResultDialog.open} onClose={() => setTestResultDialog({ ...testResultDialog, open: false })}>
        <DialogTitle>
          Résultat du Test {testResultDialog.type}
        </DialogTitle>
        <DialogContent>
          <Alert severity={testResultDialog.success ? 'success' : 'error'}>
            {testResultDialog.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestResultDialog({ ...testResultDialog, open: false })}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemConfigurationPanel;