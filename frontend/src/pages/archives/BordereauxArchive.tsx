// src/components/finance/BordereauxArchive.tsx
import React, { useEffect, useState } from 'react';
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Chip, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Card, CardContent,
  TablePagination
} from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import SearchIcon from '@mui/icons-material/Search';
import RestoreIcon from '@mui/icons-material/Restore';
import LockIcon from '@mui/icons-material/Lock';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BusinessIcon from '@mui/icons-material/Business';
import LabelIcon from '@mui/icons-material/Label';
import NumbersIcon from '@mui/icons-material/Numbers';

// ─── Shared design tokens (mirrors Suivi & Statut design language) ────────────
const HEAD_CELL_SX = {
  backgroundColor: '#1e3a5f !important',
  color: '#ffffff !important',
  fontWeight: 700,
  fontSize: '0.70rem',
  letterSpacing: 0.4,
  py: 1.25,
  px: 1.2,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 0 },
} as const;

const BODY_CELL_SX = {
  fontSize: '0.81rem',
  py: 0.9,
  px: 1.2,
  borderRight: '1px solid #e0e7ef',
  '&:last-child': { borderRight: 0 },
  verticalAlign: 'middle',
} as const;

const PANEL_SX = {
  p: 2,
  mb: 3,
  bgcolor: '#f0f4ff !important',
  border: '1px solid #d0dff5',
  borderRadius: 2,
} as const;

const CARD_SX = {
  mb: 3,
  border: '1px solid rgba(0,0,0,0.10)',
  borderRadius: 2,
} as const;

const SECTION_HEADER_SX = {
  borderBottom: '2px solid #e8edf5',
  pb: 1.5,
  mb: 0,
} as const;

const TABLE_CONTAINER_SX = {
  borderRadius: 1.5,
  border: '1px solid #dde3ef',
  overflow: 'auto',
  '&::-webkit-scrollbar': { height: 6, width: 6 },
  '&::-webkit-scrollbar-track': { bgcolor: '#f0f4ff' },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#90a4be', borderRadius: 3 },
} as const;

const FOOTER_BAR_SX = {
  mt: 1.5,
  display: 'flex',
  justifyContent: 'flex-end',
  bgcolor: '#f4f7fb !important',
  borderRadius: 1.5,
  border: '1px solid #e0e7ef',
} as const;

const STAT_CARD_SX = (accentColor: string) => ({
  border: '1px solid rgba(0,0,0,0.10)',
  borderRadius: 2,
  borderTop: `4px solid ${accentColor} !important`,
} as const);

interface Client {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  bordereauId: string;
}

interface BulletinSoin {
  id: string;
  numBs: string;
  bordereauId: string;
}

interface ArchivedBordereau {
  id: string;
  reference: string;
  clientId: string;
  dateReception: string;
  statut: string;
  nombreBS: number;
  client?: Client;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  BulletinSoin?: BulletinSoin[];
  _count?: {
    documents?: number;
    BulletinSoin?: number;
  };
}

const BordereauxArchive: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [archived, setArchived] = useState<ArchivedBordereau[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadArchived = async () => {
    setLoading(true);
    try {
      const { data } = await LocalAPI.get('/bordereaux', {
        params: { 
          archived: true, 
          pageSize: 1000,
          withVirement: false
        }
      });
      
      // Fetch document counts for each bordereau
      const bordereaux = Array.isArray(data) ? data : (data.items || data.bordereaux || []);
      const enrichedBordereaux = await Promise.all(
        bordereaux.map(async (b: ArchivedBordereau) => {
          const [docsRes, bsRes] = await Promise.all([
            LocalAPI.get(`/bordereaux/${b.id}/documents`),
            LocalAPI.get(`/bordereaux/${b.id}/bs`)
          ]);
          return {
            ...b,
            documents: Array.isArray(docsRes.data) ? docsRes.data : [],
            BulletinSoin: Array.isArray(bsRes.data) ? bsRes.data : []
          };
        })
      );
      
      setArchived(enrichedBordereaux);
    } catch (error) {
      console.error('Error loading archived bordereaux:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchived();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm('Restaurer ce bordereau ?')) return;
    
    setRestoring(id);
    try {
      await LocalAPI.patch(`/bordereaux/${id}/restore`);
      await loadArchived();
      alert('✅ Bordereau restauré avec succès');
    } catch (error) {
      alert('❌ Erreur lors de la restauration');
    } finally {
      setRestoring(null);
    }
  };

  const filtered = archived.filter(b => 
    b.reference.toLowerCase().includes(search.toLowerCase()) ||
    b.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Reset to first page whenever the search narrows/widens the result set
  useEffect(() => {
    setPage(0);
  }, [search]);

  const paginatedRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (user?.role !== 'SUPER_ADMIN') return null;

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff !important', minHeight: '100vh' }}>

      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ bgcolor: '#1e3a5f !important', p: 1.5, borderRadius: 2, mr: 2, display: 'flex' }}>
            <ArchiveIcon sx={{ fontSize: 34, color: '#ffffff !important' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a5f !important', letterSpacing: -0.5 }}>
              Archives des Bordereaux
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Gestion et restauration des bordereaux archivés
            </Typography>
          </Box>
        </Box>
        <Chip 
          icon={<LockIcon />} 
          label="Super Admin" 
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: '#1e3a5f !important',
            color: '#ffffff !important',
            '& .MuiChip-icon': { color: '#ffffff !important' },
          }}
        />
      </Box>

      {/* ── Stat Cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: 3 }}>
        <Card elevation={0} sx={STAT_CARD_SX('#1e3a5f')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Archivés
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e3a5f !important', mt: 0.5 }}>
                  {archived.length}
                </Typography>
              </Box>
              <AssessmentIcon sx={{ fontSize: 56, color: '#1e3a5f', opacity: 0.18 }} />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={STAT_CARD_SX('#1b5e20')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Résultats
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#1b5e20 !important', mt: 0.5 }}>
                  {filtered.length}
                </Typography>
              </Box>
              <FilterListIcon sx={{ fontSize: 56, color: '#1b5e20', opacity: 0.18 }} />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={STAT_CARD_SX('#546e7a')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#546e7a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Dernier Archivage
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#37474f !important', mt: 0.5 }}>
                  {archived.length > 0 && archived[0].updatedAt ? new Date(archived[0].updatedAt).toLocaleDateString('fr-FR') : 'N/A'}
                </Typography>
              </Box>
              <CalendarTodayIcon sx={{ fontSize: 56, color: '#546e7a', opacity: 0.18 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* ── Search Panel ── */}
      <Paper elevation={0} sx={PANEL_SX}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}
        >
          Recherche
        </Typography>
        <TextField
          fullWidth
          placeholder="Rechercher par référence ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ bgcolor: '#ffffff !important', borderRadius: 1 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: '#78909c' }} />
          }}
        />
      </Paper>

      {/* ── Archive Table ── */}
      <Card elevation={0} sx={CARD_SX}>
        <CardContent>
          <Box sx={SECTION_HEADER_SX}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
              Bordereaux Archivés
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Affichage de {filtered.length} bordereau(x) — Page {page + 1}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
              <CircularProgress sx={{ color: '#1e3a5f' }} />
              <Typography sx={{ ml: 2, color: '#546e7a' }}>Chargement...</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box
              sx={{
                mt: 2, p: 6, textAlign: 'center',
                bgcolor: '#f8faff !important', borderRadius: 2,
                border: '1px dashed #c5d4e8',
              }}
            >
              <ArchiveIcon sx={{ fontSize: 64, color: '#c5d4e8', mb: 1.5 }} />
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                Aucun bordereau archivé
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Les bordereaux archivés apparaîtront ici
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ mt: 2, ...TABLE_CONTAINER_SX }}>
                <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><LabelIcon sx={{ mr: 1, fontSize: 16 }} />Référence</Box>
                      </TableCell>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><BusinessIcon sx={{ mr: 1, fontSize: 16 }} />Client</Box>
                      </TableCell>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><CalendarTodayIcon sx={{ mr: 1, fontSize: 16 }} />Date Réception</Box>
                      </TableCell>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><LabelIcon sx={{ mr: 1, fontSize: 16 }} />Statut</Box>
                      </TableCell>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><NumbersIcon sx={{ mr: 1, fontSize: 16 }} />Total Documents</Box>
                      </TableCell>
                      <TableCell sx={HEAD_CELL_SX}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><ArchiveIcon sx={{ mr: 1, fontSize: 16 }} />Date Archivage</Box>
                      </TableCell>
                      <TableCell sx={{ ...HEAD_CELL_SX, textAlign: 'right' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map((bordereau, index) => (
                      <TableRow
                        key={bordereau.id}
                        sx={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                          '&:hover': { backgroundColor: '#e8f0fe !important' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={BODY_CELL_SX}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              label={`#${page * rowsPerPage + index + 1}`}
                              size="small"
                              sx={{ mr: 1, bgcolor: '#1e3a5f !important', color: '#ffffff !important', fontWeight: 700 }}
                            />
                            <Typography sx={{ fontWeight: 700, color: '#1e3a5f' }}>{bordereau.reference}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={BODY_CELL_SX}>
                          <Typography sx={{ color: '#37474f' }}>{bordereau.client?.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell sx={BODY_CELL_SX}>
                          <Chip
                            label={bordereau.statut}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: '#1e3a5f', color: '#1e3a5f', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell sx={BODY_CELL_SX}>
                          <Typography sx={{ fontWeight: 700, color: '#1b5e20' }}>
                            {(bordereau.documents?.length || 0) + (bordereau.BulletinSoin?.length || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, whiteSpace: 'nowrap', color: '#546e7a' }}>
                          {new Date(bordereau.updatedAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell sx={{ ...BODY_CELL_SX, textAlign: 'right' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={restoring === bordereau.id ? <CircularProgress size={14} /> : <RestoreIcon sx={{ fontSize: '0.9rem !important' }} />}
                            onClick={() => handleRestore(bordereau.id)}
                            disabled={restoring === bordereau.id}
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              py: 0.4, px: 1.2,
                              borderColor: '#1b5e20 !important',
                              color: '#1b5e20 !important',
                              '&:hover': { bgcolor: '#1b5e20 !important', color: '#ffffff !important' },
                            }}
                          >
                            {restoring === bordereau.id ? 'Restauration...' : 'Restaurer'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={FOOTER_BAR_SX}>
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage="Lignes par page:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BordereauxArchive;