import React, { useState, useRef } from 'react';
import { User, UserRole } from '../../types/user.d';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Switch, 
  FormControlLabel, 
  Button, 
  Avatar, 
  Typography,
  Chip,
  Autocomplete,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { PhotoCamera, Add, Delete } from '@mui/icons-material';

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Administrateur', description: 'Accès total à tous les modules' },
  { value: 'ADMINISTRATEUR', label: 'Administrateur', description: 'Accès global avec restrictions' },
  { value: 'RESPONSABLE_DEPARTEMENT', label: 'Responsable Département', description: 'Accès complet au département' },
  { value: 'CHEF_EQUIPE', label: 'Chef d\'Équipe', description: 'Gestion d\'équipe' },
  { value: 'GESTIONNAIRE', label: 'Gestionnaire', description: 'Traitement des dossiers' },
  { value: 'CLIENT_SERVICE', label: 'Service Client', description: 'Gestion des réclamations' },
  { value: 'FINANCE', label: 'Finance', description: 'Gestion des virements' },
];

const departments = ['Traitement', 'Finance', 'Service Client', 'Scan', 'Bureau d\'Ordre'];
const teams = ['Équipe A', 'Équipe B', 'Équipe C', 'Support'];
const availablePermissions = [
  'EXPORT_DATA', 'BULK_OPERATIONS', 'ADVANCED_FILTERS', 'SYSTEM_CONFIG', 
  'USER_MANAGEMENT', 'AUDIT_LOGS', 'REPORTS_ACCESS'
];

interface Props {
  mode: 'create' | 'edit';
  initial?: Partial<User>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  currentUserRole: UserRole;
  isSubmitting?: boolean;
  error?: string | null;
}

const EnhancedUserForm: React.FC<Props> = ({
  mode,
  initial = {},
  onSubmit,
  onCancel,
  currentUserRole,
  isSubmitting,
  error
}) => {
  const [form, setForm] = useState({
    fullName: initial.fullName || '',
    email: initial.email || '',
    password: '',
    role: (initial.role as UserRole) || 'GESTIONNAIRE',
    department: initial.department || '',
    team: initial.team || '',
    phone: initial.phone || '',
    position: initial.position || '',
    active: initial.active ?? true,
    permissions: initial.permissions || [],
    assignedClients: initial.assignedClients || [],
    photo: initial.photo || ''
  });

  const [photoPreview, setPhotoPreview] = useState(initial.photo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        setForm({ ...form, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const selectedRole = roleOptions.find(r => r.value === form.role);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {mode === 'create' ? 'Créer un utilisateur' : 'Modifier l\'utilisateur'}
      </Typography>

      <Grid container spacing={3}>
        {/* Photo Section */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                src={photoPreview}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              >
                {form.fullName.charAt(0)}
              </Avatar>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                Changer photo
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Form Fields */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom complet"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={isSubmitting || mode === 'edit'}
              />
            </Grid>

            {mode === 'create' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mot de passe"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={isSubmitting}
                  helperText="Min 8 caractères, 1 majuscule, 1 chiffre"
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Téléphone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Poste"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Role and Organization */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Rôle et Organisation</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rôle</InputLabel>
                    <Select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                      disabled={currentUserRole !== 'SUPER_ADMIN' || isSubmitting}
                    >
                      {roleOptions.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          <Box>
                            <Typography variant="body2">{role.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {role.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={departments}
                    value={form.department}
                    onChange={(_, value) => setForm({ ...form, department: value || '' })}
                    renderInput={(params) => <TextField {...params} label="Département" />}
                    disabled={isSubmitting}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={teams}
                    value={form.team}
                    onChange={(_, value) => setForm({ ...form, team: value || '' })}
                    renderInput={(params) => <TextField {...params} label="Équipe" />}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>

              {selectedRole && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Description du rôle:</strong> {selectedRole.description}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Permissions */}
        {currentUserRole === 'SUPER_ADMIN' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Permissions Spéciales</Typography>
                <Autocomplete
                  multiple
                  options={availablePermissions}
                  value={form.permissions}
                  onChange={(_, value) => setForm({ ...form, permissions: value })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.replace('_', ' ')}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Permissions additionnelles" />
                  )}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Status */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                disabled={isSubmitting}
              />
            }
            label="Compte actif"
          />
        </Grid>
      </Grid>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          size="large"
        >
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isSubmitting}
          size="large"
        >
          Annuler
        </Button>
      </Box>
    </Box>
  );
};

export default EnhancedUserForm;