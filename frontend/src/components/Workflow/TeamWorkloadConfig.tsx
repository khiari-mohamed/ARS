import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { Settings, Group, Speed } from '@mui/icons-material';
import { useWorkflowConfig, TeamConfig } from '../../hooks/useWorkflowConfig';

const TeamWorkloadConfig: React.FC = () => {
  const { configs, loading, updateConfig, error } = useWorkflowConfig();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleUpdateConfig = async (teamId: string, values: Partial<TeamConfig>) => {
    const success = await updateConfig(teamId, values);
    if (success) {
      setSnackbar({ open: true, message: 'Configuration mise à jour avec succès', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Échec de la mise à jour', severity: 'error' });
    }
  };

  const getTeamDisplayName = (teamId: string) => {
    switch (teamId) {
      case 'CHEF_EQUIPE': return 'Chef d\'Équipe';
      case 'GESTIONNAIRE': return 'Gestionnaires';
      case 'SCAN_TEAM': return 'Équipe SCAN';
      case 'BO': return 'Bureau d\'Ordre';
      case 'FINANCE': return 'Finance';
      default: return teamId;
    }
  };

  const getOverflowActionLabel = (action: string) => {
    switch (action) {
      case 'LOWEST_LOAD': return 'Charge Minimale';
      case 'ROUND_ROBIN': return 'Rotation';
      case 'CAPACITY_BASED': return 'Basé sur Capacité';
      default: return action;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} display="flex" alignItems="center" gap={1}>
        <Settings />
        Configuration des Équipes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
            <Group />
            Configuration de la Charge de Travail
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Équipe</strong></TableCell>
                  <TableCell><strong>Charge Max</strong></TableCell>
                  <TableCell><strong>Réaffectation Auto</strong></TableCell>
                  <TableCell><strong>Action Débordement</strong></TableCell>
                  <TableCell><strong>Seuil d'Alerte</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.teamId}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Speed color="primary" />
                        {getTeamDisplayName(config.teamId)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={config.maxLoad}
                        size="small"
                        inputProps={{ min: 1, max: 200 }}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 50;
                          handleUpdateConfig(config.teamId, { maxLoad: value });
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.autoReassignEnabled}
                        onChange={(e) => {
                          handleUpdateConfig(config.teamId, { autoReassignEnabled: e.target.checked });
                        }}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={config.overflowAction}
                          onChange={(e) => {
                            handleUpdateConfig(config.teamId, { overflowAction: e.target.value });
                          }}
                        >
                          <MenuItem value="LOWEST_LOAD">Charge Minimale</MenuItem>
                          <MenuItem value="ROUND_ROBIN">Rotation</MenuItem>
                          <MenuItem value="CAPACITY_BASED">Basé sur Capacité</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={config.alertThreshold || 0}
                        size="small"
                        inputProps={{ min: 0, max: config.maxLoad }}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleUpdateConfig(config.teamId, { alertThreshold: value });
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {configs.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                Aucune configuration d'équipe trouvée. Les configurations par défaut seront créées automatiquement.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamWorkloadConfig;