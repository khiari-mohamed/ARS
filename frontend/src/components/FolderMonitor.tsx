import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  InsertDriveFile,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Settings,
  PlayArrow,
  Pause
} from '@mui/icons-material';

interface Props {
  onFileProcessed: () => void;
}

interface FileStatus {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: string;
  error?: string;
}

const FolderMonitor: React.FC<Props> = ({ onFileProcessed }) => {
  const [monitoringActive, setMonitoringActive] = useState(true);
  const [watchedFolders, setWatchedFolders] = useState([
    { path: './paperstream-input', name: 'PaperStream Input', active: true },
    { path: './paperstream-processed', name: 'PaperStream Processed', active: true },
    { path: './uploads/documents', name: 'Documents Upload', active: true }
  ]);
  const [recentFiles, setRecentFiles] = useState<FileStatus[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');

  useEffect(() => {
    if (monitoringActive) {
      // Load real file monitoring data
      const loadRecentFiles = async () => {
        try {
          // This would connect to real file monitoring API
          // For now, show empty state until real data is available
          setRecentFiles([]);
        } catch (error) {
          console.error('Failed to load recent files:', error);
          setRecentFiles([]);
        }
      };
      
      loadRecentFiles();
      const interval = setInterval(loadRecentFiles, 10000);
      return () => clearInterval(interval);
    }
  }, [monitoringActive, onFileProcessed]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <LinearProgress sx={{ width: 20, height: 20 }} />;
      case 'error':
        return <Error color="error" />;
      case 'pending':
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'error': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Traité';
      case 'processing': return 'En cours';
      case 'error': return 'Erreur';
      case 'pending': return 'En attente';
      default: return 'Inconnu';
    }
  };

  const toggleMonitoring = () => {
    setMonitoringActive(!monitoringActive);
  };

  const addWatchedFolder = () => {
    if (newFolderPath.trim()) {
      setWatchedFolders(prev => [...prev, {
        path: newFolderPath,
        name: newFolderPath.split('/').pop() || newFolderPath,
        active: true
      }]);
      setNewFolderPath('');
      setSettingsOpen(false);
    }
  };

  const toggleFolderWatch = (index: number) => {
    setWatchedFolders(prev => prev.map((folder, i) => 
      i === index ? { ...folder, active: !folder.active } : folder
    ));
  };

  return (
    <Box>
      {/* Monitoring Status */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={{ xs: 2, sm: 0 }}
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography 
            variant="h6"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            Surveillance Active
          </Typography>
          <Chip
            label={monitoringActive ? 'Actif' : 'Inactif'}
            color={monitoringActive ? 'success' : 'default'}
            icon={monitoringActive ? <PlayArrow /> : <Pause />}
            size="small"
          />
        </Box>
        <Box 
          display="flex" 
          gap={1}
          width={{ xs: '100%', sm: 'auto' }}
          justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}
        >
          <IconButton 
            onClick={toggleMonitoring} 
            color="primary"
            size="small"
          >
            {monitoringActive ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton 
            onClick={() => setSettingsOpen(true)}
            size="small"
          >
            <Settings />
          </IconButton>
          <IconButton 
            onClick={() => window.location.reload()}
            size="small"
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Watched Folders */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Dossiers Surveillés
          </Typography>
          <List dense>
            {watchedFolders.map((folder, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {folder.active ? <FolderOpen color="primary" /> : <Folder />}
                </ListItemIcon>
                <ListItemText
                  primary={folder.name}
                  secondary={folder.path}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={folder.active ? 'Actif' : 'Inactif'}
                    color={folder.active ? 'success' : 'default'}
                    size="small"
                    onClick={() => toggleFolderWatch(index)}
                    clickable
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Fichiers Récents
          </Typography>
          
          {recentFiles.length === 0 ? (
            <Alert severity="info">
              Aucun fichier détecté récemment
            </Alert>
          ) : (
            <List>
              {recentFiles.map((file, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <InsertDriveFile />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption">
                          {new Date(file.timestamp).toLocaleTimeString()}
                        </Typography>
                        {file.error && (
                          <Typography variant="caption" color="error">
                            - {file.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(file.status)}
                      <Chip
                        label={getStatusLabel(file.status)}
                        color={getStatusColor(file.status) as any}
                        size="small"
                      />
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Processing Statistics */}
      <Box mt={2}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Statistiques:</strong> {recentFiles.filter(f => f.status === 'completed').length} traités, {' '}
            {recentFiles.filter(f => f.status === 'processing').length} en cours, {' '}
            {recentFiles.filter(f => f.status === 'pending').length} en attente, {' '}
            {recentFiles.filter(f => f.status === 'error').length} erreurs
          </Typography>
        </Alert>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Configuration de la Surveillance</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Chemin du dossier à surveiller"
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            margin="normal"
            placeholder="./nouveau-dossier"
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Le système surveillera automatiquement les nouveaux fichiers dans ce dossier
              et les traitera selon les paramètres de qualité configurés.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Annuler</Button>
          <Button onClick={addWatchedFolder} variant="contained">
            Ajouter Dossier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FolderMonitor;