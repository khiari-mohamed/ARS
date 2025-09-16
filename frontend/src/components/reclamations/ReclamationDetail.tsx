import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

const fetchReclamationDetail = async (id: string) => {
  const { data } = await LocalAPI.get(`/reclamations/${id}`);
  return data;
};

export const ReclamationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: reclamation, isLoading, error } = useQuery(
    ['reclamation-detail', id],
    () => fetchReclamationDetail(id!),
    { enabled: !!id }
  );

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur lors du chargement</div>;
  if (!reclamation) return <div>Réclamation non trouvée</div>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Retour
        </Button>
        <Typography variant="h4">
          Détail de la réclamation
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Référence
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    REC-{reclamation.id?.substring(0, 8)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Statut
                  </Typography>
                  <StatusBadge status={reclamation.status} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priorité
                  </Typography>
                  <PriorityBadge severity={reclamation.severity || 'MOYENNE'} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Type
                  </Typography>
                  <Typography variant="body1">
                    {reclamation.type || 'Non spécifié'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Date de création
                  </Typography>
                  <Typography variant="body1">
                    {new Date(reclamation.createdAt).toLocaleDateString('fr-FR')}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Assigné à
                  </Typography>
                  <Typography variant="body1">
                    {reclamation.assignedTo?.fullName || 'Non assigné'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {reclamation.description || 'Aucune description disponible'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Client
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" fontWeight="bold">
                {reclamation.client?.name || 'Client non spécifié'}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Département
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {reclamation.department || 'Non spécifié'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReclamationDetail;