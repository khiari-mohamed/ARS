import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TablePagination
} from '@mui/material';
import {
  Description,
  Assignment,
  Warning,
  CheckCircle,
  Schedule,
  Error
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface DocumentTypeStats {
  type: string;
  displayName: string;
  total: number;
  aScanner: number;
  enCoursScan: number;
  scanFinalise: number;
  enCoursTraitement: number;
  traite: number;
  regle: number;
  slaApplicable: boolean;
  avgProcessingTime: number;
  slaBreaches: number;
}

interface AssignmentStats {
  documentId: string;
  documentType: string;
  reference: string;
  assignedTo: string;
  chefEquipe: string;
  status: string;
  assignedAt: Date;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE';
}

const DocumentAnalyticsDashboard: React.FC = () => {
  const [documentStats, setDocumentStats] = useState<DocumentTypeStats[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [hierarchyIssues, setHierarchyIssues] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    gestionnaire: '',
    chefEquipe: '',
    slaStatus: ''
  });
  const [faultyDataCount, setFaultyDataCount] = useState(0);
  const [gestionnaires, setGestionnaires] = useState<any[]>([]);
  const [chefs, setChefs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    loadDocumentAnalytics();
    loadUserLists();
  }, [selectedType]);

  const loadUserLists = async () => {
    try {
      const response = await LocalAPI.get('/super-admin/team-workload');
      const users = response.data || [];
      
      setGestionnaires(users.filter((u: any) => u.role === 'GESTIONNAIRE' || u.role === 'GESTIONNAIRE_SENIOR'));
      setChefs(users.filter((u: any) => u.role === 'CHEF_EQUIPE'));
    } catch (error) {
      console.error('Failed to load user lists:', error);
    }
  };

  const loadDocumentAnalytics = async () => {
    setLoading(true);
    try {
      const [statsResponse, assignmentsResponse, hierarchyResponse] = await Promise.all([
        LocalAPI.get('/super-admin/documents/comprehensive-stats', {
          params: { documentType: selectedType !== 'ALL' ? selectedType : undefined }
        }),
        LocalAPI.get('/super-admin/document-assignments', {
          params: {
            documentType: selectedType !== 'ALL' ? selectedType : undefined,
            gestionnaire: filters.gestionnaire || undefined,
            chefEquipe: filters.chefEquipe || undefined,
            slaStatus: filters.slaStatus || undefined
          }
        }),
        LocalAPI.get('/super-admin/hierarchy/validation')
      ]);

      console.log('📊 Document Assignments:', assignmentsResponse.data);

      // Process document type statistics
      const allDocumentTypes = [
        { type: 'BULLETIN_SOIN', displayName: 'Bulletins de soins', slaApplicable: true },
        { type: 'COMPLEMENT_INFORMATION', displayName: 'Compléments d\'information', slaApplicable: true },
        { type: 'ADHESION', displayName: 'Adhésions', slaApplicable: true },
        { type: 'RECLAMATION', displayName: 'Réclamations', slaApplicable: true },
        { type: 'CONTRAT_AVENANT', displayName: 'Contrats/Avenants', slaApplicable: false },
        { type: 'DEMANDE_RESILIATION', displayName: 'Demandes de résiliation', slaApplicable: false },
        { type: 'CONVENTION_TIERS_PAYANT', displayName: 'Conventions tiers payant', slaApplicable: false }
      ];

      console.log('📊 Stats Response:', statsResponse.data);

      const processedStats = allDocumentTypes.map(docType => {
        const stats = statsResponse.data[docType.type] || {};
        console.log(`Processing ${docType.type}:`, stats);
        return {
          ...docType,
          total: stats.total || 0,
          aScanner: stats.A_SCANNER || 0,
          enCoursScan: stats.EN_COURS_SCAN || 0,
          scanFinalise: stats.SCAN_FINALISE || 0,
          enCoursTraitement: stats.EN_COURS_TRAITEMENT || 0,
          traite: stats.TRAITE || 0,
          regle: stats.REGLE || 0,
          avgProcessingTime: stats.avgProcessingTime || 0,
          slaBreaches: docType.slaApplicable ? (stats.slaBreaches || 0) : 0
        };
      });

      console.log('📊 Processed Stats:', processedStats);
      setDocumentStats(processedStats);
      setAssignmentStats(assignmentsResponse.data.assignments || []);
      setFaultyDataCount(assignmentsResponse.data.withIssues || 0);
      setHierarchyIssues(hierarchyResponse.data.issues || []);

    } catch (error: any) {
      console.error('Failed to load document analytics:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Set empty arrays when API fails
      setDocumentStats([]);
      setAssignmentStats([]);
      setHierarchyIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A_SCANNER': return 'default';
      case 'EN_COURS_SCAN': return 'info';
      case 'SCAN_FINALISE': return 'primary';
      case 'EN_COURS_TRAITEMENT': return 'warning';
      case 'TRAITE': return 'success';
      case 'REGLE': return 'success';
      default: return 'default';
    }
  };

  const getSlaStatusIcon = (status: string) => {
    switch (status) {
      case 'ON_TIME': return <CheckCircle color="success" />;
      case 'AT_RISK': return <Schedule color="warning" />;
      case 'OVERDUE': return <Error color="error" />;
      default: return <Schedule />;
    }
  };

  const calculateCompletionRate = (stats: DocumentTypeStats) => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.traite + stats.regle) / stats.total) * 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" display="flex" alignItems="center" gap={1}>
          <Description />
          Analytics Documents - Périmètre Complet ARS
        </Typography>
        <Chip 
          label="Règle SLA: Date Limite = Date Réception + Délai Contrat" 
          color="info" 
          variant="outlined"
        />
      </Box>

      {/* SLA Rules Info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Règles SLA:</strong> 🟢 À temps (&gt;24h restant) | 🟠 À risque (0-24h) | 🔴 En retard (&lt;0h)
        </Typography>
      </Alert>

      {/* Faulty Data Alert */}
      {faultyDataCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            ❌ Données défaillantes détectées
          </Typography>
          <Typography variant="body2">
            {faultyDataCount} document(s) avec gestionnaire ou chef d'équipe manquant
          </Typography>
        </Alert>
      )}

      {/* Hierarchy Issues Alert */}
      {hierarchyIssues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            ⚠️ Problèmes de hiérarchie détectés
          </Typography>
          <Typography variant="body2">
            {hierarchyIssues.length} gestionnaire(s) sans chef d'équipe assigné
          </Typography>
        </Alert>
      )}

      {/* Filter Controls */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle2" mb={2}>
          🔍 Filtres Dynamiques
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Type de document</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="Type de document"
              >
                <MenuItem value="ALL">Tous les types</MenuItem>
                <MenuItem value="BULLETIN_SOIN">Bulletins de soins</MenuItem>
                <MenuItem value="COMPLEMENT_INFORMATION">Compléments</MenuItem>
                <MenuItem value="ADHESION">Adhésions</MenuItem>
                <MenuItem value="RECLAMATION">Réclamations</MenuItem>
                <MenuItem value="CONTRAT_AVENANT">Contrats</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Gestionnaire</InputLabel>
              <Select
                value={filters.gestionnaire}
                onChange={(e) => setFilters({ ...filters, gestionnaire: e.target.value })}
                label="Gestionnaire"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="NON ASSIGNÉ">❌ Non assigné</MenuItem>
                {gestionnaires.map(g => (
                  <MenuItem key={g.id} value={g.name}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Chef d'équipe</InputLabel>
              <Select
                value={filters.chefEquipe}
                onChange={(e) => setFilters({ ...filters, chefEquipe: e.target.value })}
                label="Chef d'équipe"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="AUCUN CHEF">❌ Aucun chef</MenuItem>
                {chefs.map(c => (
                  <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Statut SLA</InputLabel>
              <Select
                value={filters.slaStatus}
                onChange={(e) => setFilters({ ...filters, slaStatus: e.target.value })}
                label="Statut SLA"
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="ON_TIME">🟢 À temps</MenuItem>
                <MenuItem value="AT_RISK">🟠 À risque</MenuItem>
                <MenuItem value="OVERDUE">🔴 En retard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box mt={2} display="flex" gap={1}>
          <Button 
            variant="contained" 
            onClick={loadDocumentAnalytics}
            size="small"
          >
            Appliquer les filtres
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              setFilters({ gestionnaire: '', chefEquipe: '', slaStatus: '' });
              setSelectedType('ALL');
            }}
            size="small"
          >
            Réinitialiser
          </Button>
        </Box>
      </Card>

      {/* Document Type Statistics - Filter by selectedType */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {documentStats
          .filter(stats => selectedType === 'ALL' || stats.type === selectedType)
          .map((stats) => (
          <Grid item xs={12} md={6} lg={4} key={stats.type}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" noWrap>
                    {stats.displayName}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {!stats.slaApplicable && (
                      <Chip label="Pas de SLA" size="small" color="default" />
                    )}
                    {stats.slaApplicable && stats.slaBreaches > 0 && (
                      <Chip label={`${stats.slaBreaches} SLA`} size="small" color="error" />
                    )}
                  </Box>
                </Box>

                <Typography variant="h4" color="primary" gutterBottom>
                  {stats.total}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Taux de completion: {calculateCompletionRate(stats)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculateCompletionRate(stats)} 
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">À scanner</Typography>
                    <Typography variant="body2">{stats.aScanner}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">En cours scan</Typography>
                    <Typography variant="body2">{stats.enCoursScan}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Scan finalisé</Typography>
                    <Typography variant="body2">{stats.scanFinalise}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">En traitement</Typography>
                    <Typography variant="body2">{stats.enCoursTraitement}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Traité</Typography>
                    <Typography variant="body2">{stats.traite}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Réglé</Typography>
                    <Typography variant="body2" color="success.main">{stats.regle}</Typography>
                  </Grid>
                </Grid>

                {stats.slaApplicable && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Temps moyen: {stats.avgProcessingTime.toFixed(1)}h
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Document-Level Assignment Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <Assignment />
            Affectations au Niveau Document
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Type Document</TableCell>
                  <TableCell>Gestionnaire</TableCell>
                  <TableCell>Chef d'Équipe</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>SLA</TableCell>
                  <TableCell>Affecté le</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignmentStats.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((assignment: any, index) => {
                  const hasFaultyData = assignment.hasIssue;
                  return (
                    <TableRow 
                      key={index}
                      sx={{ 
                        bgcolor: hasFaultyData ? 'error.light' : 'inherit',
                        '&:hover': { bgcolor: hasFaultyData ? 'error.main' : 'action.hover' }
                      }}
                    >
                      <TableCell>
                        {hasFaultyData && <Warning color="error" fontSize="small" sx={{ mr: 1 }} />}
                        {assignment.reference}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.documentType} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.gestionnaire === 'NON ASSIGNÉ' ? (
                          <Chip label="NON ASSIGNÉ" size="small" color="error" />
                        ) : (
                          assignment.gestionnaire
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.chefEquipe === 'AUCUN CHEF' ? (
                          <Chip label="AUCUN CHEF" size="small" color="error" />
                        ) : (
                          assignment.chefEquipe
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.statut} 
                          size="small" 
                          color={getStatusColor(assignment.statut) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.slaStatus}
                          size="small"
                          color={assignment.slaColor as any}
                          icon={getSlaStatusIcon(assignment.slaStatus)}
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {assignmentStats.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                Aucune affectation au niveau document trouvée
              </Typography>
              <Typography variant="body2" color="error">
                ⚠️ L'affectation doit se faire au niveau de chaque élément du bordereau
              </Typography>
            </Box>
          )}
          
          {assignmentStats.length > 0 && (
            <TablePagination
              component="div"
              count={assignmentStats.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentAnalyticsDashboard;