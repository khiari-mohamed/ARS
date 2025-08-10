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
    { path: './scan-input', name: 'Dossier d\'entrée', active: true },
    { path: './scan-processed', name: 'Dossier traité', active: false },
    { path: './scan-error', name: 'Dossier erreur', active: false }
  ]);
  const [recentFiles, setRecentFiles] = useState<FileStatus[]>([
    {
      name: 'document_001.pdf',
      status: 'completed',
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      name: 'scan_002.jpg',
      status: 'processing',
      timestamp: new Date(Date.now() - 120000).toISOString()
    },
    {
      name: 'bulletin_003.tiff',
      status: 'pending',
      timestamp: new Date(Date.now() - 60000).toISOString()
    }
  ]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');

  useEffect(() => {
    if (monitoringActive) {
      const interval = setInterval(() => {
        // Simulate file processing updates
        setRecentFiles(prev => prev.map(file => {
          if (file.status === 'processing' && Math.random() > 0.7) {
            onFileProcessed();
            return { ...file, status: 'completed' };
          }
          if (file.status === 'pending' && Math.random() > 0.8) {
            return { ...file, status: 'processing' };
          }
          return file;
        }));
      }, 2000);

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">
            Surveillance Active
          </Typography>
          <Chip
            label={monitoringActive ? 'Actif' : 'Inactif'}
            color={monitoringActive ? 'success' : 'default'}
            icon={monitoringActive ? <PlayArrow /> : <Pause />}
          />
        </Box>
        <Box display="flex" gap={1}>
          <IconButton onClick={toggleMonitoring} color="primary">
            {monitoringActive ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
          <IconButton onClick={() => window.location.reload()}>
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