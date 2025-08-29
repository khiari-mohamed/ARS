import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers, useUserDashboardStats } from '../../hooks/useUsers';
import { canUserManageRole, validatePassword, generateTempPassword } from '../../api/usersApi';
import { User, UserRole, UserFilters, ROLE_LABELS, DEPARTMENTS } from '../../types/user.d';
import UserDashboard from '../../components/user/UserDashboard';
import BulkUserActions from '../../components/user/BulkUserActions';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Checkbox,
  Tooltip,
  CircularProgress,
  Fab,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Lock,
  PersonOff,
  PersonAdd,
  Visibility,
  FilterList,
  Download,
  MoreVert,
  Refresh,
  Search,
  Clear
} from '@mui/icons-material';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'GESTIONNAIRE',
    department: ''
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<User | null>(null);
  const [showUserDashboard, setShowUserDashboard] = useState<User | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        handleFilterChange({ search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Hooks
  const { users, loading, error, reload, addUser, editUser, deactivateUser, activateUser, resetPassword, bulkAction, exportUserData } = useUsers(filters);
  const { stats, loading: statsLoading } = useUserDashboardStats();

  // Filtered users count for display
  const filteredCount = useMemo(() => {
    let count = users.length;
    const hasFilters = filters.search || filters.role || filters.department || filters.active !== undefined;
    return { count, hasFilters };
  }, [users.length, filters]);

  // Check permissions
  const canManageUsers = currentUser?.role && ['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(currentUser.role);
  const canViewUsers = currentUser?.role && ['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 'CHEF_EQUIPE'].includes(currentUser.role);

  if (!canViewUsers) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </Alert>
      </Box>
    );
  }

  // Event handlers
  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    // Trigger reload with new filters
    reload(updatedFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    setSearchInput('');
    reload(clearedFilters);
  };

  const handleUserSelect = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password || !newUser.role) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs obligatoires', severity: 'error' });
      return;
    }
    
    if (newUser.password.length < 8 || !/[A-Z]/.test(newUser.password) || !/[a-z]/.test(newUser.password) || !/[0-9]/.test(newUser.password)) {
      setSnackbar({ open: true, message: 'Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule et chiffre', severity: 'error' });
      return;
    }
    
    try {
      await addUser({
        fullName: newUser.fullName.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: newUser.password,
        role: newUser.role as UserRole,
        department: newUser.department.trim() || undefined,
        active: true
      });
      setShowCreateDialog(false);
      setNewUser({ fullName: '', email: '', password: '', role: 'GESTIONNAIRE', department: '' });
      setSnackbar({ open: true, message: 'Utilisateur créé avec succès', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleEditUser = async (userData: any) => {
    if (!showEditDialog) return;
    
    try {
      await editUser(showEditDialog.id, userData);
      setShowEditDialog(null);
      setSnackbar({ open: true, message: 'Utilisateur modifié avec succès', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = generateTempPassword();
    
    try {
      await resetPassword(user.id, newPassword);
      setSnackbar({ 
        open: true, 
        message: `Mot de passe réinitialisé pour ${user.fullName}. Nouveau mot de passe: ${newPassword}`, 
        severity: 'success' 
      });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.active) {
        await deactivateUser(user.id);
        setSnackbar({ open: true, message: `${user.fullName} désactivé`, severity: 'success' });
      } else {
        await activateUser(user.id);
        setSnackbar({ open: true, message: `${user.fullName} activé`, severity: 'success' });
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedUsers.length === 0) return;

    try {
      const results = await bulkAction(selectedUsers, action as any, data);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      setSnackbar({ 
        open: true, 
        message: `Action terminée: ${successCount} succès, ${failCount} échecs`, 
        severity: successCount > 0 ? 'success' : 'error' 
      });
      
      setSelectedUsers([]);
      setShowBulkActions(false);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleExport = async () => {
    if (selectedUsers.length === 0) {
      setSnackbar({ open: true, message: 'Sélectionnez des utilisateurs à exporter', severity: 'info' });
      return;
    }

    try {
      await exportUserData(selectedUsers, 'csv');
      setSnackbar({ open: true, message: 'Export terminé', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUser(null);
  };

  // Render functions
  const renderActiveFilters = () => {
    const activeFilters = [];
    if (filters.search) activeFilters.push({ key: 'search', label: `Recherche: "${filters.search}"`, value: filters.search });
    if (filters.role) activeFilters.push({ key: 'role', label: `Rôle: ${ROLE_LABELS[filters.role as UserRole]}`, value: filters.role });
    if (filters.department) activeFilters.push({ key: 'department', label: `Département: ${filters.department}`, value: filters.department });
    if (filters.active !== undefined) activeFilters.push({ key: 'active', label: `Statut: ${filters.active ? 'Actifs' : 'Inactifs'}`, value: filters.active });

    if (activeFilters.length === 0) return null;

    return (
      <Box mb={2}>
        <Typography variant="subtitle2" gutterBottom>Filtres actifs:</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {activeFilters.map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              onDelete={() => handleFilterChange({ [filter.key]: undefined })}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
          <Button
            size="small"
            onClick={handleClearFilters}
            startIcon={<Clear />}
            sx={{ ml: 1 }}
          >
            Tout effacer
          </Button>
        </Box>
      </Box>
    );
  };

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: searchInput && (
                  <IconButton size="small" onClick={() => {
                    setSearchInput('');
                    handleFilterChange({ search: undefined });
                  }}>
                    <Clear />
                  </IconButton>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                Rôle
              </Typography>
              <Select
                fullWidth
                size="small"
                value={filters.role || ''}
                onChange={(e) => handleFilterChange({ role: (e.target.value as UserRole) || undefined })}
                displayEmpty
              >
                <MenuItem value="">Tous les rôles</MenuItem>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <MenuItem key={role} value={role}>{label}</MenuItem>
                ))}
              </Select>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                Département
              </Typography>
              <Select
                fullWidth
                size="small"
                value={filters.department || ''}
                onChange={(e) => handleFilterChange({ department: e.target.value || undefined })}
                displayEmpty
              >
                <MenuItem value="">Tous les départements</MenuItem>
                {DEPARTMENTS.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                Statut
              </Typography>
              <Select
                fullWidth
                size="small"
                value={filters.active === undefined ? '' : filters.active.toString()}
                onChange={(e) => handleFilterChange({ 
                  active: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                displayEmpty
              >
                <MenuItem value="">Tous les statuts</MenuItem>
                <MenuItem value="true">Actifs seulement</MenuItem>
                <MenuItem value="false">Inactifs seulement</MenuItem>
              </Select>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => reload(filters)}
                disabled={loading}
                size="small"
              >
                Actualiser
              </Button>
              
              {(filters.search || filters.role || filters.department || filters.active !== undefined) && (
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  disabled={loading}
                  size="small"
                  color="secondary"
                >
                  Effacer filtres
                </Button>
              )}
              
              {selectedUsers.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleExport}
                  size="small"
                  color="primary"
                >
                  Exporter ({selectedUsers.length})
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total utilisateurs
            </Typography>
            <Typography variant="h4">
              {statsLoading ? <CircularProgress size={24} /> : stats?.totalUsers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Utilisateurs actifs
            </Typography>
            <Typography variant="h4">
              {statsLoading ? <CircularProgress size={24} /> : stats?.activeUsers || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Nouveaux ce mois
            </Typography>
            <Typography variant="h4">
              {statsLoading ? <CircularProgress size={24} /> : stats?.newUsersThisMonth || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Sélectionnés
            </Typography>
            <Typography variant="h4">
              {selectedUsers.length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderUsersTable = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6">
              Utilisateurs ({filteredCount.count})
            </Typography>
            {filteredCount.hasFilters && (
              <Typography variant="caption" color="text.secondary">
                {filteredCount.count === 0 ? 'Aucun résultat' : 'Résultats filtrés'}
              </Typography>
            )}
          </Box>
          {selectedUsers.length > 0 && canManageUsers && (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setShowBulkActions(true)}
            >
              Actions groupées ({selectedUsers.length})
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Département</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Tâches</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">
                      Aucun utilisateur trouvé
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: user.active ? 'primary.main' : 'grey.500' }}>
                          {user.fullName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {user.fullName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ROLE_LABELS[user.role]} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {user.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.active ? 'Actif' : 'Inactif'}
                        size="small"
                        color={user.active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Chip label={user.activeTasksCount || 0} size="small" />
                        {(user.unreadNotifications || 0) > 0 && (
                          <Chip 
                            label={user.unreadNotifications} 
                            size="small" 
                            color="warning"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, user)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Gestion des utilisateurs
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {renderStatsCards()}
      {renderFilters()}
      {renderActiveFilters()}
      {renderUsersTable()}

      {/* Create User FAB */}
      {canManageUsers && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setShowCreateDialog(true)}
        >
          <Add />
        </Fab>
      )}

      {/* User Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setShowUserDashboard(menuUser);
          handleMenuClose();
        }}>
          <ListItemIcon><Visibility /></ListItemIcon>
          <ListItemText>Voir le profil</ListItemText>
        </MenuItem>
        
        {canManageUsers && menuUser && canUserManageRole(currentUser?.role as UserRole, menuUser.role) && (
          <>
            <MenuItem onClick={() => {
              setShowEditDialog(menuUser);
              handleMenuClose();
            }}>
              <ListItemIcon><Edit /></ListItemIcon>
              <ListItemText>Modifier</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={() => {
              if (menuUser) handleResetPassword(menuUser);
              handleMenuClose();
            }}>
              <ListItemIcon><Lock /></ListItemIcon>
              <ListItemText>Réinitialiser mot de passe</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={() => {
              if (menuUser) handleToggleUserStatus(menuUser);
              handleMenuClose();
            }}>
              <ListItemIcon>{menuUser?.active ? <PersonOff /> : <PersonAdd />}</ListItemIcon>
              <ListItemText>{menuUser?.active ? 'Désactiver' : 'Activer'}</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Créer un utilisateur</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom complet"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                helperText="Min 8 caractères, 1 majuscule, 1 chiffre"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <MenuItem key={role} value={role}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Département (optionnel)"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Annuler</Button>
          <Button 
            variant="contained"
            onClick={handleCreateUser}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={Boolean(showEditDialog)}
        onClose={() => setShowEditDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Modifier l'utilisateur - {showEditDialog?.fullName}</DialogTitle>
        <DialogContent>
          {showEditDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom complet"
                  defaultValue={showEditDialog.fullName}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, fullName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={showEditDialog.email}
                  disabled
                  helperText="L'email ne peut pas être modifié"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Rôle</InputLabel>
                  <Select 
                    value={showEditDialog.role}
                    onChange={(e) => setShowEditDialog({ ...showEditDialog, role: e.target.value as UserRole })}
                    disabled={!canUserManageRole(currentUser?.role as UserRole, showEditDialog.role)}
                  >
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <MenuItem key={role} value={role}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Département"
                  defaultValue={showEditDialog.department || ''}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  defaultValue={showEditDialog.phone || ''}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Poste"
                  defaultValue={showEditDialog.position || ''}
                  onChange={(e) => setShowEditDialog({ ...showEditDialog, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <Box display="flex" alignItems="center">
                    <Checkbox
                      checked={showEditDialog.active}
                      onChange={(e) => setShowEditDialog({ ...showEditDialog, active: e.target.checked })}
                    />
                    <Typography>Compte actif</Typography>
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(null)}>Annuler</Button>
          <Button 
            variant="contained"
            onClick={() => showEditDialog && handleEditUser({
              fullName: showEditDialog.fullName,
              role: showEditDialog.role,
              department: showEditDialog.department,
              phone: showEditDialog.phone,
              position: showEditDialog.position,
              active: showEditDialog.active
            })}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Dashboard Dialog */}
      <Dialog
        open={Boolean(showUserDashboard)}
        onClose={() => setShowUserDashboard(null)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Profil utilisateur - {showUserDashboard?.fullName}
        </DialogTitle>
        <DialogContent>
          {showUserDashboard && (
            <UserDashboard 
              user={showUserDashboard}
              onClose={() => setShowUserDashboard(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Component */}
      <BulkUserActions
        selectedUsers={users.filter(u => selectedUsers.includes(u.id))}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelectedUsers([])}
        currentUserRole={currentUser?.role as UserRole}
      />

      {/* Snackbar for notifications */}
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