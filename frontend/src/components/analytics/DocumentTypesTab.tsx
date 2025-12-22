import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LocalAPI } from '../../services/axios';

interface Props {
  filters: any;
  dateRange: any;
}

const DocumentTypesTab: React.FC<Props> = ({ filters, dateRange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDocumentTypesData = async () => {
    try {
      setLoading(true);
      
      const [typesResponse, statusResponse, slaResponse] = await Promise.all([
        LocalAPI.get('/analytics/documents/types-breakdown', { params: dateRange }),
        LocalAPI.get('/analytics/documents/status-by-type', { params: dateRange }),
        LocalAPI.get('/analytics/documents/sla-compliance-by-type', { params: dateRange })
      ]);

      setData({
        typesBreakdown: typesResponse.data,
        statusByType: statusResponse.data,
        slaCompliance: slaResponse.data
      });
    } catch (error) {
      console.error('Failed to load document types data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentTypesData();
  }, [filters, dateRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des données par type de document...</Typography>
      </Box>
    );
  }

  if (!data) return <Typography>Aucune donnée disponible</Typography>;

  const documentTypes = [
    { 
      key: 'BULLETIN_SOIN', 
      label: 'Bulletins de Soins', 
      icon: '🏥', 
      color: '#3b82f6',
      slaApplicable: true
    },
    { 
      key: 'COMPLEMENT_INFORMATION', 
      label: 'Compléments Information', 
      icon: '📋', 
      color: '#10b981',
      slaApplicable: true
    },
    { 
      key: 'ADHESION', 
      label: 'Adhésions', 
      icon: '👥', 
      color: '#f59e0b',
      slaApplicable: true
    },
    { 
      key: 'RECLAMATION', 
      label: 'Réclamations', 
      icon: '⚠️', 
      color: '#ef4444',
      slaApplicable: true
    },
    { 
      key: 'CONTRAT_AVENANT', 
      label: 'Contrats/Avenants', 
      icon: '📄', 
      color: '#8b5cf6',
      slaApplicable: false
    },
    { 
      key: 'DEMANDE_RESILIATION', 
      label: 'Demandes Résiliation', 
      icon: '❌', 
      color: '#f97316',
      slaApplicable: false
    },
    { 
      key: 'CONVENTION_TIERS_PAYANT', 
      label: 'Conventions Tiers Payant', 
      icon: '🤝', 
      color: '#06b6d4',
      slaApplicable: false
    }
  ];

  // Prepare data for charts
  const pieData = documentTypes.map(type => {
    const typeData = data.typesBreakdown?.[type.key];
    const value = typeof typeData === 'object' ? typeData.total : (typeData || 0);
    return {
      name: type.label,
      value,
      color: type.color,
      icon: type.icon,
      slaApplicable: type.slaApplicable
    };
  }).filter(item => item.value > 0);

  const barData = documentTypes.map(type => {
    const typeData = data.typesBreakdown?.[type.key];
    const total = typeof typeData === 'object' ? typeData.total : (typeData || 0);
    const traites = typeof typeData === 'object' ? typeData.traite : (data.statusByType?.[type.key]?.TRAITE || 0);
    const enCours = typeof typeData === 'object' ? typeData.enCours : (data.statusByType?.[type.key]?.EN_COURS || 0);
    const rejetes = typeof typeData === 'object' ? typeData.rejete : (data.statusByType?.[type.key]?.REJETE || 0);
    return {
      name: type.label.split(' ')[0],
      total,
      traites,
      enCours,
      rejetes,
      slaApplicable: type.slaApplicable
    };
  }).filter(item => item.total > 0);

  const slaApplicableTotal = pieData.filter(item => item.slaApplicable).reduce((sum, item) => sum + item.value, 0);
  const nonSlaTotal = pieData.filter(item => !item.slaApplicable).reduce((sum, item) => sum + item.value, 0);

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ fontSize: '2rem' }}>📊</Box>
                  <Box>
                    <Typography variant="h4">{pieData.reduce((sum, item) => sum + item.value, 0)}</Typography>
                    <Typography color="textSecondary">Total Documents</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ fontSize: '2rem' }}>⏱️</Box>
                  <Box>
                    <Typography variant="h4">{slaApplicableTotal}</Typography>
                    <Typography color="textSecondary">Avec SLA</Typography>
                    <Chip size="small" label="SLA Applicable" color="info" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ fontSize: '2rem' }}>🚫</Box>
                  <Box>
                    <Typography variant="h4">{nonSlaTotal}</Typography>
                    <Typography color="textSecondary">Sans SLA</Typography>
                    <Chip size="small" label="Pas de SLA" color="default" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ fontSize: '2rem' }}>📈</Box>
                  <Box>
                    <Typography variant="h4">{documentTypes.length}</Typography>
                    <Typography color="textSecondary">Types Supportés</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Document Types Grid */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Répartition par Type de Document</Typography>
          <Grid container spacing={2}>
            {documentTypes.map((type) => {
              const typeData = data.typesBreakdown?.[type.key];
              const count = typeof typeData === 'object' ? typeData.total : (typeData || 0);
              const statusData = typeof typeData === 'object' ? typeData : (data.statusByType?.[type.key] || {});
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={type.key}>
                  <Card sx={{ 
                    height: '100%',
                    border: type.slaApplicable ? '2px solid #3b82f6' : '2px solid #6b7280',
                    position: 'relative'
                  }}>
                    <CardContent>
                      {/* SLA Indicator */}
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        fontSize: '0.7rem',
                        backgroundColor: type.slaApplicable ? '#3b82f6' : '#6b7280',
                        color: 'white',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        {type.slaApplicable ? 'SLA' : 'No SLA'}
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Box sx={{ fontSize: '1.5rem' }}>{type.icon}</Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {type.label}
                        </Typography>
                      </Box>
                      
                      <Typography variant="h4" sx={{ mb: 1, color: type.color }}>
                        {count}
                      </Typography>
                      
                      {count > 0 && (
                        <Box>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption">Traités:</Typography>
                            <Typography variant="caption" color="success.main">
                              {statusData.TRAITE || 0}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption">En cours:</Typography>
                            <Typography variant="caption" color="primary.main">
                              {statusData.EN_COURS || 0}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">Rejetés:</Typography>
                            <Typography variant="caption" color="error.main">
                              {statusData.REJETE || 0}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Grid>

      {/* Charts */}
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Distribution des Types</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value, entry: any) => {
                  const percent = ((entry.payload.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0);
                  return `${value} ${percent}%`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Statuts par Type</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="traites" stackId="a" fill="#10b981" name="Traités" />
              <Bar dataKey="enCours" stackId="a" fill="#3b82f6" name="En cours" />
              <Bar dataKey="rejetes" stackId="a" fill="#ef4444" name="Rejetés" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* SLA Compliance Section */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Conformité SLA par Type</Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ⚠️ Note: Les SLA ne s'appliquent pas aux Contrats/Avenants, Demandes de Résiliation et Conventions de Tiers Payant
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {documentTypes.filter(type => type.slaApplicable).map((type) => {
              const slaData = data.slaCompliance?.[type.key] || {};
              const total = slaData.total || 0;
              const compliant = slaData.compliant || 0;
              const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
              
              return (
                <Grid item xs={12} sm={6} md={3} key={type.key}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Box sx={{ fontSize: '1.2rem' }}>{type.icon}</Box>
                        <Typography variant="subtitle2">
                          {type.label.split(' ')[0]}
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ color: rate >= 80 ? 'success.main' : rate >= 60 ? 'warning.main' : 'error.main' }}>
                        {rate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {compliant}/{total} conformes
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DocumentTypesTab;