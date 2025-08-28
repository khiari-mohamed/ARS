import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Alert
} from '@mui/material';
import { LocalAPI } from '../services/axios';

interface NotificationPrefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  slaAlerts: boolean;
  reclamationAlerts: boolean;
  assignmentAlerts: boolean;
}

export const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailEnabled: true,
    inAppEnabled: true,
    slaAlerts: true,
    reclamationAlerts: true,
    assignmentAlerts: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    LocalAPI.get('/notifications/preferences')
      .then(res => setPrefs(res.data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await LocalAPI.post('/notifications/preferences', prefs);
      setMessage('Préférences sauvegardées');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Préférences de Notification
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Canaux de notification
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={prefs.emailEnabled}
                onChange={(e) => setPrefs(prev => ({...prev, emailEnabled: e.target.checked}))}
              />
            }
            label="Notifications par email"
          />
          <FormControlLabel
            control={
              <Switch
                checked={prefs.inAppEnabled}
                onChange={(e) => setPrefs(prev => ({...prev, inAppEnabled: e.target.checked}))}
              />
            }
            label="Notifications dans l'application"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Types d'alertes
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={prefs.slaAlerts}
                onChange={(e) => setPrefs(prev => ({...prev, slaAlerts: e.target.checked}))}
              />
            }
            label="Alertes SLA"
          />
          <FormControlLabel
            control={
              <Switch
                checked={prefs.reclamationAlerts}
                onChange={(e) => setPrefs(prev => ({...prev, reclamationAlerts: e.target.checked}))}
              />
            }
            label="Alertes réclamations"
          />
          <FormControlLabel
            control={
              <Switch
                checked={prefs.assignmentAlerts}
                onChange={(e) => setPrefs(prev => ({...prev, assignmentAlerts: e.target.checked}))}
              />
            }
            label="Alertes d'affectation"
          />
        </Box>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>

        {message && (
          <Alert severity={message.includes('Erreur') ? 'error' : 'success'} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};