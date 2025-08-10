import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Science as TestTube,
  Email,
  Sms,
  Notifications,
  Chat as Slack,
  Microsoft,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';

const MultiChannelNotifications: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [channelDialog, setChannelDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [newChannel, setNewChannel] = useState({
    name: '',
    type: '',
    config: {},
    active: true,
    priority: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setChannels([
        {
          id: 'email_primary',
          name: 'Email Principal',
          type: 'email',
          active: true,
          priority: 1,
          rateLimits: { maxPerMinute: 60, maxPerHour: 1000 }
        },
        {
          id: 'sms_primary',
          name: 'SMS Principal',
          type: 'sms',
          active: true,
          priority: 2,
          rateLimits: { maxPerMinute: 10, maxPerHour: 100 }
        },
        {
          id: 'push_mobile',
          name: 'Push Mobile',
          type: 'push',
          active: true,
          priority: 3,
          rateLimits: { maxPerMinute: 100, maxPerHour: 2000 }
        },
        {
          id: 'slack_alerts',
          name: 'Slack Alerts',
          type: 'slack',
          active: true,
          priority: 4,
          rateLimits: { maxPerMinute: 30, maxPerHour: 500 }
        },
        {
          id: 'teams_notifications',
          name: 'Microsoft Teams',
          type: 'teams',
          active: true,
          priority: 5,
          rateLimits: { maxPerMinute: 20, maxPerHour: 300 }
        }
      ]);

      setTemplates([
        {
          id: 'email_sla_breach',
          name: 'SLA Breach Alert',
          channel: 'email',
          subject: 'URGENT: SLA Breach Alert - {{alertType}}',
          active: true
        },
        {
          id: 'sms_critical_alert',
          name: 'Critical Alert SMS',
          channel: 'sms',
          body: 'CRITICAL: {{alertType}} - {{description}}',
          active: true
        }
      ]);

      setDeliveryStats({
        totalSent: 1275,
        delivered: 1198,
        failed: 45,
        bounced: 32,
        byChannel: {
          email: { sent: 450, delivered: 425, failed: 15 },
          sms: { sent: 200, delivered: 195, failed: 3 },
          push: { sent: 300, delivered: 285, failed: 8 },
          slack: { sent: 80, delivered: 78, failed: 1 },
          teams: { sent: 45, delivered: 43, failed: 1 }
        }
      });
    } catch (error) {
      console.error('Failed to load notification data:', error);
    }
  };

  const handleTestChannel = async (channel: any) => {
    setSelectedChannel(channel);
    setTestDialog(true);
    
    try {
      // Mock test
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.1;
      
      setTestResult({
        success,
        message: success ? 'Test réussi' : 'Échec du test - vérifier la configuration'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erreur lors du test'
      });
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Email />;
      case 'sms': return <Sms />;
      case 'push': return <Notifications />;
      case 'slack': return <Slack />;
      case 'teams': return <Microsoft />;
      default: return <Notifications />;
    }
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'default';
  };

  const calculateDeliveryRate = (channel: any) => {
    if (!deliveryStats?.byChannel[channel.type]) return 0;
    const stats = deliveryStats.byChannel[channel.type];
    return stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Notifications Multi-Canaux
      </Typography>

      {/* Delivery Statistics */}
      {deliveryStats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Envoyées
                </Typography>
                <Typography variant="h4" component="div">
                  {deliveryStats.totalSent}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Livrées
                </Typography>
                <Typography variant="h4" component="div">
                  {deliveryStats.delivered}
                </Typography>
                <Typography variant="caption" color="success.main">
                  {((deliveryStats.delivered / deliveryStats.totalSent) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Échecs
                </Typography>
                <Typography variant="h4" component="div">
                  {deliveryStats.failed}
                </Typography>
                <Typography variant="caption" color="error.main">
                  {((deliveryStats.failed / deliveryStats.totalSent) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Rebonds
                </Typography>
                <Typography variant="h4" component="div">
                  {deliveryStats.bounced}
                </Typography>
                <Typography variant="caption" color="warning.main">
                  {((deliveryStats.bounced / deliveryStats.totalSent) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Notification Channels */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Canaux de Notification ({channels.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setChannelDialog(true)}
                >
                  Nouveau Canal
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Canal</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Priorité</TableCell>
                      <TableCell>Limites</TableCell>
                      <TableCell>Taux de Livraison</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {channels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getChannelIcon(channel.type)}
                            <Typography variant="subtitle2" fontWeight={600}>
                              {channel.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={channel.type.toUpperCase()} size="small" />
                        </TableCell>
                        <TableCell>{channel.priority}</TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {channel.rateLimits.maxPerMinute}/min
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress
                              variant="determinate"
                              value={calculateDeliveryRate(channel)}
                              sx={{ width: 60, height: 6 }}
                            />
                            <Typography variant="caption">
                              {calculateDeliveryRate(channel).toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={channel.active ? 'Actif' : 'Inactif'}
                            color={getStatusColor(channel.active) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleTestChannel(channel)}
                            >
                              <TestTube />
                            </IconButton>
                            <IconButton size="small">
                              <Edit />
                            </IconButton>
                            <IconButton size="small" color="error">
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Templates */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Modèles de Notification
              </Typography>
              
              <List>
                {templates.map((template) => (
                  <ListItem key={template.id}>
                    <ListItemIcon>
                      {getChannelIcon(template.channel)}
                    </ListItemIcon>
                    <ListItemText
                      primary={template.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Canal: {template.channel}
                          </Typography>
                          {template.subject && (
                            <Typography variant="caption" color="text.secondary">
                              {template.subject}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={template.active ? 'Actif' : 'Inactif'}
                      color={template.active ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Channel Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance par Canal
              </Typography>
              
              <Grid container spacing={3}>
                {Object.entries(deliveryStats?.byChannel || {}).map(([channelType, stats]: [string, any]) => (
                  <Grid item xs={12} sm={6} md={2.4} key={channelType}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          {getChannelIcon(channelType)}
                          <Typography variant="subtitle1" fontWeight={600}>
                            {channelType.toUpperCase()}
                          </Typography>
                        </Box>
                        
                        <Typography variant="h4" component="div" mb={1}>
                          {stats.sent}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Envoyées
                        </Typography>
                        
                        <Box display="flex" justifyContent="space-between" mt={2}>
                          <Box textAlign="center">
                            <Typography variant="h6" color="success.main">
                              {stats.delivered}
                            </Typography>
                            <Typography variant="caption">Livrées</Typography>
                          </Box>
                          <Box textAlign="center">
                            <Typography variant="h6" color="error.main">
                              {stats.failed}
                            </Typography>
                            <Typography variant="caption">Échecs</Typography>
                          </Box>
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0}
                          sx={{ mt: 2, height: 6 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Channel Dialog */}
      <Dialog open={channelDialog} onClose={() => setChannelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Canal de Notification</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du canal"
                value={newChannel.name}
                onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newChannel.type}
                  label="Type"
                  onChange={(e) => setNewChannel(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="push">Push</MenuItem>
                  <MenuItem value="slack">Slack</MenuItem>
                  <MenuItem value="teams">Teams</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Priorité"
                type="number"
                value={newChannel.priority}
                onChange={(e) => setNewChannel(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newChannel.active}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Canal actif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChannelDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!newChannel.name || !newChannel.type}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Channel Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Test du Canal - {selectedChannel?.name}
        </DialogTitle>
        <DialogContent>
          {testResult ? (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {testResult.message}
            </Alert>
          ) : (
            <Box display="flex" alignItems="center" gap={2} sx={{ mt: 2 }}>
              <LinearProgress sx={{ flexGrow: 1 }} />
              <Typography variant="body2">Test en cours...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiChannelNotifications;