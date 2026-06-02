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
  Paper,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  PersonAdd,
  Group,
  AdminPanelSettings,
  WarningAmberRounded,
  CheckCircleOutline,
  LayersOutlined
} from '@mui/icons-material';
import { fetchAllUsers, bulkCreateUsers, bulkUpdateUsers, bulkDeleteUsers, getRoleTemplates, createUserFromTemplate } from '../services/superAdminService';
import { LocalAPI } from '../services/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ─── Design Tokens (matching app theme) ───────────────────────────────────────

const T = {
  primaryDark:    '#1e3a5f',
  primaryMid:     '#2a4f82',
  bgStripeEven:   '#ffffff',
  bgStripeOdd:    '#f4f7fb',
  bgHover:        '#e8f0fe',
  bgFilter:       '#f0f4ff',
  borderTable:    '#e0e7ef',
  borderCard:     'rgba(0,0,0,0.08)',
  textPrimary:    '#37474f',
  textSecondary:  '#546e7a',
  textDisabled:   '#78909c',
};

// ─── Role / Status helpers ─────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  SUPER_ADMIN:             { label: 'Super Admin',           bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
  ADMINISTRATEUR:          { label: 'Administrateur',        bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  CHEF_EQUIPE:             { label: "Chef d'Équipe",         bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9' },
  GESTIONNAIRE:            { label: 'Gestionnaire',          bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  GESTIONNAIRE_SENIOR:     { label: 'Gestionnaire Senior',   bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  RESPONSABLE_DEPARTEMENT: { label: 'Resp. Département',     bg: '#fff8e1', color: '#e65100', border: '#ffcc80' },
  BO:                      { label: "Bureau d'Ordre",        bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  SCAN_TEAM:               { label: 'Équipe Scan',           bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  FINANCE:                 { label: 'Finance',               bg: '#e0f7fa', color: '#00695c', border: '#80cbc4' },
  CLIENT_SERVICE:          { label: 'Service Client',        bg: '#fce4ec', color: '#880e4f', border: '#f48fb1' },
};

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE:    { label: 'Actif',    bg: '#e6f4ed', color: '#1b6b3a', border: '#a5d6a7' },
  INACTIVE:  { label: 'Inactif', bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' },
  SUSPENDED: { label: 'Suspendu',bg: '#fdecea', color: '#b71c1c', border: '#ef9a9a' },
};

function roleBadge(role: string) {
  const m = ROLE_META[role] ?? { label: role, bg: '#f5f5f5', color: '#546e7a', border: '#cfd8dc' };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center',
        px: '8px', py: '2px',
        borderRadius: '4px',
        border: `1px solid ${m.border}`,
        background: m.bg, color: m.color,
        fontSize: '0.70rem', fontWeight: 700,
        whiteSpace: 'nowrap', lineHeight: 1.6,
      }}
    >
      {m.label}
    </Box>
  );
}

function statusBadge(status: string) {
  const key = status ?? 'ACTIVE';
  const m = STATUS_META[key] ?? STATUS_META.INACTIVE;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center',
        px: '8px', py: '2px',
        borderRadius: '4px',
        border: `1px solid ${m.border}`,
        background: m.bg, color: m.color,
        fontSize: '0.70rem', fontWeight: 700,
        whiteSpace: 'nowrap', lineHeight: 1.6,
      }}
    >
      {m.label}
    </Box>
  );
}

function userInitials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  accent: string;
  Icon: React.ElementType;
}

function StatCard({ label, value, accent, Icon }: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${T.borderCard}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: '8px',
        transition: 'box-shadow .2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
        height: '100%',
      }}
    >
      <CardContent sx={{ pb: '12px !important', px: 2.5, pt: 2.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography
              sx={{
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px',
                textTransform: 'uppercase', color: T.textSecondary, mb: 0.5,
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: T.primaryDark, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: '50%',
              background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon sx={{ color: accent, fontSize: 22 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
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

// ─── Shared dialog title style ────────────────────────────────────────────────

const dialogTitleSx = {
  background: '#f4f7fb',
  borderBottom: `1px solid ${T.borderTable}`,
  py: 1.5, px: 2.5,
  fontSize: '0.95rem', fontWeight: 700, color: T.primaryDark,
};

// ─── Main Component ───────────────────────────────────────────────────────────

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
    capacity: 50,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [usersData, templatesData, departmentsData, chefEquipesData] = await Promise.all([
        LocalAPI.get('/users').then((res: any) => res.data),
        getRoleTemplates(),
        LocalAPI.get('/super-admin/departments').then((res: any) => res.data).catch(() => []),
        LocalAPI.get('/users/chef-equipes').then((res: any) => res.data).catch(() => []),
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
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === users.length ? [] : users.map(u => u.id)
    );
  };

  const handleBulkOperation = async () => {
    try {
      switch (bulkOperation) {
        case 'delete': await bulkDeleteUsers(selectedUsers); break;
        case 'update': break;
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
        active: true,
      };
      await LocalAPI.post('/users', userData);
      await loadData();
      setTemplateDialogOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', role: 'GESTIONNAIRE', department: '', phone: '', teamLeaderId: '', capacity: 50 });
    } catch (error) {
      console.error('Failed to create user:', error);
      alert("Erreur lors de la création de l'utilisateur");
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
      capacity: user.capacity || 50,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = {
        fullName: newUserData.fullName,
        email: newUserData.email,
        teamLeaderId: newUserData.role === 'GESTIONNAIRE' && newUserData.teamLeaderId ? newUserData.teamLeaderId : undefined,
        capacity: newUserData.capacity,
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
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setTimeout(() => loadData(), 100);
    } catch (error: any) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      alert(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // ─── Table header cell ────────────────────────────────────────────────────

  const TH = ({ children, checkbox = false }: { children?: React.ReactNode; checkbox?: boolean }) => (
    <TableCell
      padding={checkbox ? 'checkbox' : 'normal'}
      sx={{
        background: `${T.primaryDark} !important`,
        color: '#fff !important',
        fontSize: '0.70rem',
        fontWeight: 700,
        letterSpacing: '0.4px',
        borderRight: `1px solid rgba(255,255,255,0.08)`,
        '&:last-child': { borderRight: 'none' },
        whiteSpace: 'nowrap',
        py: 1.2,
        px: 1.5,
      }}
    >
      {children}
    </TableCell>
  );

  const TD = ({ children, sx = {} }: { children?: React.ReactNode; sx?: object }) => (
    <TableCell
      sx={{
        fontSize: '0.81rem',
        color: T.textPrimary,
        borderRight: `1px solid ${T.borderTable}`,
        '&:last-child': { borderRight: 'none' },
        py: 0.9,
        px: 1.5,
        ...sx,
      }}
    >
      {children}
    </TableCell>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Header ── */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, color: T.primaryDark, letterSpacing: '-0.5px', lineHeight: 1.2 }}
          >
            Gestion des Utilisateurs
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: T.textSecondary, mt: 0.3 }}>
            Administration avancée des comptes et rôles
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<PersonAdd sx={{ fontSize: 17 }} />}
            onClick={() => setTemplateDialogOpen(true)}
            sx={{
              background: T.primaryDark,
              '&:hover': { background: T.primaryMid },
              fontSize: '0.78rem',
              fontWeight: 600,
              px: 2,
              textTransform: 'none',
              borderRadius: '6px',
              boxShadow: 'none',
            }}
          >
            Créer un utilisateur
          </Button>
          <Button
            variant="outlined"
            startIcon={<LayersOutlined sx={{ fontSize: 17 }} />}
            onClick={() => { setBulkOperation('create'); setBulkDialogOpen(true); }}
            sx={{
              borderColor: T.primaryDark,
              color: T.primaryDark,
              fontSize: '0.78rem',
              fontWeight: 600,
              px: 2,
              textTransform: 'none',
              borderRadius: '6px',
              '&:hover': { background: T.primaryDark, color: '#fff' },
            }}
          >
            Opérations en lot
          </Button>
        </Box>
      </Box>

      {/* ── Stats Cards ── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Utilisateurs"  value={users.length}                                                               accent="#2196f3" Icon={People} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Utilisateurs Actifs" value={users.filter(u => u.status === 'ACTIVE').length}                           accent="#4caf50" Icon={CheckCircleOutline} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Administrateurs"     value={users.filter(u => ['SUPER_ADMIN','ADMINISTRATEUR'].includes(u.role)).length} accent="#f44336" Icon={AdminPanelSettings} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Modèles Disponibles" value={roleTemplates.length}                                                       accent="#9c27b0" Icon={Group} />
        </Grid>
      </Grid>

      {/* ── Main Table Card ── */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${T.borderTable}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Tabs */}
        <Box sx={{ borderBottom: `1px solid ${T.borderTable}`, background: '#fff' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="user management tabs"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                fontSize: '0.80rem', fontWeight: 600, textTransform: 'none',
                color: T.textSecondary, minHeight: 44,
              },
              '& .Mui-selected': { color: T.primaryDark },
              '& .MuiTabs-indicator': { background: T.primaryDark, height: 2 },
            }}
          >
            <Tab label="Liste des utilisateurs" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>

          {/* Bulk alert */}
          {selectedUsers.length > 0 && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mb: 2, py: 0.8, px: 2,
                background: '#e3f2fd',
                border: `1px solid #90caf9`,
                borderRadius: '6px',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={1}
              >
                <Typography sx={{ fontSize: '0.81rem', fontWeight: 600, color: '#0d47a1' }}>
                  {selectedUsers.length} utilisateur(s) sélectionné(s)
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { setBulkOperation('update'); setBulkDialogOpen(true); }}
                    sx={{
                      fontSize: '0.75rem', textTransform: 'none', borderRadius: '5px',
                      borderColor: '#0d47a1', color: '#0d47a1',
                      '&:hover': { background: '#0d47a1', color: '#fff' },
                    }}
                  >
                    Modifier en lot
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { setBulkOperation('delete'); setBulkDialogOpen(true); }}
                    sx={{
                      fontSize: '0.75rem', textTransform: 'none', borderRadius: '5px',
                      borderColor: '#b71c1c', color: '#b71c1c',
                      '&:hover': { background: '#b71c1c', color: '#fff' },
                    }}
                  >
                    Supprimer en lot
                  </Button>
                </Box>
              </Box>
            </Alert>
          )}

          {/* Table */}
          <TableContainer
            sx={{
              borderRadius: '6px',
              border: `1px solid ${T.borderTable}`,
              maxHeight: 580,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '6px', width: '6px' },
              '&::-webkit-scrollbar-track': { background: '#f0f4ff' },
              '&::-webkit-scrollbar-thumb': { background: '#90a4be', borderRadius: '3px' },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TH checkbox>
                    <Checkbox
                      size="small"
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                      checked={users.length > 0 && selectedUsers.length === users.length}
                      onChange={handleSelectAllUsers}
                      sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' }, p: 0.5 }}
                    />
                  </TH>
                  <TH>Utilisateur</TH>
                  <TH>Email</TH>
                  <TH>Rôle</TH>
                  <TH>Département</TH>
                  <TH>Chef d'Équipe</TH>
                  <TH>Statut</TH>
                  <TH>Dernière Connexion</TH>
                  <TH>Actions</TH>
                </TableRow>
              </TableHead>

              <TableBody>
                {users.map((user, idx) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      background: idx % 2 === 0 ? T.bgStripeEven : T.bgStripeOdd,
                      '&:hover': { background: T.bgHover },
                      transition: 'background .15s',
                    }}
                  >
                    {/* Checkbox */}
                    <TableCell padding="checkbox" sx={{ borderRight: `1px solid ${T.borderTable}` }}>
                      <Checkbox
                        size="small"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        sx={{ p: 0.5, color: T.textDisabled }}
                      />
                    </TableCell>

                    {/* User */}
                    <TD>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        <Avatar
                          sx={{
                            width: 30, height: 30,
                            background: `${T.primaryDark}18`,
                            color: T.primaryDark,
                            fontSize: '0.68rem', fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {userInitials(user.fullName)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: '0.81rem', fontWeight: 600, color: T.textPrimary, lineHeight: 1.3 }}>
                            {user.fullName}
                          </Typography>
                          <Typography sx={{ fontSize: '0.70rem', color: T.textDisabled, lineHeight: 1.2 }}>
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TD>

                    {/* Email */}
                    <TD>
                      <Typography sx={{ fontSize: '0.81rem', color: T.textSecondary }}>
                        {user.email}
                      </Typography>
                    </TD>

                    {/* Role */}
                    <TD>{roleBadge(user.role)}</TD>

                    {/* Department */}
                    <TD>
                      <Typography sx={{ fontSize: '0.81rem', color: user.department ? T.textPrimary : T.textDisabled, fontStyle: user.department ? 'normal' : 'italic' }}>
                        {user.department || 'Aucun'}
                      </Typography>
                    </TD>

                    {/* Chef d'Équipe */}
                    <TD>
                      {user.role === 'GESTIONNAIRE' && user.teamLeader ? (
                        <Typography sx={{ fontSize: '0.81rem', color: T.textPrimary }}>
                          {user.teamLeader.fullName}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: '0.81rem', color: T.textDisabled, fontStyle: 'italic' }}>
                          {user.role === 'GESTIONNAIRE' ? 'Non assigné' : '—'}
                        </Typography>
                      )}
                    </TD>

                    {/* Status */}
                    <TD>{statusBadge(user.status || 'ACTIVE')}</TD>

                    {/* Last Login */}
                    <TD>
                      <Typography sx={{ fontSize: '0.78rem', color: T.textSecondary }}>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('fr-TN') : '—'}
                      </Typography>
                    </TD>

                    {/* Actions */}
                    <TD sx={{ whiteSpace: 'nowrap' }}>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Modifier" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            sx={{
                              border: `1px solid ${T.borderTable}`,
                              borderRadius: '5px', p: '4px',
                              color: T.primaryDark,
                              '&:hover': { background: T.primaryDark, color: '#fff', borderColor: T.primaryDark },
                            }}
                          >
                            <Edit sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user)}
                            sx={{
                              border: '1px solid #fdecea',
                              borderRadius: '5px', p: '4px',
                              color: '#b71c1c',
                              '&:hover': { background: '#b71c1c', color: '#fff', borderColor: '#b71c1c' },
                            }}
                          >
                            <Delete sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TD>
                  </TableRow>
                ))}

                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Box
                        sx={{
                          py: 5, textAlign: 'center',
                          background: '#f8faff',
                          border: `1px dashed #c5d4e8`,
                          borderRadius: '8px', m: 1,
                        }}
                      >
                        <People sx={{ fontSize: 36, color: '#c5d4e8', mb: 1 }} />
                        <Typography sx={{ fontSize: '0.85rem', color: T.textSecondary }}>
                          Aucun utilisateur trouvé
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table caption */}
          {users.length > 0 && (
            <Box sx={{ pt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography sx={{ fontSize: '0.72rem', color: T.textDisabled }}>
                {users.length} utilisateur(s) au total
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* ══════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════ */}

      {/* ── Bulk Operations Dialog ── */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={dialogTitleSx}>
          {bulkOperation === 'create' && 'Création en lot'}
          {bulkOperation === 'update' && 'Modification en lot'}
          {bulkOperation === 'delete' && 'Suppression en lot'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          {bulkOperation === 'delete' && (
            <Alert
              severity="warning"
              icon={<WarningAmberRounded fontSize="small" />}
              sx={{ fontSize: '0.82rem', borderRadius: '6px' }}
            >
              Êtes-vous sûr de vouloir supprimer&nbsp;<strong>{selectedUsers.length}</strong>&nbsp;utilisateur(s) ?
              Cette action est irréversible.
            </Alert>
          )}
          {bulkOperation === 'update' && (
            <Typography sx={{ fontSize: '0.82rem', color: T.textSecondary }}>
              Fonctionnalité de modification en lot à implémenter selon les besoins spécifiques.
            </Typography>
          )}
          {bulkOperation === 'create' && (
            <Typography sx={{ fontSize: '0.82rem', color: T.textSecondary }}>
              Fonctionnalité de création en lot (import CSV/Excel) à implémenter.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setBulkDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '0.81rem', color: T.textSecondary, borderRadius: '6px' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleBulkOperation}
            variant="contained"
            sx={{
              textTransform: 'none', fontSize: '0.81rem', borderRadius: '6px',
              background: bulkOperation === 'delete' ? '#b71c1c' : T.primaryDark,
              '&:hover': { background: bulkOperation === 'delete' ? '#c62828' : T.primaryMid },
              boxShadow: 'none',
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create User Dialog ── */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={dialogTitleSx}>Créer un utilisateur</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nom complet" size="small" value={newUserData.fullName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" size="small" value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Mot de passe" type="password" size="small" value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                required helperText="Min 8 caractères, 1 majuscule, 1 chiffre" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Rôle</InputLabel>
                <Select value={newUserData.role} label="Rôle"
                  onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value }))}>
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
              <TextField fullWidth label="Département (optionnel)" size="small" value={newUserData.department}
                onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))} />
            </Grid>
            {newUserData.role === 'GESTIONNAIRE' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Chef d'Équipe *</InputLabel>
                  <Select value={newUserData.teamLeaderId} label="Chef d'Équipe *"
                    onChange={(e) => setNewUserData(prev => ({ ...prev, teamLeaderId: e.target.value }))} required>
                    <MenuItem value=""><em>Sélectionner un Chef d'Équipe</em></MenuItem>
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
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => setTemplateDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '0.81rem', color: T.textSecondary, borderRadius: '6px' }}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!newUserData.fullName || !newUserData.email || !newUserData.password ||
              (newUserData.role === 'GESTIONNAIRE' && !newUserData.teamLeaderId)}
            sx={{
              textTransform: 'none', fontSize: '0.81rem', borderRadius: '6px',
              background: T.primaryDark, '&:hover': { background: T.primaryMid }, boxShadow: 'none',
            }}
          >
            Créer l'utilisateur
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={dialogTitleSx}>Modifier l'utilisateur</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nom complet" size="small" value={newUserData.fullName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" size="small" value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Capacité maximale" type="number" size="small" value={newUserData.capacity}
                onChange={(e) => setNewUserData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 50 }))}
                helperText="Nombre maximum de dossiers assignables"
                InputProps={{ inputProps: { min: 10, max: 200 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Rôle" size="small" value={newUserData.role} disabled
                helperText="Le rôle ne peut pas être modifié" />
            </Grid>
            {newUserData.role === 'GESTIONNAIRE' && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Chef d'Équipe</InputLabel>
                  <Select value={newUserData.teamLeaderId} label="Chef d'Équipe"
                    onChange={(e) => setNewUserData(prev => ({ ...prev, teamLeaderId: e.target.value }))}>
                    <MenuItem value=""><em>Aucun chef d'équipe</em></MenuItem>
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
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '0.81rem', color: T.textSecondary, borderRadius: '6px' }}>
            Annuler
          </Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={!newUserData.fullName || !newUserData.email}
            sx={{
              textTransform: 'none', fontSize: '0.81rem', borderRadius: '6px',
              background: T.primaryDark, '&:hover': { background: T.primaryMid }, boxShadow: 'none',
            }}
          >
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete User Dialog ── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={dialogTitleSx}>Supprimer l'utilisateur</DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Alert
            severity="warning"
            icon={<WarningAmberRounded fontSize="small" />}
            sx={{ fontSize: '0.82rem', borderRadius: '6px' }}
          >
            Êtes-vous sûr de vouloir supprimer l'utilisateur&nbsp;
            <strong>{selectedUser?.fullName}</strong> ?
            Cette action est irréversible.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '0.81rem', color: T.textSecondary, borderRadius: '6px' }}>
            Annuler
          </Button>
          <Button
            onClick={confirmDeleteUser}
            variant="contained"
            sx={{
              textTransform: 'none', fontSize: '0.81rem', borderRadius: '6px',
              background: '#b71c1c', '&:hover': { background: '#c62828' }, boxShadow: 'none',
            }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdvancedUserManagement;