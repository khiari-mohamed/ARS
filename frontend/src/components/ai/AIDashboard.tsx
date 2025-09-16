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
              Classification automatique des documents ARS (bordereaux, bulletins de soins, factures) avec analyse du contenu et assignation intelligente.
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
                  
                  const trainingDataResponse = await fetch('/api/dashboard/document-training-data', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  const trainingData = await trainingDataResponse.json();
                  
                  if (!trainingData.documents || trainingData.documents.length < 20) {
                    throw new Error(`Données insuffisantes: ${trainingData.documents?.length || 0} documents trouvés (minimum 20 requis)`);
                  }
                  
                  const trainResult = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/document_classification/train`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tokenData.access_token}`
                    },
                    body: JSON.stringify({
                      documents: trainingData.documents,
                      labels: trainingData.labels,
                      model_type: 'ensemble'
                    })
                  });
                  
                  if (!trainResult.ok) {
                    throw new Error('Entraînement du modèle échoué');
                  }
                  
                  const result = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/document_classification/classify`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tokenData.access_token}`
                    },
                    body: JSON.stringify({
                      documents: [
                        'Bordereau de remboursement ARS pour soins dentaires - Patient: Martin Dupont - Montant: 150€',
                        'Facture médicale consultation généraliste - Acte CCAM: C001 - Remboursement ARS demandé',
                        'Bulletin de soins ARS - Prestations hospitalières - Séjour du 15/01 au 18/01'
                      ],
                      batch_mode: true
                    })
                  });
                  const data = await result.json();
                  
                  if (data.classifications && data.classifications.length > 0) {
                    // Step 2: Analyze content with sentiment analysis
                    const sentimentResult = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/sentiment_analysis`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokenData.access_token}`
                      },
                      body: JSON.stringify({
                        text: 'Bordereau de remboursement ARS pour soins dentaires - Patient: Martin Dupont - Montant: 150€'
                      })
                    });
                    const sentimentData = await sentimentResult.json();
                    
                    // Step 3: Get intelligent assignment
                    const assignmentResult = await fetch(`${process.env.REACT_APP_AI_MICROSERVICE_URL || 'http://localhost:8002'}/smart_routing/suggest_assignment`, {
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
                    const assignmentData = await assignmentResult.json();
                    
                    const classificationSummary = data.classifications.map((c: any, i: number) => 
                      `• Document ${i+1}: ${c.predicted_class} (${(c.confidence*100).toFixed(1)}% confiance)`
                    ).join('\n');
                    
                    const sentimentSummary = `\n\n📊 Analyse du contenu:\n• Sentiment: ${sentimentData.sentiment} (${(sentimentData.confidence*100).toFixed(1)}% confiance)\n• Score: ${sentimentData.score}`;
                    
                    const assignmentSummary = assignmentData.recommended_assignment ? 
                      `\n\n🎯 Assignation intelligente:\n• Agent recommandé: ${assignmentData.recommended_assignment.agent_name}\n• Score: ${assignmentData.recommended_assignment.total_score.toFixed(2)}\n• Confiance: ${assignmentData.recommended_assignment.confidence}` :
                      '\n\n🎯 Assignation intelligente: Aucun agent disponible';
                    
                    const fullSummary = `✅ Traitement IA complet terminé:\n\n🔍 Classification:\n${classificationSummary}${sentimentSummary}${assignmentSummary}`;
                    
                    setPopup({open: true, title: '✅ IA ARS - Classification + Analyse + Assignation', message: fullSummary, type: 'success'});
                    setDocumentAI({...documentAI, loading: false, data: {...data, sentiment: sentimentData, assignment: assignmentData}});
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
              {documentAI.loading ? '🔄 IA en cours: Classification + Analyse + Assignation...' : '🤖 Classification + Analyse + Assignation'}
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