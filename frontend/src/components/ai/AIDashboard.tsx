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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Psychology,
  CheckCircle,
  SmartToy,
  Speed
} from '@mui/icons-material';

const AIDashboard: React.FC = () => {
  const [popup, setPopup] = useState<{open: boolean, title: string, message: string, type: 'success' | 'error'}>({open: false, title: '', message: '', type: 'success'});
  const [documentAI, setDocumentAI] = useState<any>({ loading: false, error: null, data: null });

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
              Classification automatique des bordereaux depuis la base de données ars_db. Le système analyse tous les bordereaux existants et les classe par statut (EN_COURS, CLOTURE, etc.).
            </Typography>
            
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  setDocumentAI({...documentAI, loading: true});
                  
                  const tokenResponse = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      grant_type: 'password',
                      username: 'admin',
                      password: 'secret'
                    })
                  });
                  const tokenData = await tokenResponse.json();
                  
                  // Fetch and classify documents directly from ars_db database
                  const result = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/document_classification/classify`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tokenData.access_token}`
                    },
                    body: JSON.stringify({
                      fetch_from_db: true,  // Fetch documents from database
                      limit: 50  // Classify 50 documents from database
                    })
                  });
                  const data = await result.json();
                  
                  if (data.classifications && data.classifications.length > 0) {
                    // Count classifications by predicted class
                    const classCounts: {[key: string]: number} = {};
                    data.classifications.forEach((c: any) => {
                      classCounts[c.predicted_class] = (classCounts[c.predicted_class] || 0) + 1;
                    });
                    
                    const classificationSummary = Object.entries(classCounts)
                      .map(([className, count]) => `• ${className}: ${count} documents`)
                      .join('\n');
                    
                    const accuracyInfo = data.accuracy ? `\n\n📊 Précision: ${data.accuracy.toFixed(1)}%` : '';
                    
                    const dataSourceInfo = `\n\n💾 Source: ${data.data_source || 'ars_db'}\n📁 Documents traités: ${data.total_documents}`;
                    
                    const predictedClassesInfo = data.predicted_classes ? `\n\n🏷️ Classes détectées: ${data.predicted_classes.join(', ')}` : '';
                    
                    const fullSummary = `✅ Classification IA terminée:\n\n🔍 Résultats:\n${classificationSummary}${accuracyInfo}${dataSourceInfo}${predictedClassesInfo}`;
                    
                    setPopup({open: true, title: '✅ IA ARS - Classification Documents Base de Données', message: fullSummary, type: 'success'});
                    setDocumentAI({...documentAI, loading: false, data: data});
                  } else if (data.database_empty) {
                    throw new Error('Base de données vide - Aucun bordereau trouvé dans ars_db');
                  } else {
                    throw new Error('Aucune classification retournée');
                  }
                } catch (error: any) {
                  setDocumentAI({...documentAI, loading: false});
                  setPopup({open: true, title: '❌ Erreur Classification ARS', message: `Impossible de classifier les documents ARS: ${error.message || 'Service IA indisponible'}`, type: 'error'});
                }
              }}
              disabled={documentAI.loading}
              sx={{ mr: 2 }}
            >
              {documentAI.loading ? '🔄 IA en cours: Lecture et Classification Base de Données...' : '🤖 Classifier Documents (Base de Données)'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  const tokenResponse = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      grant_type: 'password',
                      username: 'admin',
                      password: 'secret'
                    })
                  });
                  const tokenData = await tokenResponse.json();
                  
                  const result = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/smart_routing/suggest_assignment`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tokenData.access_token}`
                    },
                    body: JSON.stringify({
                      bordereau_data: {
                        id: 'BORD-2024-001',
                        reference: 'BORD-2024-001',
                        nombreBS: 15,
                        delaiReglement: 30,
                        days_remaining: 10,
                        statut: 'EN_COURS',
                        client_name: 'ASSURANCES SALIM'
                      }
                    })
                  });
                  const data = await result.json();
                  
                  if (data.recommended_assignment) {
                    const assignment = data.recommended_assignment;
                    const summary = `Agent recommandé: ${assignment.agent_name}\nScore: ${assignment.total_score.toFixed(2)}\nConfiance: ${assignment.confidence}\nTemps estimé: ${assignment.estimated_completion_hours}h\nRaisons: ${assignment.reason_codes.join(', ')}\n\nJustification:\n${data.assignment_reasoning?.join('\n') || ''}`;
                    setPopup({open: true, title: '🎯 Suggestion d\'Assignation IA', message: summary, type: 'success'});
                  } else if (data.message) {
                    setPopup({open: true, title: '🎯 Suggestion d\'Assignation IA', message: data.message, type: 'success'});
                  } else {
                    throw new Error('Aucune suggestion retournée par l\'IA');
                  }
                } catch (error: any) {
                  setPopup({open: true, title: '❌ Erreur d\'Assignation ARS', message: `Impossible de générer une suggestion d'assignation: ${error.message || 'Service IA indisponible'}`, type: 'error'});
                }
              }}
              disabled={documentAI.loading}
            >
              💬 Générer Suggestion
            </Button>
            
            {documentAI.data && documentAI.data.classifications && (
              <Box mt={2}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    💡 Recommandations IA:
                  </Typography>
                  {(() => {
                    const classCounts: {[key: string]: number} = {};
                    documentAI.data.classifications.forEach((c: any) => {
                      classCounts[c.predicted_class] = (classCounts[c.predicted_class] || 0) + 1;
                    });
                    const recommendations = [];
                    if (classCounts['SCAN_EN_COURS'] > 5) recommendations.push(`• ${classCounts['SCAN_EN_COURS']} bordereaux en scan - Prioriser la numérisation`);
                    if (classCounts['EN_COURS'] > 10) recommendations.push(`• ${classCounts['EN_COURS']} bordereaux en cours - Vérifier les affectations`);
                    if (classCounts['TRAITE'] > 0) recommendations.push(`• ${classCounts['TRAITE']} bordereaux traités - Prêts pour clôture`);
                    if (classCounts['CLOTURE'] > 0) recommendations.push(`• ${classCounts['CLOTURE']} bordereaux clôturés - Archivage possible`);
                    const lowConfidence = documentAI.data.classifications.filter((c: any) => c.confidence < 0.7).length;
                    if (lowConfidence > 0) recommendations.push(`• ${lowConfidence} classifications incertaines - Révision manuelle recommandée`);
                    return recommendations.map((r, i) => <div key={i}>{r}</div>);
                  })()}
                </Alert>
                <Typography variant="subtitle2" gutterBottom>
                  Aperçu des Classifications (10 premiers):
                </Typography>
                <List dense>
                  {documentAI.data.classifications.slice(0, 10).map((classification: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color={classification.confidence >= 0.8 ? 'success' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Classe: ${classification.predicted_class}`}
                        secondary={`Confiance: ${(classification.confidence * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                  ))}
                </List>
                {documentAI.data.classifications.length > 10 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ... et {documentAI.data.classifications.length - 10} autres documents
                  </Typography>
                )}
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
              Insights & Actions
            </Typography>
            
            {documentAI.data ? (
              <Box>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: documentAI.data.accuracy >= 90 ? '#e8f5e9' : '#fff3e0' }}>
                      <Typography variant="h4" color={documentAI.data.accuracy >= 90 ? 'success.main' : 'warning.main'}>
                        {documentAI.data.accuracy?.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Précision IA
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                      <Typography variant="h4" color="primary">
                        {documentAI.data.total_documents}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Documents Analysés
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Alert severity="success" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    ✅ Modèle entraîné sur données réelles ARS
                  </Typography>
                </Alert>
                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    🎯 Actions Recommandées:
                  </Typography>
                  {(() => {
                    const actions = [];
                    const classCounts: {[key: string]: number} = {};
                    documentAI.data.classifications.forEach((c: any) => {
                      classCounts[c.predicted_class] = (classCounts[c.predicted_class] || 0) + 1;
                    });
                    if (classCounts['SCAN_EN_COURS'] > 0) actions.push(`Accélérer scan de ${classCounts['SCAN_EN_COURS']} bordereaux`);
                    if (classCounts['EN_COURS'] > 15) actions.push(`Répartir ${classCounts['EN_COURS']} dossiers en cours`);
                    if (classCounts['TRAITE'] > 0) actions.push(`Clôturer ${classCounts['TRAITE']} dossiers traités`);
                    return actions.slice(0, 3).map((a, i) => <div key={i}>• {a}</div>);
                  })()}
                </Alert>
              </Box>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">--</Typography>
                    <Typography variant="body2" color="text.secondary">Précision</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">--</Typography>
                    <Typography variant="body2" color="text.secondary">Documents</Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
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
      
      {renderDocumentClassification()}
      
      <Dialog open={popup.open} onClose={() => setPopup({...popup, open: false})}>
        <DialogTitle>{popup.title}</DialogTitle>
        <DialogContent>
          <Typography style={{whiteSpace: 'pre-line'}}>{popup.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopup({...popup, open: false})}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIDashboard;