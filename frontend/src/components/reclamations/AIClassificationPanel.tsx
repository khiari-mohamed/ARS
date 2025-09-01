import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalAPI, AIAPI } from '../../services/axios';
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
  // Clear any existing token to force refresh
  localStorage.removeItem('ai_token');
  
  const { data } = await AIAPI.post('/classify', payload);
  return {
    category: data.category || 'GENERAL',
    subcategory: data.subcategory || 'À classifier',
    priority: data.priority || 'medium',
    confidence: data.confidence || 0,
    estimatedResolutionTime: data.estimatedResolutionTime || 24,
    requiredSkills: data.requiredSkills || [],
    suggestedActions: data.suggestedActions || [],
    sentiment: data.sentiment || 'neutral',
    urgencyScore: data.urgencyScore || 5,
    keywords: data.keywords || []
  };
};

const getClassificationStats = async (period = '30d'): Promise<ClassificationStats> => {
  const { data } = await LocalAPI.get('/reclamations/classification/stats', { params: { period } });
  return data;
};

const updateClassificationModel = async (feedbackData: any[]) => {
  const { data } = await LocalAPI.post('/reclamations/classification/feedback', { feedbackData });
  return data;
};

const getAIRecommendations = async (period = '30d') => {
  const { data } = await LocalAPI.get('/reclamations/classification/recommendations', { params: { period } });
  return data;
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

  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError } = useQuery(
    ['ai-recommendations', selectedPeriod],
    () => getAIRecommendations(selectedPeriod),
    { 
      refetchInterval: 300000, // 5 minutes
      staleTime: 60000
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

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      // Get recent reclamations for training data
      const { data: recentClaims } = await LocalAPI.get('/reclamations', { params: { take: 50 } });
      const feedbackData = recentClaims.map((claim: any) => ({
        claimId: claim.id,
        text: claim.description,
        actualCategory: claim.type,
        actualPriority: claim.severity?.toLowerCase() || 'medium',
        correct: true
      }));
      trainModelMutation.mutate(feedbackData);
    } catch (error) {
      console.error('Failed to prepare training data:', error);
      setIsTraining(false);
    }
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

  const renderRecommendations = () => {
    if (recommendationsLoading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (recommendationsError) {
      return (
        <Alert severity="error">Erreur lors du chargement des recommandations IA</Alert>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Insights sx={{ mr: 1, color: 'primary.main' }} />
          Recommandations d'Amélioration IA
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Analyse basée sur les performances des {selectedPeriod} derniers et les tendances détectées
            {recommendations?.generatedAt && (
              <> • Généré le {new Date(recommendations.generatedAt).toLocaleString('fr-FR')}</>
            )}
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
                  {recommendations?.priorityIssues?.map((issue: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {issue.severity === 'urgent' ? (
                          <Error color="error" />
                        ) : issue.severity === 'high' ? (
                          <Warning color="warning" />
                        ) : (
                          <Info color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.title}
                        secondary={`${issue.description} • Impact: ${issue.impact}`}
                      />
                    </ListItem>
                  )) || (
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Aucun problème critique détecté"
                        secondary="Le système fonctionne dans les paramètres optimaux"
                      />
                    </ListItem>
                  )}
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
                  {recommendations?.optimizations?.map((opt: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {opt.type === 'vocabulary' ? (
                          <CheckCircle color="success" />
                        ) : opt.type === 'performance' ? (
                          <TrendingUp color="primary" />
                        ) : (
                          <AutoFixHigh color="secondary" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={opt.title}
                        secondary={`${opt.description} • ${opt.estimatedImprovement} • Effort: ${opt.effort}`}
                      />
                    </ListItem>
                  )) || (
                    <ListItem>
                      <ListItemIcon><TrendingUp color="primary" /></ListItemIcon>
                      <ListItemText
                        primary="Système optimisé"
                        secondary="Aucune optimisation majeure requise actuellement"
                      />
                    </ListItem>
                  )}
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
                        {recommendations?.actionPlan?.urgent?.title || '🔴 Urgent (Cette semaine)'}
                      </Typography>
                      <Typography variant="body2" component="div">
                        {recommendations?.actionPlan?.urgent?.items?.map((item: string, index: number) => (
                          <div key={index}>{item}</div>
                        )) || (
                          <div>• Surveiller les métriques de performance<br/>• Valider les classifications récentes</div>
                        )}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                      <Typography variant="subtitle1" color="warning.main" gutterBottom>
                        {recommendations?.actionPlan?.important?.title || '🟡 Important (Ce mois)'}
                      </Typography>
                      <Typography variant="body2" component="div">
                        {recommendations?.actionPlan?.important?.items?.map((item: string, index: number) => (
                          <div key={index}>{item}</div>
                        )) || (
                          <div>• Enrichir le vocabulaire métier<br/>• Optimiser les temps de traitement</div>
                        )}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                      <Typography variant="subtitle1" color="success.main" gutterBottom>
                        {recommendations?.actionPlan?.planned?.title || '🟢 Planifié (Trimestre)'}
                      </Typography>
                      <Typography variant="body2" component="div">
                        {recommendations?.actionPlan?.planned?.items?.map((item: string, index: number) => (
                          <div key={index}>{item}</div>
                        )) || (
                          <div>• Développer la classification multi-langue<br/>• Automatiser le réentraînement</div>
                        )}
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
  };

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