import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Assignment, Send, Add } from '@mui/icons-material';

// ── Design tokens ────────────────────────────────────────────────────────────
const NAV_BG      = '#1e3a5f';
const NAV_TEXT    = '#ffffff';
const ACCENT_BLUE = '#2196f3';
const ROW_ODD     = '#f4f7fb';
const ROW_EVEN    = '#ffffff';
const ROW_HOV     = '#e8f0fe';
const BORDER      = '#e0e7ef';

// ── API helpers ──────────────────────────────────────────────────────────────
const fetchBOCorbeille = async () => {
  const { data } = await LocalAPI.get('/workflow/corbeille/bo');
  return data;
};

const processBordereauForScan = async (bordereauId: string) => {
  const { data } = await LocalAPI.post(`/workflow/bo/process-for-scan/${bordereauId}`);
  return data;
};

// ── Props ────────────────────────────────────────────────────────────────────
interface BOCorbeilleProps {
  onOpenEntryDialog?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export const BOCorbeille: React.FC<BOCorbeilleProps> = ({ onOpenEntryDialog }) => {
  const queryClient = useQueryClient();

  const { data: corbeilleData, isLoading, error, refetch } = useQuery(
    ['bo-corbeille'],
    fetchBOCorbeille,
    { refetchInterval: 30000, retry: 3 }
  );

  const processMutation = useMutation(processBordereauForScan, {
    onSuccess: (data) => {
      console.log('Bordereau envoyé au SCAN avec succès:', data);
      queryClient.invalidateQueries(['bo-corbeille']);
    },
    onError: (err) => {
      console.error('Erreur lors du traitement:', err);
    },
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: NAV_BG }} />
        <Typography variant="body2" sx={{ color: '#546e7a' }}>
          Chargement de la corbeille…
        </Typography>
      </Box>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ borderRadius: 2 }}
        action={
          <Button size="small" onClick={() => refetch()} sx={{ color: '#b71c1c', fontWeight: 600 }}>
            Réessayer
          </Button>
        }
      >
        <Typography variant="body2" fontWeight={600}>Impossible de charger la corbeille.</Typography>
      </Alert>
    );
  }

  const { items = [], stats } = corbeilleData || {};

  const handleProcessForScan = (bordereauId: string) => {
    processMutation.mutate(bordereauId);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Section header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ color: NAV_BG, fontSize: { xs: '1.1rem', sm: '1.35rem' } }}
          >
            Corbeille Bureau d'Ordre
          </Typography>
          <Typography variant="body2" sx={{ color: '#546e7a', mt: 0.25 }}>
            Bordereaux reçus en attente de numérisation
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onOpenEntryDialog}
          sx={{
            bgcolor: NAV_BG,
            fontWeight: 700,
            fontSize: '0.82rem',
            px: 2.5,
            '&:hover': { bgcolor: '#16304f' },
            minWidth: { xs: 'auto', sm: 160 },
          }}
        >
          Nouvelle Entrée
        </Button>
      </Box>

      {/* Stat card */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${ACCENT_BLUE}`,
              transition: 'box-shadow .2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
            }}
          >
            <CardContent sx={{ p: '20px !important' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#546e7a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                    }}
                  >
                    Documents en attente
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ color: NAV_BG, mt: 0.5, lineHeight: 1 }}
                  >
                    {stats?.pending ?? 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: '50%',
                    bgcolor: `${ACCENT_BLUE}17`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: ACCENT_BLUE,
                  }}
                >
                  <Assignment sx={{ fontSize: 22 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info alert */}
      <Alert
        severity="info"
        icon={false}
        sx={{
          mb: 2.5,
          borderRadius: 2,
          bgcolor: '#e3f2fd',
          border: '1px solid #90caf9',
          color: '#0d47a1',
          fontSize: '0.82rem',
        }}
      >
        <strong>Instructions :</strong> Traitez les bordereaux reçus physiquement en les
        envoyant au service SCAN pour numérisation.
      </Alert>

      {/* Table or empty state */}
      {items.length > 0 ? (
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
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: NAV_BG }}>
                {['Référence', 'Client', 'Nombre BS', 'Date Réception', 'Statut', 'Actions'].map(
                  (col) => (
                    <TableCell
                      key={col}
                      sx={{
                        color: NAV_TEXT,
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        py: 1.25,
                        whiteSpace: 'nowrap',
                        borderRight:
                          col !== 'Actions' ? '1px solid rgba(255,255,255,0.10)' : 'none',
                      }}
                    >
                      {col}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item: any, idx: number) => (
                <TableRow
                  key={item.id}
                  sx={{
                    bgcolor: idx % 2 === 0 ? ROW_EVEN : ROW_ODD,
                    '&:hover': { bgcolor: ROW_HOV },
                    transition: 'background-color .15s',
                  }}
                >
                  <TableCell
                    sx={{
                      fontSize: '0.81rem', fontWeight: 600,
                      color: NAV_BG, borderRight: `1px solid ${BORDER}`,
                    }}
                  >
                    {item.reference}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.81rem', borderRight: `1px solid ${BORDER}` }}>
                    {item.clientName}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: '0.81rem', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}
                  >
                    {item.subject}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: '0.81rem', whiteSpace: 'nowrap', borderRight: `1px solid ${BORDER}` }}
                  >
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell sx={{ borderRight: `1px solid ${BORDER}` }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        px: 1.25, py: 0.25,
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        bgcolor: '#fff8e1',
                        color: '#e65100',
                        border: '1px solid #ffcc80',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      En attente
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Send sx={{ fontSize: 14 }} />}
                      onClick={() => handleProcessForScan(item.id)}
                      disabled={processMutation.isLoading}
                      sx={{
                        bgcolor: '#1b6b3a',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        px: 1.5,
                        '&:hover': { bgcolor: '#145530' },
                        '&:disabled': { bgcolor: '#a5d6a7', color: '#fff' },
                      }}
                    >
                      Envoyer au SCAN
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 56, height: 56, borderRadius: '50%',
              bgcolor: '#e3f2fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2, color: ACCENT_BLUE,
            }}
          >
            <Assignment sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: NAV_BG, mb: 0.5 }}>
            Aucun document en attente
          </Typography>
          <Typography variant="body2" sx={{ color: '#546e7a' }}>
            Tous les bordereaux ont été traités et envoyés au SCAN.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default BOCorbeille;