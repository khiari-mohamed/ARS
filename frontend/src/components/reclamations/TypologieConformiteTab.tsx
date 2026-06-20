// D:\ARS\frontend\src\components\reclamations\TypologieConformiteTab.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { useAuth } from '../../contexts/AuthContext';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Typography, Box,
  Alert, CircularProgress,
} from '@mui/material';
import { Category, Edit, CheckCircle, Cancel } from '@mui/icons-material';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#1e3a5f';
const BORDER = 'rgba(0,0,0,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReclamationItem {
  id: string;
  client?: { name: string };
  clientId: string;
  type: string;
  typologie?: string;
  conformite?: string;
  status: string;
  severity: string;
  description: string;
  createdAt: string;
  assignedTo?: { fullName: string };
}

// ─── API functions (preserved 100%) ──────────────────────────────────────────
const fetchReclamations = async (): Promise<ReclamationItem[]> => {
  const { data } = await LocalAPI.get('/reclamations', { params: { take: 1000 } });
  return data;
};

const updateConformite = async (payload: { id: string; conformite: string }) => {
  const { data } = await LocalAPI.patch(`/reclamations/${payload.id}`, {
    conformite: payload.conformite,
  });
  return data;
};

// ─── Chip sub-components ──────────────────────────────────────────────────────
const ConformiteChip: React.FC<{ value?: string }> = ({ value }) => {
  if (!value) {
    return (
      <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>
        Non définie
      </Typography>
    );
  }
  const ok = value === 'Fondé';
  return (
    <Chip
      label={value}
      size="small"
      sx={{
        bgcolor: ok ? '#e6f4ed' : '#fdecea',
        color:   ok ? '#1b6b3a' : '#b71c1c',
        border: `1px solid ${ok ? '#a5d6a7' : '#ef9a9a'}`,
        fontWeight: 700, fontSize: '0.72rem',
        borderRadius: 1, height: 22,
      }}
    />
  );
};

const TypeChip: React.FC<{ label: string }> = ({ label }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      bgcolor: '#e3f2fd', color: '#0d47a1',
      border: '1px solid #90caf9',
      fontWeight: 600, fontSize: '0.72rem',
      borderRadius: 1, height: 22,
    }}
  />
);

const TypologieChip: React.FC<{ label: string }> = ({ label }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      bgcolor: '#f3e5f5', color: '#6a1b9a',
      border: '1px solid #ce93d8',
      fontWeight: 600, fontSize: '0.72rem',
      borderRadius: 1, height: 22,
      maxWidth: 180,
    }}
  />
);

// ─── Table header columns ─────────────────────────────────────────────────────
const COLS = [
  'Client', 'Type', 'Typologie', 'Conformité',
  'Statut', 'Gravité', 'Assigné à', 'Date', 'Actions',
];

// ─── Main component ───────────────────────────────────────────────────────────
export const TypologieConformiteTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    reclamation: ReclamationItem | null;
  }>({ open: false, reclamation: null });

  const [conformiteValue, setConformiteValue] = useState('');

  // ── Queries / Mutations (preserved 100%) ──────────────────────────────────
  const { data: reclamations = [], isLoading, error } = useQuery(
    ['reclamations-typologie'],
    fetchReclamations,
    { refetchInterval: 30000 },
  );

  const conformiteMutation = useMutation(updateConformite, {
    onSuccess: () => {
      queryClient.invalidateQueries(['reclamations-typologie']);
      setEditDialog({ open: false, reclamation: null });
      setConformiteValue('');
    },
  });

  const canUpdateConformite =
    user && ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role);

  const handleEditConformite = (reclamation: ReclamationItem) => {
    setConformiteValue(reclamation.conformite || '');
    setEditDialog({ open: true, reclamation });
  };

  const handleSaveConformite = () => {
    if (editDialog.reclamation && conformiteValue) {
      conformiteMutation.mutate({
        id: editDialog.reclamation.id,
        conformite: conformiteValue,
      });
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center"
        justifyContent="center" minHeight={300} gap={2}>
        <CircularProgress size={36} sx={{ color: NAVY }} />
        <Typography variant="body2" color="text.secondary">
          Chargement des réclamations…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error"
        sx={{ borderRadius: 2, border: '1px solid #ef9a9a',
              borderLeft: '4px solid #b71c1c' }}>
        Erreur lors du chargement des réclamations
      </Alert>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Section header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          bgcolor: 'rgba(30,58,95,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Category sx={{ color: NAVY, fontSize: 19 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
            Typologie &amp; Conformité
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Gestion de la conformité des réclamations — Chef d'équipe &amp; Super Admin
          </Typography>
        </Box>
        <Chip
          label={`${reclamations.length} réclamation${reclamations.length !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: 'rgba(30,58,95,0.08)', color: NAVY,
            fontWeight: 700, fontSize: '0.72rem', height: 22,
          }}
        />
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: `1px solid ${BORDER}`,
          borderRadius: 2,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#cfd8dc', borderRadius: 3 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {COLS.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    bgcolor: NAVY, color: '#fff',
                    fontWeight: 700, fontSize: '0.70rem',
                    textTransform: 'uppercase', letterSpacing: '0.6px',
                    whiteSpace: 'nowrap', py: 1.5,
                    borderRight: '1px solid rgba(255,255,255,0.12)',
                    '&:last-child': { borderRight: 'none' },
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {reclamations.length > 0 ? (
              reclamations.map((rec, index) => (
                <TableRow
                  key={rec.id}
                  sx={{
                    bgcolor: index % 2 === 0 ? '#f4f7fb' : '#fff',
                    '&:hover': { bgcolor: '#e8f0fe' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  {/* Client */}
                  <TableCell sx={{
                    fontSize: '0.81rem', fontWeight: 600, color: NAVY,
                    borderRight: '1px solid #e0e7ef', whiteSpace: 'nowrap',
                  }}>
                    {rec.client?.name || 'Client inconnu'}
                  </TableCell>

                  {/* Type */}
                  <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                    <TypeChip label={rec.type} />
                  </TableCell>

                  {/* Typologie */}
                  <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                    {rec.typologie
                      ? <TypologieChip label={rec.typologie} />
                      : <Typography sx={{ color: '#546e7a', fontSize: '0.80rem' }}>Non spécifiée</Typography>}
                  </TableCell>

                  {/* Conformité */}
                  <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                    <ConformiteChip value={rec.conformite} />
                  </TableCell>

                  {/* Statut */}
                  <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                    <StatusBadge status={rec.status as any} />
                  </TableCell>

                  {/* Gravité */}
                  <TableCell sx={{ borderRight: '1px solid #e0e7ef' }}>
                    <PriorityBadge severity={rec.severity as any} />
                  </TableCell>

                  {/* Assigné à */}
                  <TableCell sx={{
                    fontSize: '0.81rem', color: '#546e7a',
                    borderRight: '1px solid #e0e7ef', whiteSpace: 'nowrap',
                  }}>
                    {rec.assignedTo?.fullName || (
                      <Typography component="span" sx={{ color: '#cfd8dc', fontSize: '0.80rem' }}>
                        Non assigné
                      </Typography>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell sx={{
                    fontSize: '0.81rem', color: '#546e7a',
                    borderRight: '1px solid #e0e7ef', whiteSpace: 'nowrap',
                  }}>
                    {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {canUpdateConformite && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit sx={{ fontSize: 13 }} />}
                        onClick={() => handleEditConformite(rec)}
                        disabled={conformiteMutation.isLoading}
                        sx={{
                          fontSize: '0.72rem', textTransform: 'none', fontWeight: 600,
                          borderColor: NAVY, color: NAVY,
                          px: 1.5, py: 0.4, whiteSpace: 'nowrap',
                          '&:hover': { bgcolor: NAVY, color: '#fff' },
                        }}
                      >
                        Conformité
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8, bgcolor: '#f4f7fb' }}>
                  <Category sx={{ color: '#cfd8dc', fontSize: 44, mb: 1.5, display: 'block', mx: 'auto' }} />
                  <Typography variant="body1"
                    sx={{ fontWeight: 600, color: '#546e7a', mb: 0.5 }}>
                    Aucune réclamation trouvée
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Les réclamations apparaîtront ici une fois créées
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Edit Conformité Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, reclamation: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#f4f7fb',
            borderBottom: `1px solid ${BORDER}`,
            py: 2, px: 3,
            display: 'flex', alignItems: 'center', gap: 1.2,
          }}
        >
          <Box sx={{
            width: 30, height: 30, borderRadius: '50%',
            bgcolor: 'rgba(30,58,95,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Edit sx={{ color: NAVY, fontSize: 15 }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
            Modifier la Conformité
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Alert
            severity="info"
            sx={{
              mb: 2.5, mt: 1, borderRadius: 1.5,
              bgcolor: '#e3f2fd', border: '1px solid #90caf9',
              borderLeft: '4px solid #0d47a1',
              color: '#0d47a1',
              '& .MuiAlert-icon': { color: '#0d47a1' },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Seuls les gestionnaires, chefs d'équipe et super admins peuvent modifier la conformité.
            </Typography>
          </Alert>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: NAVY, '&.Mui-focused': { color: NAVY } }}>
              Conformité
            </InputLabel>
            <Select
              value={conformiteValue}
              onChange={(e) => setConformiteValue(e.target.value)}
              label="Conformité"
              sx={{
                borderRadius: 1.5,
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NAVY },
              }}
            >
              <MenuItem value="">Non définie</MenuItem>
              <MenuItem value="Fondé">
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle sx={{ color: '#1b6b3a', fontSize: 16 }} />
                  Fondé
                </Box>
              </MenuItem>
              <MenuItem value="Non fondé">
                <Box display="flex" alignItems="center" gap={1}>
                  <Cancel sx={{ color: '#b71c1c', fontSize: 16 }} />
                  Non fondé
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3, py: 2,
            bgcolor: '#f4f7fb',
            borderTop: `1px solid ${BORDER}`,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setEditDialog({ open: false, reclamation: null })}
            variant="outlined"
            size="small"
            sx={{
              textTransform: 'none', fontWeight: 600,
              borderColor: '#cfd8dc', color: '#546e7a',
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveConformite}
            variant="contained"
            size="small"
            disabled={conformiteMutation.isLoading || !conformiteValue}
            sx={{
              textTransform: 'none', fontWeight: 700,
              bgcolor: NAVY, px: 3,
              '&:hover': { bgcolor: '#2c5282' },
            }}
          >
            {conformiteMutation.isLoading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={14} sx={{ color: '#fff' }} />
                Enregistrement…
              </Box>
            ) : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TypologieConformiteTab;