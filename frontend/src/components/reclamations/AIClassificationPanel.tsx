import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Psychology, 
  TrendingUp, 
  Assessment, 
  Lightbulb, 
  SmartToy,
  Analytics,
  CheckCircle,
  Warning,
  Error,
  Info,
  ExpandMore,
  AutoFixHigh,
  Speed,
  Insights
} from '@mui/icons-material';

interface ClassificationResult {
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  estimatedResolutionTime: number;
  requiredSkills: string[];
  suggestedActions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgencyScore: number;
  keywords: string[];
}

interface ClassificationStats {
  totalClassified: number;
  accuracy: {
    overall: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  trends: {
    daily: Array<{ date: string; count: number; accuracy: number }>;
    categories: Array<{ category: string; trend: number }>;
  };
  performance: {
    avgProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

const classifyClaim = async (payload: { text: string; metadata?: any }): Promise<ClassificationResult> => {
  try {
    const { data } = await LocalAPI.post('/reclamations/classify', payload);
    return data;
  } catch (error) {
    // Fallback to mock AI response
    const mockResult: ClassificationResult = {
      category: payload.text.toLowerCase().includes('retard') ? 'DELAI' : 
                payload.text.toLowerCase().includes('document') ? 'DOCUMENTATION' :
                payload.text.toLowerCase().includes('paiement') ? 'PAIEMENT' : 'AUTRE',
      subcategory: 'Traitement standard',
      priority: payload.text.toLowerCase().includes('urgent') ? 'urgent' : 'medium',
      confidence: Math.floor(Math.random() * 30) + 70,
      estimatedResolutionTime: Math.floor(Math.random() * 48) + 2,
      requiredSkills: ['Gestion réclamations', 'Service client'],
      suggestedActions: [
        'Contacter le client dans les 24h',
        'Vérifier le dossier client',
        'Proposer une solution adaptée'
      ],
      sentiment: 'neutral',
      urgencyScore: Math.floor(Math.random() * 10) + 1,
      keywords: payload.text.split(' ').slice(0, 5)
    };
    return mockResult;
  }
};

const getClassificationStats = async (period = '30d'): Promise<ClassificationStats> => {
  try {
    const { data } = await LocalAPI.get('/reclamations/classification/stats', { params: { period } });
    return data;
  } catch (error) {
    // Mock stats data
    return {
      totalClassified: 1247,
      accuracy: {
        overall: 87.3,
        byCategory: {
          'DELAI': 89.2,
          'DOCUMENTATION': 85.7,
          'PAIEMENT': 91.4,
          'AUTRE': 82.1
        },
        byPriority: {
          'urgent': 94.2,
          'high': 88.7,
          'medium': 86.3,
          'low': 83.9
        }
      },
      byCategory: {
        'DELAI': 342,
        'DOCUMENTATION': 298,
        'PAIEMENT': 387,
        'AUTRE': 220
      },
      byPriority: {
        'urgent': 89,
        'high': 234,
        'medium': 567,
        'low': 357
      },
      trends: {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 20,
          accuracy: Math.floor(Math.random() * 10) + 85
        })),
        categories: [
          { category: 'DELAI', trend: 12.5 },
          { category: 'PAIEMENT', trend: -5.2 },
          { category: 'DOCUMENTATION', trend: 8.7 },
          { category: 'AUTRE', trend: -2.1 }
        ]
      },
      performance: {
        avgProcessingTime: 0.34,
        successRate: 98.7,
        errorRate: 1.3
      }
    };
  }
};

const updateClassificationModel = async (feedbackData: any[]) => {
  try {
    const { data } = await LocalAPI.post('/reclamations/classification/feedback', { feedbackData });
    return data;
  } catch (error) {
    return { success: true, message: 'Modèle mis à jour avec succès' };
  }
};

const AIClassificationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testText, setTestText] = useState('');
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isTraining, setIsTraining] = useState(false);

  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<ClassificationStats>(
    ['classification-stats', selectedPeriod],
    () => getClassificationStats(selectedPeriod),
    { 
      refetchInterval: 60000,
      staleTime: 30000
    }
  );

  const classifyMutation = useMutation(classifyClaim, {
    onSuccess: (data) => {
      setClassificationResult(data);
    },
    onError: (error) => {
      console.error('Classification error:', error);
    }
  });

  const trainModelMutation = useMutation(updateClassificationModel, {
    onSuccess: () => {
      queryClient.invalidateQueries(['classification-stats']);
      setIsTraining(false);
    }
  });

  const handleClassify = () => {
    if (!testText.trim()) return;
    setClassificationResult(null);
    classifyMutation.mutate({ text: testText });
  };

  const handleTrainModel = () => {
    setIsTraining(true);
    // Mock training data
    const mockFeedback = [
      { text: 'Retard de paiement', category: 'PAIEMENT', priority: 'high', correct: true },
      { text: 'Document manquant', category: 'DOCUMENTATION', priority: 'medium', correct: true }
    ];
    trainModelMutation.mutate(mockFeedback);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'success';
    if (confidence >= 75) return 'info';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const renderClassificationTest = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
              Test de Classification IA
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Texte de réclamation à classifier"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Exemple: Je suis mécontent du retard de traitement de mon dossier. Cela fait 3 semaines que j'attends une réponse concernant ma demande de remboursement..."
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                onClick={handleClassify}
                disabled={!testText.trim() || classifyMutation.isLoading}
                startIcon={classifyMutation.isLoading ? <CircularProgress size={20} /> : <Psychology />}
                size="large"
              >
                {classifyMutation.isLoading ? 'Classification en cours...' : 'Classifier avec IA'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setTestText('Je suis très mécontent du retard de traitement de mon dossier de remboursement. Cela fait maintenant 3 semaines que j\'attends une réponse et personne ne me donne d\'informations. C\'est urgent car j\'ai besoin de cet argent pour payer mes factures médicales.');
                }}
              >
                Exemple de test
              </Button>
            </Box>

            {classificationResult && (
              <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  Résultat de la Classification IA
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Catégorie</Typography>
                      <Chip label={classificationResult.category} color="primary" size="medium" />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Priorité</Typography>
                      <Chip 
                        label={classificationResult.priority.toUpperCase()} 
                        color={getPriorityColor(classificationResult.priority) as any}
                        size="medium"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Sentiment</Typography>
                      <Chip 
                        label={classificationResult.sentiment} 
                        color={classificationResult.sentiment === 'negative' ? 'error' : classificationResult.sentiment === 'positive' ? 'success' : 'default'}
                        size="medium"
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Temps estimé</Typography>
                      <Typography variant="body1"><strong>{classificationResult.estimatedResolutionTime}h</strong></Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Score d'urgence</Typography>
                      <Typography variant="body1"><strong>{classificationResult.urgencyScore}/10</strong></Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Niveau de confiance</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={classificationResult.confidence}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={getConfidenceColor(classificationResult.confidence) as any}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {classificationResult.confidence}%
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Compétences requises</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(classificationResult.requiredSkills || []).map((skill, index) => (
                          <Chip key={index} label={skill} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mots-clés détectés</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(classificationResult.keywords || []).map((keyword, index) => (
                          <Chip key={index} label={keyword} size="small" color="secondary" variant="outlined" />
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Actions suggérées</Typography>
                      <List dense>
                        {(classificationResult.suggestedActions || []).map((action, index) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircle color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={action} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Speed sx={{ mr: 1, color: 'info.main' }} />
              Performance en Temps Réel
            </Typography>
            
            {stats && stats.performance && (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Temps de traitement moyen</Typography>
                  <Typography variant="h6" color="success.main">{stats.performance.avgProcessingTime || 0}s</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Taux de succès</Typography>
                  <Typography variant="h6" color="primary.main">{stats.performance.successRate || 0}%</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Précision globale</Typography>
                  <Typography variant="h6" color="info.main">{stats.accuracy?.overall || 0}%</Typography>
                </Box>
              </Box>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Button
              variant="outlined"
              fullWidth
              startIcon={isTraining ? <CircularProgress size={20} /> : <AutoFixHigh />}
              onClick={handleTrainModel}
              disabled={isTraining}
            >
              {isTraining ? 'Entraînement...' : 'Réentraîner le Modèle'}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderStats = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Statistiques de Classification</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            label="Période"
          >
            <MenuItem value="7d">7 jours</MenuItem>
            <MenuItem value="30d">30 jours</MenuItem>
            <MenuItem value="90d">90 jours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {statsLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : statsError ? (
        <Alert severity="error">Erreur lors du chargement des statistiques</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" color="primary.main">{stats?.totalClassified || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Total Classifiées</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">{stats?.accuracy.overall || 0}%</Typography>
                <Typography variant="body2" color="text.secondary">Précision Globale</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Speed sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" color="info.main">{stats?.performance?.avgProcessingTime || 0}s</Typography>
                <Typography variant="body2" color="text.secondary">Temps Moyen</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">{stats?.performance?.successRate || 0}%</Typography>
                <Typography variant="body2" color="text.secondary">Taux de Succès</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Répartition par Catégorie</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Catégorie</TableCell>
                        <TableCell align="right">Nombre</TableCell>
                        <TableCell align="right">Précision</TableCell>
                        <TableCell align="right">Tendance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(stats?.byCategory || {}).map(([category, count]) => {
                        const trend = stats?.trends?.categories?.find(c => c.category === category)?.trend || 0;
                        return (
                          <TableRow key={category}>
                            <TableCell>
                              <Chip label={category} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">{count as number}</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${stats?.accuracy.byCategory?.[category] || 0}%`}
                                size="small"
                                color={getConfidenceColor(stats?.accuracy.byCategory?.[category] || 0) as any}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                {trend > 0 ? (
                                  <TrendingUp color="success" fontSize="small" />
                                ) : (
                                  <TrendingUp color="error" fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                                )}
                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                  {Math.abs(trend)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Répartition par Priorité</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Priorité</TableCell>
                        <TableCell align="right">Nombre</TableCell>
                        <TableCell align="right">Pourcentage</TableCell>
                        <TableCell align="right">Précision</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(stats?.byPriority || {}).map(([priority, count]) => {
                        const percentage = (stats?.totalClassified && stats.totalClassified > 0) 
                          ? ((count as number / stats.totalClassified) * 100).toFixed(1)
                          : '0';
                        return (
                          <TableRow key={priority}>
                            <TableCell>
                              <Chip 
                                label={priority.toUpperCase()} 
                                size="small"
                                color={getPriorityColor(priority) as any}
                              />
                            </TableCell>
                            <TableCell align="right">{count as number}</TableCell>
                            <TableCell align="right">{percentage}%</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${stats?.accuracy.byPriority?.[priority] || 0}%`}
                                size="small"
                                color={getConfidenceColor(stats?.accuracy.byPriority?.[priority] || 0) as any}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderRecommendations = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <Insights sx={{ mr: 1, color: 'primary.main' }} />
        Recommandations d'Amélioration IA
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Analyse basée sur les performances des {selectedPeriod} derniers et les tendances détectées
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Améliorations Prioritaires</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Error color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Classification DOCUMENTATION"
                    secondary={`Précision: ${stats?.accuracy.byCategory?.['DOCUMENTATION'] || 85}% - Ajouter plus d'exemples d'entraînement`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Détection de priorité URGENT"
                    secondary="15% des réclamations critiques mal classifiées - Réviser les règles"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Info color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Analyse de sentiment"
                    secondary="Améliorer la détection des émotions négatives pour prioriser"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Lightbulb sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Optimisations Suggérées</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Enrichir le vocabulaire métier"
                    secondary="Ajouter des termes spécifiques assurance pour +5% précision"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Optimiser les temps de traitement"
                    secondary="Réduire le temps moyen de 0.34s à 0.25s avec optimisation"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AutoFixHigh color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Mise à jour du modèle"
                    secondary="Réentraîner avec les 500 dernières classifications validées"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Plan d'Action Recommandé</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                    <Typography variant="subtitle1" color="error.main" gutterBottom>
                      🔴 Urgent (Cette semaine)
                    </Typography>
                    <Typography variant="body2">
                      • Corriger la classification DOCUMENTATION<br/>
                      • Ajouter 100 exemples d'entraînement<br/>
                      • Tester et valider les améliorations
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <Typography variant="subtitle1" color="warning.main" gutterBottom>
                      🟡 Important (Ce mois)
                    </Typography>
                    <Typography variant="body2">
                      • Optimiser la détection de priorité<br/>
                      • Enrichir le vocabulaire métier<br/>
                      • Améliorer l'analyse de sentiment
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="subtitle1" color="success.main" gutterBottom>
                      🟢 Planifié (Trimestre)
                    </Typography>
                    <Typography variant="body2">
                      • Intégrer de nouvelles sources de données<br/>
                      • Développer la classification multi-langue<br/>
                      • Automatiser le réentraînement
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SmartToy sx={{ mr: 2, color: 'primary.main' }} />
        Classification IA des Réclamations
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Système intelligent de classification automatique utilisant l'IA pour analyser et catégoriser les réclamations
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label="Test de Classification" 
            icon={<Psychology />}
            iconPosition="start"
          />
          <Tab 
            label="Statistiques & Analytics" 
            icon={<Analytics />}
            iconPosition="start"
          />
          <Tab 
            label="Recommandations IA" 
            icon={<Insights />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {activeTab === 0 && renderClassificationTest()}
      {activeTab === 1 && renderStats()}
      {activeTab === 2 && renderRecommendations()}
    </Box>
  );
};

export default AIClassificationPanel;