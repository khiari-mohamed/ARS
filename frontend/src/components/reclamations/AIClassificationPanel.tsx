import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Psychology,
  Category,
  PriorityHigh,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
  Lightbulb
} from '@mui/icons-material';
import { classifyClaim, getClassificationStats, updateClassificationModel } from '../../services/reclamationsService';

interface ClassificationResult {
  category: string;
  subcategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  suggestedActions: string[];
  estimatedResolutionTime: number;
  requiredSkills: string[];
}

const AIClassificationPanel: React.FC = () => {
  const [classificationStats, setClassificationStats] = useState<any>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [feedback, setFeedback] = useState({
    actualCategory: '',
    actualPriority: '',
    comments: ''
  });

  useEffect(() => {
    loadClassificationStats();
  }, []);

  const loadClassificationStats = async () => {
    try {
      const stats = await getClassificationStats();
      setClassificationStats(stats);
    } catch (error) {
      console.error('Failed to load classification stats:', error);
    }
  };

  const handleTestClassification = async () => {
    if (!testText.trim()) return;

    setLoading(true);
    try {
      const result = await classifyClaim(testText);
      setTestResult(result);
    } catch (error) {
      console.error('Classification test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedClaim || !feedback.actualCategory || !feedback.actualPriority) return;

    try {
      await updateClassificationModel([{
        claimId: selectedClaim.id,
        actualCategory: feedback.actualCategory,
        actualPriority: feedback.actualPriority
      }]);
      
      setFeedbackDialog(false);
      setFeedback({ actualCategory: '', actualPriority: '', comments: '' });
      await loadClassificationStats();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
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
    if (confidence >= 70) return 'warning';
    return 'error';
  };

  if (!classificationStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Classification IA des Réclamations
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Classifiées
                  </Typography>
                  <Typography variant="h4" component="div">
                    {classificationStats.totalClassified}
                  </Typography>
                </Box>
                <Psychology color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Précision Globale
                  </Typography>
                  <Typography variant="h4" component="div">
                    {classificationStats.accuracy.overall.toFixed(1)}%
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Catégories Détectées
                  </Typography>
                  <Typography variant="h4" component="div">
                    {Object.keys(classificationStats.byCategory).length}
                  </Typography>
                </Box>
                <Category color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Priorités Assignées
                  </Typography>
                  <Typography variant="h4" component="div">
                    {Object.values(classificationStats.byPriority).reduce((sum: number, count: any) => sum + count, 0)}
                  </Typography>
                </Box>
                <PriorityHigh color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Classification by Category */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Classification par Catégorie
              </Typography>
              <List>
                {Object.entries(classificationStats.byCategory).map(([category, count]: [string, any]) => (
                  <ListItem key={category}>
                    <ListItemIcon>
                      <Category />
                    </ListItemIcon>
                    <ListItemText
                      primary={category}
                      secondary={`${count} réclamations`}
                    />
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {classificationStats.accuracy.byCategory[category]?.toFixed(1) || 'N/A'}%
                      </Typography>
                      <Chip
                        size="small"
                        color={getConfidenceColor(classificationStats.accuracy.byCategory[category] || 0) as any}
                        label="Précision"
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Classification by Priority */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Classification par Priorité
              </Typography>
              <List>
                {Object.entries(classificationStats.byPriority).map(([priority, count]: [string, any]) => (
                  <ListItem key={priority}>
                    <ListItemIcon>
                      <PriorityHigh color={getPriorityColor(priority) as any} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </Typography>
                          <Chip
                            label={priority}
                            color={getPriorityColor(priority) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={`${count} réclamations`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Classification */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Test de Classification
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Psychology />}
                  onClick={() => setTestDialogOpen(true)}
                >
                  Tester la Classification
                </Button>
              </Box>
              <Alert severity="info">
                Testez l'algorithme de classification en saisissant le texte d'une réclamation.
                Le système analysera automatiquement la catégorie, la priorité et suggérera des actions.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test Classification Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Test de Classification IA</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Texte de la réclamation"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Saisissez le texte d'une réclamation pour tester la classification automatique..."
            sx={{ mt: 2, mb: 3 }}
          />

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {testResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Résultat de la Classification
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Category />
                    <Typography variant="subtitle1">Catégorie:</Typography>
                    <Chip label={testResult.category} color="primary" />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PriorityHigh />
                    <Typography variant="subtitle1">Priorité:</Typography>
                    <Chip 
                      label={testResult.priority} 
                      color={getPriorityColor(testResult.priority) as any} 
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CheckCircle />
                    <Typography variant="subtitle1">Confiance:</Typography>
                    <Chip 
                      label={`${testResult.confidence.toFixed(1)}%`}
                      color={getConfidenceColor(testResult.confidence) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Schedule />
                    <Typography variant="subtitle1">Temps estimé:</Typography>
                    <Chip label={`${testResult.estimatedResolutionTime}h`} />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                Actions Suggérées:
              </Typography>
              <List dense>
                {testResult.suggestedActions.map((action, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={`• ${action}`} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Compétences Requises:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {testResult.requiredSkills.map((skill, index) => (
                  <Chip key={index} label={skill} variant="outlined" size="small" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Fermer</Button>
          <Button 
            onClick={handleTestClassification} 
            variant="contained"
            disabled={!testText.trim() || loading}
          >
            {loading ? 'Classification...' : 'Classifier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Améliorer la Classification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Aidez-nous à améliorer l'algorithme en corrigeant cette classification.
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie Correcte</InputLabel>
                <Select
                  value={feedback.actualCategory}
                  label="Catégorie Correcte"
                  onChange={(e) => setFeedback(prev => ({ ...prev, actualCategory: e.target.value }))}
                >
                  <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
                  <MenuItem value="DELAI_TRAITEMENT">Délai de traitement</MenuItem>
                  <MenuItem value="QUALITE_SERVICE">Qualité de service</MenuItem>
                  <MenuItem value="ERREUR_DOSSIER">Erreur de dossier</MenuItem>
                  <MenuItem value="TECHNIQUE">Technique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priorité Correcte</InputLabel>
                <Select
                  value={feedback.actualPriority}
                  label="Priorité Correcte"
                  onChange={(e) => setFeedback(prev => ({ ...prev, actualPriority: e.target.value }))}
                >
                  <MenuItem value="low">Basse</MenuItem>
                  <MenuItem value="medium">Moyenne</MenuItem>
                  <MenuItem value="high">Haute</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Commentaires (optionnel)"
                value={feedback.comments}
                onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Expliquez pourquoi cette classification était incorrecte..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleSubmitFeedback}
            variant="contained"
            disabled={!feedback.actualCategory || !feedback.actualPriority}
          >
            Envoyer le Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIClassificationPanel;