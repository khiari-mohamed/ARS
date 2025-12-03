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
  Checkbox,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Upload,
  Download,
  People,
  PersonAdd,
  Group
} from '@mui/icons-material';
import { fetchAllUsers, bulkCreateUsers, bulkUpdateUsers, bulkDeleteUsers, getRoleTemplates, createUserFromTemplate } from '../services/superAdminService';
import { LocalAPI } from '../services/axios';

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
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdvancedUserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [chefEquipes, setChefEquipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'create' | 'update' | 'delete'>('create');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'GESTIONNAIRE',
    department: '',
    phone: '',
    teamLeaderId: '',
    capacity: 50
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, templatesData, departmentsData, chefEquipesData] = await Promise.all([
        LocalAPI.get('/users').then((res: any) => res.data),
        getRoleTemplates(),
        LocalAPI.get('/super-admin/departments').then((res: any) => res.data).catch(() => []),
        LocalAPI.get('/users/chef-equipes').then((res: any) => res.data).catch(() => [])
      ]);
      setUsers(usersData);
      setRoleTemplates(templatesData);
      setDepartments(departmentsData);
      setChefEquipes(chefEquipesData);
    } catch (error) {
      console.error('Failed to load user management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === users.length 
        ? [] 
        : users.map(user => user.id)
    );
  };

  const handleBulkOperation = async () => {
    try {
      switch (bulkOperation) {
        case 'delete':
          await bulkDeleteUsers(selectedUsers);
          break;
        case 'update':
          // Implementation for bulk update would go here
          break;
      }
      await loadData();
      setSelectedUsers([]);
      setBulkDialogOpen(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const userData = {
        fullName: newUserData.fullName,
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role,
        department: newUserData.department || undefined,
        teamLeaderId: newUserData.role === 'GESTIONNAIRE' && newUserData.teamLeaderId ? newUserData.teamLeaderId : undefined,
        active: true
      };
      await LocalAPI.post('/users', userData);
      await loadData();
      setTemplateDialogOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', role: 'GESTIONNAIRE', department: '', phone: '', teamLeaderId: '', capacity: 50 });
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setNewUserData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role || 'GESTIONNAIRE',
      department: user.department || '',
      phone: user.phone || '',
      teamLeaderId: user.teamLeaderId || '',
      capacity: user.capacity || 50
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = {
        fullName: newUserData.fullName,
        email: newUserData.email,
        teamLeaderId: newUserData.role === 'GESTIONNAIRE' && newUserData.teamLeaderId ? newUserData.teamLeaderId : undefined,
        capacity: newUserData.capacity
      };
      await LocalAPI.put(`/users/${selectedUser.id}`, updateData);
      await loadData();
      setEditDialogOpen(false);
      setSelectedUser(null);
      setNewUserData({ fullName: '', email: '', password: '', role: 'GESTIONNAIRE', department: '', phone: '', teamLeaderId: '', capacity: 50 });
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    try {
      console.log('Deleting user:', selectedUser.id);
      const response = await LocalAPI.delete(`/users/${selectedUser.id}`);
      console.log('Delete response:', response);
      
      // Force immediate UI update
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      
      // Also reload data
      setTimeout(() => loadData(), 100);
    } catch (error: any) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      alert(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'error';
      case 'ADMINISTRATEUR': return 'warning';
      case 'CHEF_EQUIPE': return 'info';
      case 'GESTIONNAIRE': return 'success';
      case 'BO': return 'primary';
      case 'SCAN_TEAM': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Gestion Avancée des Utilisateurs
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            Créer Utilisateur
          </Button>
          {/* COMMENTED OUT: Template button */}
          {/* <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            Créer depuis Modèle
          </Button> */}
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => {
              setBulkOperation('create');
              setBulkDialogOpen(true);
            }}
          >
            Opérations en Lot
          </Button>
        </Box>
      </Box>

      {/* User Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Utilisateurs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {users.length}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
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
                    Utilisateurs Actifs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {users.filter(u => u.status === 'ACTIVE').length}
                  </Typography>
                </Box>
                <People color="success" sx={{ fontSize: 40 }} />
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
                    Administrateurs
                  </Typography>
                  <Typography variant="h4" component="div">
                    {users.filter(u => ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(u.role)).length}
                  </Typography>
                </Box>
                <People color="warning" sx={{ fontSize: 40 }} />
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
                    Modèles Disponibles
                  </Typography>
                  <Typography variant="h4" component="div">
                    {roleTemplates.length}
                  </Typography>
                </Box>
                <Group color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="user management tabs">
            <Tab label="Liste des Utilisateurs" />
            {/* <Tab label="Modèles de Rôles" /> */}
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Bulk Operations */}
          {selectedUsers.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography>
                  {selectedUsers.length} utilisateur(s) sélectionné(s)
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setBulkOperation('update');
                      setBulkDialogOpen(true);
                    }}
                  >
                    Modifier en Lot
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setBulkOperation('delete');
                      setBulkDialogOpen(true);
                    }}
                  >
                    Supprimer en Lot
                  </Button>
                </Box>
              </Box>
            </Alert>
          )}

          {/* Users Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                      checked={users.length > 0 && selectedUsers.length === users.length}
                      onChange={handleSelectAllUsers}
                    />
                  </TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>Département</TableCell>
                  <TableCell>Chef d'Équipe</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Dernière Connexion</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {user.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {user.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.department || 'Aucun département'}
                    </TableCell>
                    <TableCell>
                      {user.role === 'GESTIONNAIRE' && user.teamLeader ? (
                        <Typography variant="body2">
                          {user.teamLeader.fullName}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {user.role === 'GESTIONNAIRE' ? 'Non assigné' : '-'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status || 'ACTIVE'}
                        color={getStatusColor(user.status || 'ACTIVE') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Jamais'
                      }
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditUser(user)}
                          title="Modifier l'utilisateur"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                          title="Supprimer l'utilisateur"
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
        </TabPanel>

        {/* <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {roleTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Chip
                      label={template.role}
                      color={getRoleColor(template.role) as any}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Capacité par défaut: {template.defaultCapacity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Permissions: {template.permissions.length}
                    </Typography>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PersonAdd />}
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setTemplateDialogOpen(true);
                      }}
                    >
                      Créer Utilisateur
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel> */}
      </Paper>

      {/* Bulk Operations Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {bulkOperation === 'create' && 'Création en Lot'}
          {bulkOperation === 'update' && 'Modification en Lot'}
          {bulkOperation === 'delete' && 'Suppression en Lot'}
        </DialogTitle>
        <DialogContent>
          {bulkOperation === 'delete' && (
            <Alert severity="warning">
              Êtes-vous sûr de vouloir supprimer {selectedUsers.length} utilisateur(s) ?
              Cette action est irréversible.
            </Alert>
          )}
          {bulkOperation === 'update' && (
            <Typography>
              Fonctionnalité de modification en lot à implémenter selon les besoins spécifiques.
            </Typography>
          )}
          {bulkOperation === 'create' && (
            <Typography>
              Fonctionnalité de création en lot (import CSV/Excel) à implémenter.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleBulkOperation} 
            variant="contained"
            color={bulkOperation === 'delete' ? 'error' : 'primary'}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer Utilisateur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom complet"
                value={newUserData.fullName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                required
                helperText="Min 8 caractères, 1 majuscule, 1 chiffre"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={newUserData.role}
                  label="Rôle"
                  onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                  <MenuItem value="RESPONSABLE_DEPARTEMENT">Responsable Département</MenuItem>
                  <MenuItem value="ADMINISTRATEUR">Administrateur</MenuItem>
                  <MenuItem value="CHEF_EQUIPE">Chef d'Équipe</MenuItem>
                  <MenuItem value="GESTIONNAIRE_SENIOR">Gestionnaire Senior</MenuItem>
                  <MenuItem value="GESTIONNAIRE">Gestionnaire</MenuItem>
                  <MenuItem value="BO">Bureau d'Ordre</MenuItem>
                  <MenuItem value="SCAN_TEAM">Équipe Scan</MenuItem>
                  <MenuItem value="FINANCE">Finance</MenuItem>
                  <MenuItem value="CLIENT_SERVICE">Service Client</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Département (optionnel)"
                value={newUserData.department}
                onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
              />
            </Grid>
            {newUserData.role === 'GESTIONNAIRE' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Chef d'Équipe *</InputLabel>
                  <Select
                    value={newUserData.teamLeaderId}
                    label="Chef d'Équipe *"
                    onChange={(e) => setNewUserData(prev => ({ ...prev, teamLeaderId: e.target.value }))}
                    required
                  >
                    <MenuItem value="">
                      <em>Sélectionner un Chef d'Équipe</em>
                    </MenuItem>
                    {chefEquipes.map((chef) => (
                      <MenuItem key={chef.id} value={chef.id}>
                        {chef.fullName} ({chef.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained"
            disabled={!newUserData.fullName || !newUserData.email || !newUserData.password || (newUserData.role === 'GESTIONNAIRE' && !newUserData.teamLeaderId)}
          >
            Créer Utilisateur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier Utilisateur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom complet"
                value={newUserData.fullName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacité Maximale"
                type="number"
                value={newUserData.capacity}
                onChange={(e) => setNewUserData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 50 }))}
                helperText="Nombre maximum de dossiers assignables"
                InputProps={{
                  inputProps: { min: 10, max: 200 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Rôle"
                value={newUserData.role}
                disabled
                helperText="Le rôle ne peut pas être modifié"
              />
            </Grid>
            {newUserData.role === 'GESTIONNAIRE' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Chef d'Équipe</InputLabel>
                  <Select
                    value={newUserData.teamLeaderId}
                    label="Chef d'Équipe"
                    onChange={(e) => setNewUserData(prev => ({ ...prev, teamLeaderId: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em>Aucun chef d'équipe</em>
                    </MenuItem>
                    {chefEquipes.map((chef) => (
                      <MenuItem key={chef.id} value={chef.id}>
                        {chef.fullName} ({chef.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleUpdateUser} 
            variant="contained"
            disabled={!newUserData.fullName || !newUserData.email}
          >
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Supprimer Utilisateur</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.fullName}</strong> ?
            Cette action est irréversible.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={confirmDeleteUser} 
            variant="contained"
            color="error"
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedUserManagement;