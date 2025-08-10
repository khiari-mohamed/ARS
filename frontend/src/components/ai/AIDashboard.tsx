import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Psychology,
  AutoFixHigh,
  TrendingUp,
  Warning,
  CheckCircle,
  Assignment,
  ExpandMore,
  SmartToy,
  Analytics,
  Speed
} from '@mui/icons-material';
import { useAI, useDocumentClassification, useSLAPrediction, useSmartRouting, usePatternRecognition } from '../../hooks/useAI';

const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [aiHealth, setAiHealth] = useState<any>(null);
  
  const ai = useAI();
  const documentAI = useDocumentClassification();
  const slaAI = useSLAPrediction();
  const routingAI = useSmartRouting();
  const patternAI = usePatternRecognition();

  useEffect(() => {
    checkAIHealth();
  }, []);

  const checkAIHealth = async () => {
    try {
      const health = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8001'}/health`);
      const healthData = await health.json();
      setAiHealth(healthData);
    } catch (error) {
      console.error('AI health check failed:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const renderDocumentClassification = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
              Classification de Documents
            </Typography>
            
            {documentAI.loading && <LinearProgress sx={{ mb: 2 }} />}
            
            {documentAI.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {documentAI.error}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Utilisez l'IA pour classifier automatiquement les documents entrants selon leur type et contenu.
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => documentAI.classify(['Document de test'])}
              disabled={documentAI.loading}
              sx={{ mr: 2 }}
            >
              Tester Classification
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => documentAI.train(['Doc 1', 'Doc 2'], ['Type A', 'Type B'])}
              disabled={documentAI.loading}
            >
              Entraîner Modèle
            </Button>
            
            {documentAI.data && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Résultats de Classification:
                </Typography>
                <List dense>
                  {documentAI.data.classifications?.map((classification: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color={classification.confidence_level === 'high' ? 'success' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Classe: ${classification.predicted_class}`}
                        secondary={`Confiance: ${(classification.confidence * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
              Performance du Modèle
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    92.5%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Précision
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    1,247
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Documents Traités
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSLAPrediction = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
              Prédiction de Dépassement SLA
            </Typography>
            
            {slaAI.loading && <LinearProgress sx={{ mb: 2 }} />}
            
            {slaAI.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {slaAI.error}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Prédisez les risques de dépassement des délais SLA avec une précision de 87%.
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => slaAI.predict({
                id: 'test_item',
                start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                current_progress: 30,
                total_required: 100,
                workload: 8,
                complexity: 3,
                team_efficiency: 0.8
              })}
              disabled={slaAI.loading}
            >
              Analyser Risque SLA
            </Button>
            
            {slaAI.data && (
              <Box mt={3}>
                <Alert 
                  severity={
                    slaAI.data.prediction.risk_level === 'High' ? 'error' :
                    slaAI.data.prediction.risk_level === 'Medium' ? 'warning' : 'success'
                  }
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1">
                    Risque: {slaAI.data.prediction.risk_level} ({slaAI.data.prediction.risk_color})
                  </Typography>
                  <Typography variant="body2">
                    Probabilité de dépassement: {(slaAI.data.prediction.breach_probability * 100).toFixed(1)}%
                  </Typography>
                </Alert>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Détails de l'Analyse</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="subtitle2" gutterBottom>
                      Contributions des Facteurs:
                    </Typography>
                    {Object.entries(slaAI.data.prediction.feature_contributions).map(([feature, value]: [string, any]) => (
                      <Box key={feature} display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{feature}:</Typography>
                        <Typography variant="body2" fontWeight="bold">{value.toFixed(2)}</Typography>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alertes SLA Actives
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Warning color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Bordereau #BR-2024-001"
                  secondary="Risque élevé - 2 jours restants"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Warning color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Bordereau #BR-2024-002"
                  secondary="Risque moyen - 5 jours restants"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Bordereau #BR-2024-003"
                  secondary="Dans les temps - 8 jours restants"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSmartRouting = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Routage Intelligent
            </Typography>
            
            {routingAI.loading && <LinearProgress sx={{ mb: 2 }} />}
            
            {routingAI.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {routingAI.error}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Assignation automatique des tâches basée sur les compétences et la charge de travail.
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => routingAI.suggest({
                id: 'task_001',
                priority: 4,
                complexity: 3,
                estimated_time: 2,
                client_importance: 5,
                sla_urgency: 4,
                document_count: 15,
                requires_expertise: 1,
                is_recurring: 0,
                type: 'bordereau_processing'
              })}
              disabled={routingAI.loading}
            >
              Suggérer Assignation
            </Button>
            
            {routingAI.data && (
              <Box mt={3}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    Assignation Recommandée: {routingAI.data.recommended_assignee}
                  </Typography>
                  <Typography variant="body2">
                    Confiance: {routingAI.data.confidence} (Score: {routingAI.data.score.toFixed(2)})
                  </Typography>
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>
                  Justification:
                </Typography>
                <List dense>
                  {routingAI.data.reasoning.map((reason: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText primary={reason} />
                    </ListItem>
                  ))}
                </List>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Autres Options:
                </Typography>
                {routingAI.data.all_options.slice(1, 4).map((option: any, index: number) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">{option.assignee}</Typography>
                    <Chip 
                      label={`${option.adjusted_score.toFixed(2)}`} 
                      size="small" 
                      color={option.confidence === 'high' ? 'success' : 'default'}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Efficacité des Équipes
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    94%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Précision Routage
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    2.3h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Temps Moyen
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    85%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Charge Optimale
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPatternRecognition = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
              Reconnaissance de Motifs
            </Typography>
            
            {patternAI.loading && <LinearProgress sx={{ mb: 2 }} />}
            
            {patternAI.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {patternAI.error}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Détection automatique des problèmes récurrents et des anomalies dans les processus.
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => patternAI.detectRecurring([
                {
                  id: '1',
                  description: 'Problème de remboursement retardé',
                  date: new Date().toISOString(),
                  client: 'Client A',
                  type: 'remboursement'
                },
                {
                  id: '2',
                  description: 'Délai de remboursement trop long',
                  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  client: 'Client B',
                  type: 'remboursement'
                }
              ])}
              disabled={patternAI.loading}
              sx={{ mr: 2 }}
            >
              Détecter Récurrences
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => patternAI.detectAnomalies([
                {
                  id: 'proc_1',
                  processing_time: 120,
                  steps_count: 5,
                  error_count: 0,
                  resource_usage: 75,
                  complexity_score: 2
                },
                {
                  id: 'proc_2',
                  processing_time: 300,
                  steps_count: 8,
                  error_count: 3,
                  resource_usage: 95,
                  complexity_score: 4
                }
              ])}
              disabled={patternAI.loading}
            >
              Détecter Anomalies
            </Button>
            
            {patternAI.data && patternAI.data.recurring_groups && (
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Groupes Récurrents Détectés: {patternAI.data.total_groups}
                </Typography>
                
                {patternAI.data.recurring_groups.map((group: any, index: number) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography>
                          Groupe {group.group_id} ({group.complaint_count} réclamations)
                        </Typography>
                        <Chip 
                          label={group.pattern_strength} 
                          color={group.pattern_strength === 'high' ? 'error' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" gutterBottom>
                        Mots-clés: {group.top_keywords.join(', ')}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Clients affectés: {group.clients_affected}
                      </Typography>
                      <Typography variant="body2">
                        Similarité moyenne: {(group.avg_similarity * 100).toFixed(1)}%
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
            
            {patternAI.data && patternAI.data.anomalies && (
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Anomalies Détectées: {patternAI.data.anomaly_count}
                </Typography>
                
                {patternAI.data.anomalies.map((anomaly: any, index: number) => (
                  <Alert 
                    key={index} 
                    severity={anomaly.severity === 'high' ? 'error' : 'warning'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">
                      Processus {anomaly.process_id} - Sévérité: {anomaly.severity}
                    </Typography>
                    <Typography variant="body2">
                      Score d'anomalie: {anomaly.anomaly_score.toFixed(2)}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistiques des Motifs
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    12
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Motifs Récurrents
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    5
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Anomalies Détectées
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    89%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Précision Détection
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Psychology sx={{ mr: 2, verticalAlign: 'middle' }} />
        Intelligence Artificielle & Automatisation
      </Typography>
      
      {/* AI Health Status */}
      {aiHealth && (
        <Alert 
          severity={getStatusColor(aiHealth.status) as any} 
          sx={{ mb: 3 }}
          icon={<SmartToy />}
        >
          <Typography variant="subtitle1">
            Service IA: {aiHealth.status} (Version {aiHealth.version})
          </Typography>
          <Typography variant="body2">
            Fonctionnalités disponibles: {aiHealth.features?.length || 0}
          </Typography>
        </Alert>
      )}
      
      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Classification Documents" icon={<SmartToy />} />
          <Tab label="Prédiction SLA" icon={<Warning />} />
          <Tab label="Routage Intelligent" icon={<Assignment />} />
          <Tab label="Reconnaissance Motifs" icon={<Analytics />} />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      <Box>
        {activeTab === 0 && renderDocumentClassification()}
        {activeTab === 1 && renderSLAPrediction()}
        {activeTab === 2 && renderSmartRouting()}
        {activeTab === 3 && renderPatternRecognition()}
      </Box>
    </Box>
  );
};

export default AIDashboard;