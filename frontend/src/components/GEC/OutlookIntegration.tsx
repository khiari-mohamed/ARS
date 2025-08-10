import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Email,
  CalendarToday as Calendar,
  Contacts,
  Sync,
  CheckCircle,
  Error,
  Send,
  Reply,
  Event,
  Person
} from '@mui/icons-material';
import { connectOutlook, getOutlookEmails, sendOutlookEmail, getCalendarEvents, getOutlookContacts, getIntegrationStatus } from '../../services/gecService';

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
      id={`outlook-tabpanel-${index}`}
      aria-labelledby={`outlook-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OutlookIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendEmailDialog, setSendEmailDialog] = useState(false);
  const [createEventDialog, setCreateEventDialog] = useState(false);
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    body: '',
    priority: 'normal'
  });
  const [newEvent, setNewEvent] = useState({
    subject: '',
    start: '',
    end: '',
    location: '',
    attendees: ''
  });

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const status = await getIntegrationStatus('current_user');
      setIntegrationStatus(status);
      
      if (status.connected) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [emailsData, eventsData, contactsData] = await Promise.all([
        getOutlookEmails('current_user'),
        getCalendarEvents('current_user', new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        getOutlookContacts('current_user')
      ]);
      
      setEmails(emailsData);
      setEvents(eventsData);
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load Outlook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const authUrl = await connectOutlook('current_user');
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Poll for connection status
      const pollInterval = setInterval(async () => {
        const status = await getIntegrationStatus('current_user');
        if (status.connected) {
          clearInterval(pollInterval);
          setIntegrationStatus(status);
          loadData();
        }
      }, 2000);
      
      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      console.error('Failed to connect to Outlook:', error);
    }
  };

  const handleSendEmail = async () => {
    try {
      await sendOutlookEmail('current_user', newEmail);
      setSendEmailDialog(false);
      setNewEmail({ to: '', subject: '', body: '', priority: 'normal' });
      await loadData();
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'default';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (!integrationStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Intégration Microsoft Outlook/365
      </Typography>

      {/* Connection Status */}
      <Alert 
        severity={integrationStatus.connected ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        action={
          !integrationStatus.connected && (
            <Button color="inherit" size="small" onClick={handleConnect}>
              Se Connecter
            </Button>
          )
        }
      >
        {integrationStatus.connected ? (
          <Box>
            <Typography variant="subtitle2">
              Connecté à Microsoft 365
            </Typography>
            <Typography variant="body2">
              Dernière synchronisation: {formatDate(integrationStatus.lastSync)}
            </Typography>
          </Box>
        ) : (
          <Typography>
            Connectez-vous à Microsoft 365 pour accéder à vos emails, calendrier et contacts
          </Typography>
        )}
      </Alert>

      {integrationStatus.connected && (
        <>
          {/* Statistics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Emails Envoyés
                      </Typography>
                      <Typography variant="h4" component="div">
                        {integrationStatus.stats?.emailsSent || 0}
                      </Typography>
                    </Box>
                    <Send color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Emails Reçus
                      </Typography>
                      <Typography variant="h4" component="div">
                        {integrationStatus.stats?.emailsReceived || 0}
                      </Typography>
                    </Box>
                    <Email color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Événements
                      </Typography>
                      <Typography variant="h4" component="div">
                        {integrationStatus.stats?.eventsCreated || 0}
                      </Typography>
                    </Box>
                    <Event color="secondary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Contacts
                      </Typography>
                      <Typography variant="h4" component="div">
                        {integrationStatus.stats?.contactsSynced || 0}
                      </Typography>
                    </Box>
                    <Person color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Content */}
          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="outlook tabs">
                <Tab icon={<Email />} label="Emails" />
                <Tab icon={<Calendar />} label="Calendrier" />
                <Tab icon={<Contacts />} label="Contacts" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              {/* Emails Tab */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Boîte de Réception ({emails.length})
                </Typography>
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    onClick={loadData}
                    disabled={loading}
                  >
                    Synchroniser
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => setSendEmailDialog(true)}
                  >
                    Nouveau Email
                  </Button>
                </Box>
              </Box>

              <List>
                {emails.map((email) => (
                  <ListItem
                    key={email.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: email.isRead ? 'transparent' : 'action.hover'
                    }}
                  >
                    <ListItemIcon>
                      <Email color={email.isRead ? 'action' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight={email.isRead ? 400 : 600}>
                            {email.subject}
                          </Typography>
                          <Chip
                            label={email.priority}
                            color={getPriorityColor(email.priority) as any}
                            size="small"
                          />
                          {email.attachments && email.attachments.length > 0 && (
                            <Chip label={`${email.attachments.length} pièce(s)`} size="small" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            De: {email.from}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {email.body.substring(0, 100)}...
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(email.receivedDateTime)}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box display="flex" gap={1}>
                      <Button size="small" startIcon={<Reply />}>
                        Répondre
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              {/* Calendar Tab */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Événements à Venir ({events.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Event />}
                  onClick={() => setCreateEventDialog(true)}
                >
                  Nouvel Événement
                </Button>
              </Box>

              <List>
                {events.map((event) => (
                  <ListItem
                    key={event.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      <Event color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={event.subject}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(event.start)} - {formatDate(event.end)}
                          </Typography>
                          {event.location && (
                            <Typography variant="body2" color="text.secondary">
                              Lieu: {event.location}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Participants: {event.attendees.join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              {/* Contacts Tab */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Contacts Synchronisés ({contacts.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Sync />}
                  onClick={loadData}
                  disabled={loading}
                >
                  Synchroniser
                </Button>
              </Box>

              <List>
                {contacts.map((contact) => (
                  <ListItem
                    key={contact.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      <Person color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={contact.displayName}
                      secondary={
                        <Box>
                          {contact.emailAddresses.map((email: any, index: number) => (
                            <Typography key={index} variant="body2" color="text.secondary">
                              {email.address}
                            </Typography>
                          ))}
                          {contact.companyName && (
                            <Typography variant="body2" color="text.secondary">
                              {contact.companyName} - {contact.jobTitle}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          </Paper>
        </>
      )}

      {/* Send Email Dialog */}
      <Dialog open={sendEmailDialog} onClose={() => setSendEmailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau Email</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Destinataire"
                value={newEmail.to}
                onChange={(e) => setNewEmail(prev => ({ ...prev, to: e.target.value }))}
                placeholder="email@example.com"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Objet"
                value={newEmail.subject}
                onChange={(e) => setNewEmail(prev => ({ ...prev, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={newEmail.priority}
                  label="Priorité"
                  onChange={(e) => setNewEmail(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Basse</MenuItem>
                  <MenuItem value="normal">Normale</MenuItem>
                  <MenuItem value="high">Haute</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Message"
                value={newEmail.body}
                onChange={(e) => setNewEmail(prev => ({ ...prev, body: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendEmailDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSendEmail}
            disabled={!newEmail.to || !newEmail.subject}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createEventDialog} onClose={() => setCreateEventDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel Événement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={newEvent.subject}
                onChange={(e) => setNewEvent(prev => ({ ...prev, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Début"
                type="datetime-local"
                value={newEvent.start}
                onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fin"
                type="datetime-local"
                value={newEvent.end}
                onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lieu"
                value={newEvent.location}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Participants"
                value={newEvent.attendees}
                onChange={(e) => setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="email1@example.com, email2@example.com"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEventDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!newEvent.subject || !newEvent.start || !newEvent.end}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OutlookIntegration;