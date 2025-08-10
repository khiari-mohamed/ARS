import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Slider,
  Switch,
  FormControlLabel,
  Autocomplete
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Delete,
  FilterList,
  Clear,
  Add,
  DateRange
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

interface Props {
  onFiltersChange: (filters: any) => void;
  clients: Array<{ id: string; name: string }>;
  users: Array<{ id: string; fullName: string }>;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: any;
  isDefault?: boolean;
}

const statusOptions = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'SCAN_EN_COURS', label: 'Scan en cours' },
  { value: 'SCAN_TERMINE', label: 'Scan terminé' },
  { value: 'ASSIGNE', label: 'Assigné' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TRAITE', label: 'Traité' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'EN_DIFFICULTE', label: 'En difficulté' }
];

const priorityOptions = [
  { value: 'LOW', label: 'Faible' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Élevée' },
  { value: 'URGENT', label: 'Urgent' }
];

const AdvancedBordereauFilters: React.FC<Props> = ({ 
  onFiltersChange, 
  clients, 
  users 
}) => {
  const [filters, setFilters] = useState<any>({});
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Default presets
  const defaultPresets: FilterPreset[] = [
    {
      id: 'urgent',
      name: 'Urgent - À traiter',
      filters: {
        statut: ['EN_ATTENTE', 'ASSIGNE'],
        daysRemaining: [0, 3],
        priority: ['HIGH', 'URGENT']
      },
      isDefault: true
    },
    {
      id: 'overdue',
      name: 'En retard',
      filters: {
        overdue: true,
        statut: ['EN_COURS', 'ASSIGNE']
      },
      isDefault: true
    },
    {
      id: 'unassigned',
      name: 'Non assignés',
      filters: {
        statut: ['EN_ATTENTE', 'SCAN_TERMINE'],
        assigned: false
      },
      isDefault: true
    },
    {
      id: 'this_week',
      name: 'Cette semaine',
      filters: {
        dateReception: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      },
      isDefault: true
    }
  ];

  useEffect(() => {
    // Load saved presets from localStorage
    const savedPresets = localStorage.getItem('bordereau_filter_presets');
    if (savedPresets) {
      setPresets([...defaultPresets, ...JSON.parse(savedPresets)]);
    } else {
      setPresets(defaultPresets);
    }
  }, []);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value
    }));
    setActivePreset(null); // Clear active preset when manually changing filters
  };

  const clearFilters = () => {
    setFilters({});
    setActivePreset(null);
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setActivePreset(preset.id);
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      filters: { ...filters }
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    
    // Save to localStorage (excluding default presets)
    const customPresets = updatedPresets.filter(p => !p.isDefault);
    localStorage.setItem('bordereau_filter_presets', JSON.stringify(customPresets));
    
    setNewPresetName('');
    setPresetDialogOpen(false);
    setActivePreset(newPreset.id);
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    
    // Save to localStorage
    const customPresets = updatedPresets.filter(p => !p.isDefault);
    localStorage.setItem('bordereau_filter_presets', JSON.stringify(customPresets));
    
    if (activePreset === presetId) {
      setActivePreset(null);
    }
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return value !== undefined && value !== null && value !== '';
    }).length;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <FilterList />
            Filtres avancés
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} actif(s)`} 
                size="small" 
                color="primary" 
              />
            )}
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={() => setPresetDialogOpen(true)}
              disabled={getActiveFiltersCount() === 0}
              size="small"
            >
              Sauvegarder
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              disabled={getActiveFiltersCount() === 0}
              size="small"
            >
              Effacer
            </Button>
          </Box>
        </Box>

        {/* Filter Presets */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Filtres prédéfinis
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {presets.map((preset) => (
              <Chip
                key={preset.id}
                label={preset.name}
                onClick={() => applyPreset(preset)}
                onDelete={preset.isDefault ? undefined : () => deletePreset(preset.id)}
                color={activePreset === preset.id ? 'primary' : 'default'}
                variant={activePreset === preset.id ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        {/* Filter Sections */}
        <Grid container spacing={2}>
          {/* Basic Filters */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">Filtres de base</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      multiple
                      options={statusOptions}
                      getOptionLabel={(option) => option.label}
                      value={statusOptions.filter(option => 
                        filters.statut?.includes(option.value)
                      )}
                      onChange={(_, value) => 
                        updateFilter('statut', value.map(v => v.value))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Statut" />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      multiple
                      options={clients}
                      getOptionLabel={(option) => option.name}
                      value={clients.filter(client => 
                        filters.clientIds?.includes(client.id)
                      )}
                      onChange={(_, value) => 
                        updateFilter('clientIds', value.map(v => v.id))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Clients" />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      multiple
                      options={users}
                      getOptionLabel={(option) => option.fullName}
                      value={users.filter(user => 
                        filters.assignedTo?.includes(user.id)
                      )}
                      onChange={(_, value) => 
                        updateFilter('assignedTo', value.map(v => v.id))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Assigné à" />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Référence"
                      value={filters.reference || ''}
                      onChange={(e) => updateFilter('reference', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Date Filters */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">Filtres de date</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date réception - De"
                      value={filters.dateReception?.from || null}
                      onChange={(date) => updateFilter('dateReception', {
                        ...filters.dateReception,
                        from: date
                      })}
                      slots={{ textField: TextField }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date réception - À"
                      value={filters.dateReception?.to || null}
                      onChange={(date) => updateFilter('dateReception', {
                        ...filters.dateReception,
                        to: date
                      })}
                      slots={{ textField: TextField }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date limite - De"
                      value={filters.dateLimite?.from || null}
                      onChange={(date) => updateFilter('dateLimite', {
                        ...filters.dateLimite,
                        from: date
                      })}
                      slots={{ textField: TextField }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date limite - À"
                      value={filters.dateLimite?.to || null}
                      onChange={(date) => updateFilter('dateLimite', {
                        ...filters.dateLimite,
                        to: date
                      })}
                      slots={{ textField: TextField }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Advanced Filters */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">Filtres avancés</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>Nombre de BS</Typography>
                    <Slider
                      value={filters.nombreBS || [1, 100]}
                      onChange={(_, value) => updateFilter('nombreBS', value)}
                      valueLabelDisplay="auto"
                      min={1}
                      max={100}
                      marks={[
                        { value: 1, label: '1' },
                        { value: 50, label: '50' },
                        { value: 100, label: '100+' }
                      ]}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography gutterBottom>Jours restants</Typography>
                    <Slider
                      value={filters.daysRemaining || [-10, 30]}
                      onChange={(_, value) => updateFilter('daysRemaining', value)}
                      valueLabelDisplay="auto"
                      min={-10}
                      max={30}
                      marks={[
                        { value: -10, label: '-10' },
                        { value: 0, label: '0' },
                        { value: 30, label: '30' }
                      ]}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priorité</InputLabel>
                      <Select
                        multiple
                        value={filters.priority || []}
                        onChange={(e) => updateFilter('priority', e.target.value)}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => (
                              <Chip 
                                key={value} 
                                label={priorityOptions.find(p => p.value === value)?.label} 
                                size="small" 
                              />
                            ))}
                          </Box>
                        )}
                      >
                        {priorityOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={filters.overdue || false}
                            onChange={(e) => updateFilter('overdue', e.target.checked)}
                          />
                        }
                        label="En retard uniquement"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={filters.assigned === false}
                            onChange={(e) => updateFilter('assigned', !e.target.checked)}
                          />
                        }
                        label="Non assignés uniquement"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={filters.hasDocuments || false}
                            onChange={(e) => updateFilter('hasDocuments', e.target.checked)}
                          />
                        }
                        label="Avec documents"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        {/* Save Preset Dialog */}
        <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)}>
          <DialogTitle>Sauvegarder le filtre</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Nom du filtre"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPresetDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={saveCurrentAsPreset}
              disabled={!newPresetName.trim()}
              variant="contained"
            >
              Sauvegarder
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
};

export default AdvancedBordereauFilters;