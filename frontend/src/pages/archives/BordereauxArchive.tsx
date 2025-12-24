import React, { useEffect, useState } from 'react';
import { LocalAPI } from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
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

  if (user?.role !== 'SUPER_ADMIN') return null;

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ bgcolor: 'primary.main', p: 2, borderRadius: 2, mr: 2 }}>
              <ArchiveIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Archives des Bordereaux
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestion et restauration des bordereaux archivés
              </Typography>
            </Box>
          </Box>
          <Chip 
            icon={<LockIcon />} 
            label="Super Admin" 
            color="error" 
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight="bold" gutterBottom>
                TOTAL ARCHIVÉS
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {archived.length}
              </Typography>
            </Box>
            <AssessmentIcon sx={{ fontSize: 60, color: 'primary.light', opacity: 0.3 }} />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'success.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight="bold" gutterBottom>
                RÉSULTATS
              </Typography>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {filtered.length}
              </Typography>
            </Box>
            <FilterListIcon sx={{ fontSize: 60, color: 'success.light', opacity: 0.3 }} />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'secondary.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight="bold" gutterBottom>
                DERNIER ARCHIVAGE
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {archived.length > 0 && archived[0].updatedAt ? new Date(archived[0].updatedAt).toLocaleDateString('fr-FR') : 'N/A'}
              </Typography>
            </Box>
            <CalendarTodayIcon sx={{ fontSize: 60, color: 'secondary.light', opacity: 0.3 }} />
          </Box>
        </Paper>
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par référence ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Paper>

      <Paper elevation={2}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Chargement...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 8 }}>
            <ArchiveIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Aucun bordereau archivé
            </Typography>
            <Typography color="text.secondary">
              Les bordereaux archivés apparaîtront ici
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><LabelIcon sx={{ mr: 1, fontSize: 18 }} />Référence</Box></TableCell>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><BusinessIcon sx={{ mr: 1, fontSize: 18 }} />Client</Box></TableCell>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><CalendarTodayIcon sx={{ mr: 1, fontSize: 18 }} />Date Réception</Box></TableCell>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><LabelIcon sx={{ mr: 1, fontSize: 18 }} />Statut</Box></TableCell>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><NumbersIcon sx={{ mr: 1, fontSize: 18 }} />Total Documents</Box></TableCell>
                  <TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><ArchiveIcon sx={{ mr: 1, fontSize: 18 }} />Date Archivage</Box></TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((bordereau, index) => (
                  <TableRow key={bordereau.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip label={`#${index + 1}`} size="small" color="primary" sx={{ mr: 1 }} />
                        <Typography fontWeight="bold">{bordereau.reference}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography>{bordereau.client?.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={bordereau.statut} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary.main">
                        {(bordereau.documents?.length || 0) + (bordereau.BulletinSoin?.length || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{new Date(bordereau.updatedAt).toLocaleDateString('fr-FR')}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={restoring === bordereau.id ? <CircularProgress size={16} /> : <RestoreIcon />}
                        onClick={() => handleRestore(bordereau.id)}
                        disabled={restoring === bordereau.id}
                      >
                        {restoring === bordereau.id ? 'Restauration...' : 'Restaurer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default BordereauxArchive;
