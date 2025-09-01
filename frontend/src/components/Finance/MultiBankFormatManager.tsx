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
  IconButton
} from '@mui/material';
import {
  Add,
  Edit,
  Delete
} from '@mui/icons-material';

const MultiBankFormatManager: React.FC = () => {
  const [formats, setFormats] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { getDonneurs } = await import('../../services/financeService');
      const donneurs = await getDonneurs();
      
      const formatsData = donneurs.map((donneur: any) => ({
        id: donneur.id,
        name: donneur.name,
        bankCode: donneur.bank,
        country: 'TN',
        formatType: donneur.txtFormat || 'SWIFT',
        active: donneur.status === 'active',
        fields: [
          { name: 'reference', type: 'string', required: true, maxLength: 35, description: 'Référence' },
          { name: 'amount', type: 'amount', required: true, description: 'Montant' },
          { name: 'rib', type: 'string', required: true, maxLength: 20, description: 'RIB' }
        ],
        validation: {
          ibanValidation: true,
          bicValidation: false,
          amountValidation: true,
          dateValidation: true
        }
      }));
      
      setFormats(formatsData);
      
      const activeCount = formatsData.filter((f: any) => f.active).length;
      setStatistics({
        totalFormats: formatsData.length,
        activeFormats: activeCount,
        byType: { 'SWIFT': formatsData.length },
        byCountry: { 'TN': formatsData.length }
      });
    } catch (error) {
      console.error('Failed to load bank formats:', error);
      setFormats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormat = async () => {
    try {
      const { createDonneur } = await import('../../services/financeService');
      await createDonneur({ name: 'Nouveau Format', bank: 'Banque', rib: '12345678901234567890' });
      await loadData();
      alert('Format créé avec succès!');
    } catch (error) {
      console.error('Failed to create format:', error);
      alert('Erreur lors de la création du format');
    }
  };

  const handleDeleteFormat = async (formatId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce format ?')) {
      return;
    }

    try {
      const { deleteDonneur } = await import('../../services/financeService');
      await deleteDonneur(formatId);
      await loadData();
      alert('Format supprimé avec succès!');
    } catch (error) {
      console.error('Failed to delete format:', error);
      alert('Erreur lors de la suppression du format');
    }
  };

  const getFormatTypeColor = (type: string) => {
    return type === 'SWIFT' ? 'secondary' : 'default';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestion des Formats Bancaires Multi-Banques
      </Typography>

      {/* Statistics */}
      {statistics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Formats
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.totalFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Formats Actifs
                </Typography>
                <Typography variant="h4" component="div">
                  {statistics.activeFormats}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Types Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byType).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Pays Supportés
                </Typography>
                <Typography variant="h4" component="div">
                  {Object.keys(statistics.byCountry).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bank Formats Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Formats Bancaires ({formats.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateFormat}
            >
              Nouveau Format
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Format</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Champs</TableCell>
                  <TableCell>Validation</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formats.map((format) => (
                  <TableRow key={format.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {format.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.bankCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.formatType}
                        color={getFormatTypeColor(format.formatType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{format.country}</TableCell>
                    <TableCell>{format.fields.length} champs</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {format.validation.ibanValidation && (
                          <Chip label="IBAN" size="small" variant="outlined" />
                        )}
                        {format.validation.bicValidation && (
                          <Chip label="BIC" size="small" variant="outlined" />
                        )}
                        {format.validation.amountValidation && (
                          <Chip label="Amount" size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={format.active ? 'Actif' : 'Inactif'}
                        color={format.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small"
                          title="Modifier"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteFormat(format.id)}
                          title="Supprimer"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>


    </Box>
  );
};

export default MultiBankFormatManager;