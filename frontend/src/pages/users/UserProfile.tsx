import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserById, fetchUserPerformance, fetchUserActivity, updateUser } from '../../api/usersApi';
import { User, UserRole, ROLE_LABELS } from '../../types/user.d';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Email,
  Business,
  Phone,
  Work,
  Assessment,
  TrendingUp,
  Schedule
} from '@mui/icons-material';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const isOwnProfile = currentUser?.id === id;
  const canEdit = isOwnProfile || ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentUser?.role || '');

  useEffect(() => {
    const loadUserData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [userData, perfData, activityData] = await Promise.all([
          fetchUserById(id),
          fetchUserPerformance(id).catch(() => null),
          fetchUserActivity(id).catch(() => null)
        ]);
        
        setUser(userData);
        setPerformance(perfData);
        setActivity(activityData);
        setEditForm(userData);
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message, severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id]);

  const handleSave = async () => {
    if (!user || !id) return;
    
    try {
      const updatedUser = await updateUser(id, editForm);
      setUser(updatedUser);
      setEditing(false);
      setSnackbar({ open: true, message: 'Profil mis à jour avec succès', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleCancel = () => {
    setEditForm(user || {});
    setEditing(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="error">Utilisateur non trouvé</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Profil utilisateur
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/users')}
        >
          Retour à la liste
        </Button>
      </Box>

      {/* User Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar
              src={user.photo}
              sx={{ width: 100, height: 100 }}
            >
              {user.fullName.charAt(0)}
            </Avatar>
            
            <Box flex={1}>
              <Typography variant="h5" gutterBottom>
                {user.fullName}
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <Chip 
                  label={ROLE_LABELS[user.role]} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={user.active ? 'Actif' : 'Inactif'} 
                  color={user.active ? 'success' : 'error'} 
                  size="small" 
                />
                {activity?.isOnline && (
                  <Chip 
                    label="En ligne" 
                    color="success" 
                    variant="outlined" 
                    size="small" 
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {user.email} • {user.department || 'Aucun département'}
              </Typography>
            </Box>
            
            {canEdit && (
              <Box>
                {editing ? (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      size="small"
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      size="small"
                    >
                      Annuler
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                    size="small"
                  >
                    Modifier
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Informations" icon={<Person />} />
          <Tab label="Performance" icon={<Assessment />} />
          <Tab label="Activité" icon={<TrendingUp />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations personnelles
                </Typography>
                
                {editing ? (
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Nom complet"
                      value={editForm.fullName || ''}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Téléphone"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Poste"
                      value={editForm.position || ''}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Département"
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      fullWidth
                    />
                    {!isOwnProfile && currentUser?.role === 'SUPER_ADMIN' && (
                      <>
                        <FormControl fullWidth>
                          <InputLabel>Rôle</InputLabel>
                          <Select
                            value={editForm.role || ''}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                          >
                            {Object.entries(ROLE_LABELS).map(([role, label]) => (
                              <MenuItem key={role} value={role}>{label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={editForm.active ?? true}
                              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                            />
                          }
                          label="Compte actif"
                        />
                      </>
                    )}
                  </Box>
                ) : (
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText 
                        primary="Nom complet" 
                        secondary={user.fullName} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText 
                        primary="Email" 
                        secondary={user.email} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Business /></ListItemIcon>
                      <ListItemText 
                        primary="Département" 
                        secondary={user.department || 'Non défini'} 
                      />
                    </ListItem>
                    {user.phone && (
                      <ListItem>
                        <ListItemIcon><Phone /></ListItemIcon>
                        <ListItemText 
                          primary="Téléphone" 
                          secondary={user.phone} 
                        />
                      </ListItem>
                    )}
                    {user.position && (
                      <ListItem>
                        <ListItemIcon><Work /></ListItemIcon>
                        <ListItemText 
                          primary="Poste" 
                          secondary={user.position} 
                        />
                      </ListItem>
                    )}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations système
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Rôle" 
                      secondary={ROLE_LABELS[user.role]} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Statut" 
                      secondary={user.active ? 'Compte actif' : 'Compte désactivé'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Créé le" 
                      secondary={new Date(user.createdAt).toLocaleDateString()} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Dernière modification" 
                      secondary={new Date(user.updatedAt).toLocaleDateString()} 
                    />
                  </ListItem>
                  {activity?.lastLogin && (
                    <ListItem>
                      <ListItemText 
                        primary="Dernière connexion" 
                        secondary={new Date(activity.lastLogin).toLocaleString()} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {performance && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Documents traités
                  </Typography>
                  <Typography variant="h4">
                    {performance.processedDocuments}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Conformité SLA
                  </Typography>
                  <Typography variant="h4">
                    {performance.slaCompliance}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={performance.slaCompliance} 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Temps moyen
                  </Typography>
                  <Typography variant="h4">
                    {performance.avgProcessingTime}h
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Score qualité
                  </Typography>
                  <Typography variant="h4">
                    {performance.qualityScore}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={performance.qualityScore} 
                    color={performance.qualityScore > 80 ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {activity && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activité récente (30 jours)
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Schedule /></ListItemIcon>
                      <ListItemText 
                        primary="Connexions totales" 
                        secondary={activity.totalLogins} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Documents traités" 
                        secondary={activity.documentsProcessed} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Tâches terminées" 
                        secondary={activity.tasksCompleted} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Statut de connexion
                  </Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor={activity.isOnline ? 'success.main' : 'grey.400'}
                      mr={1}
                    />
                    <Typography>
                      {activity.isOnline ? 'En ligne' : 'Hors ligne'}
                    </Typography>
                  </Box>
                  {activity.lastLogin && (
                    <Typography variant="body2" color="text.secondary">
                      Dernière connexion: {new Date(activity.lastLogin).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}