import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import {
  BugReport,
  ExpandMore,
  Warning,
  Error,
  Info,
  CheckCircle
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface RootCause {
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  confidence: number;
  affected_processes: string[];
  recommendation: string;
  priority_score: number;
}

const RootCauseAnalysisPanel: React.FC = () => {
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStats, setAnalysisStats] = useState<any>(null);

  const fetchRootCauseAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await LocalAPI.post('/analytics/ai/root-cause-analysis', {
        analysis_type: 'root_cause'
      });
      
      setRootCauses(response.data || []);
      
      // Calculate analysis stats
      if (response.data && response.data.length > 0) {
        const stats = {
          total_issues: response.data.length,
          high_severity: response.data.filter((c: RootCause) => c.severity === 'high').length,
          medium_severity: response.data.filter((c: RootCause) => c.severity === 'medium').length,
          avg_confidence: response.data.reduce((sum: number, c: RootCause) => sum + c.confidence, 0) / response.data.length
        };
        setAnalysisStats(stats);
      }
    } catch (err: any) {
      console.error('Root cause analysis fetch error:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'analyse des causes racines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRootCauseAnalysis();
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <Error color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <Info color="info" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'success';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchRootCauseAnalysis}>
              Réessayer
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <BugReport sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Analyse des Causes Racines IA
          </Typography>
          <Button 
            size="small" 
            onClick={fetchRootCauseAnalysis}
            sx={{ ml: 'auto' }}
          >
            Actualiser
          </Button>
        </Box>

        {analysisStats && (
          <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Résumé de l'analyse
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Chip 
                label={`${analysisStats.total_issues} problèmes identifiés`}
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`${analysisStats.high_severity} critiques`}
                color="error"
                variant="outlined"
              />
              <Chip 
                label={`${analysisStats.medium_severity} moyens`}
                color="warning"
                variant="outlined"
              />
              <Chip 
                label={`${Math.round(analysisStats.avg_confidence * 100)}% confiance moyenne`}
                color={getConfidenceColor(analysisStats.avg_confidence) as any}
                variant="outlined"
              />
            </Box>
          </Box>
        )}

        {rootCauses.length === 0 ? (
          <Alert severity="success">
            Aucune cause racine critique identifiée
          </Alert>
        ) : (
          <Box>
            {rootCauses.map((cause, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" width="100%">
                    <Box mr={2}>
                      {getSeverityIcon(cause.severity)}
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {cause.category.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cause.description}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={cause.severity.toUpperCase()} 
                        color={getSeverityColor(cause.severity) as any}
                        size="small"
                      />
                      <Chip 
                        label={`${Math.round(cause.confidence * 100)}%`}
                        color={getConfidenceColor(cause.confidence) as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" paragraph>
                      <strong>Impact:</strong> {cause.impact}
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Processus affectés:</strong>
                    </Typography>
                    <Box mb={2}>
                      {cause.affected_processes.map((process, idx) => (
                        <Chip 
                          key={idx}
                          label={process.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Recommandation:</strong>
                    </Typography>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {cause.recommendation}
                    </Alert>
                    
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary">
                        Score de priorité: {cause.priority_score.toFixed(2)}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={cause.priority_score * 100} 
                        sx={{ mt: 0.5 }}
                        color={getSeverityColor(cause.severity) as any}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RootCauseAnalysisPanel;