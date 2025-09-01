import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../services/axios';
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();

  // Fetch notification channels
  const { data: channels = [], isLoading: channelsLoading, refetch: refetchChannels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      try {
        const response = await LocalAPI.get('/alerts/notifications/channels');
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        return [];
      }
    }
  });

  // Fetch notification templates
  const { data: templates = [] } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      try {
        const response = await LocalAPI.get('/alerts/notifications/templates');
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }
    }
  });

  // Fetch delivery statistics
  const { data: deliveryStats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: async () => {
      try {
        const response = await LocalAPI.get('/alerts/notifications/stats');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        return {
          totalSent: 0,
          delivered: 0,
          failed: 0,
          bounced: 0,
          byChannel: {}
        };
      }
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: any) => {
      try {
        const response = await LocalAPI.post('/alerts/notifications/channels', channelData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setSnackbar({ open: true, message: 'Canal créé avec succès', severity: 'success' });
      setChannelDialog(false);
      setSelectedChannel(null);
      setNewChannel({ name: '', type: '', config: {}, active: true, priority: 1 });
    },
    onError: (error) => {
      console.error('Create channel error:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la création', severity: 'error' });
    }
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async ({ channelId, updates }: { channelId: string; updates: any }) => {
      try {
        await LocalAPI.patch(`/alerts/notifications/channels/${channelId}`, updates);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setSnackbar({ open: true, message: 'Canal mis à jour avec succès', severity: 'success' });
    },
    onError: (error) => {
      console.error('Update channel error:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la mise à jour', severity: 'error' });
    }
  });

  // Delete channel mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      try {
        await LocalAPI.delete(`/alerts/notifications/channels/${channelId}`);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setSnackbar({ open: true, message: 'Canal supprimé avec succès', severity: 'success' });
    },
    onError: (error) => {
      console.error('Delete channel error:', error);
      setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
    }
  });

  // Test channel mutation
  const testChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      try {
        const response = await LocalAPI.post(`/alerts/notifications/channels/${channelId}/test`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test réussi' : 'Échec du test')
      });
    },
    onError: (error) => {
      console.error('Test channel error:', error);
      setTestResult({
        success: false,
        message: 'Erreur lors du test'
      });
    }
  });

  const handleCreateChannel = () => {
    createChannelMutation.mutate(newChannel);
  };

  const handleToggleChannel = (channelId: string, currentStatus: boolean) => {
    updateChannelMutation.mutate({ 
      channelId, 
      updates: { active: !currentStatus } 
    });
  };

  const handleEditChannel = (channel: any) => {
    setNewChannel({
      name: channel.name,
      type: channel.type,
      config: channel.config || {},
      active: channel.active,
      priority: channel.priority || 1
    });
    setSelectedChannel(channel);
    setChannelDialog(true);
  };

  const handleDeleteChannel = (channelId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce canal ?')) {
      deleteChannelMutation.mutate(channelId);
    }
  };

  const handleTestChannel = async (channel: any) => {
    setSelectedChannel(channel);
    setTestDialog(true);
    setTestResult(null);
    testChannelMutation.mutate(channel.id);
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
    if (!deliveryStats?.byChannel || !deliveryStats.byChannel[channel.type]) return 0;
    const stats = deliveryStats.byChannel[channel.type];
    return stats && stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
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
                  {deliveryStats.totalSent > 0 ? ((deliveryStats.delivered / deliveryStats.totalSent) * 100).toFixed(1) : '0.0'}%
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
                  {deliveryStats.totalSent > 0 ? ((deliveryStats.failed / deliveryStats.totalSent) * 100).toFixed(1) : '0.0'}%
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
                  {deliveryStats.totalSent > 0 ? ((deliveryStats.bounced / deliveryStats.totalSent) * 100).toFixed(1) : '0.0'}%
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
                    {channels.map((channel: any) => (
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
                            {channel.rateLimits?.maxPerMinute || 'N/A'}/min
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
                          <Box display="flex" alignItems="center" gap={1}>
                            <Switch
                              checked={channel.active}
                              onChange={() => handleToggleChannel(channel.id, channel.active)}
                              disabled={updateChannelMutation.isLoading}
                              size="small"
                            />
                            <Typography variant="caption">
                              {channel.active ? 'Actif' : 'Inactif'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleTestChannel(channel)}
                              disabled={testChannelMutation.isLoading}
                              title="Tester le canal"
                              color="primary"
                            >
                              <TestTube />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleEditChannel(channel)}
                              disabled={updateChannelMutation.isLoading}
                              color="info"
                              title="Modifier"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteChannel(channel.id)}
                              disabled={deleteChannelMutation.isLoading}
                              title="Supprimer"
                            >
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
                {templates.map((template: any) => (
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
        <DialogTitle>
          {selectedChannel ? 'Modifier le Canal' : 'Nouveau Canal de Notification'}
        </DialogTitle>
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
          <Button onClick={() => {
            setChannelDialog(false);
            setSelectedChannel(null);
            setNewChannel({ name: '', type: '', config: {}, active: true, priority: 1 });
          }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedChannel) {
                updateChannelMutation.mutate({ 
                  channelId: selectedChannel.id, 
                  updates: newChannel 
                });
                setChannelDialog(false);
                setSelectedChannel(null);
                setNewChannel({ name: '', type: '', config: {}, active: true, priority: 1 });
              } else {
                handleCreateChannel();
              }
            }}
            disabled={!newChannel.name || !newChannel.type || createChannelMutation.isLoading || updateChannelMutation.isLoading}
          >
            {createChannelMutation.isLoading || updateChannelMutation.isLoading 
              ? (selectedChannel ? 'Modification...' : 'Création...') 
              : (selectedChannel ? 'Modifier' : 'Créer')
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Channel Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Test du Canal - {selectedChannel?.name}
        </DialogTitle>
        <DialogContent>
          {testChannelMutation.isLoading ? (
            <Box display="flex" alignItems="center" gap={2} sx={{ mt: 2 }}>
              <LinearProgress sx={{ flexGrow: 1 }} />
              <Typography variant="body2">Test en cours...</Typography>
            </Box>
          ) : testResult ? (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
              {testResult.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <div>
        {snackbar.open && (
          <div style={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            zIndex: 1000
          }}>
            {snackbar.message}
            <button 
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              style={{ marginLeft: 10, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </Box>
  );
};

export default MultiChannelNotifications;