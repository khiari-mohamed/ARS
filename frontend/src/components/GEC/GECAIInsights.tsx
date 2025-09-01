import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Button,
  Grid
} from '@mui/material';
import {
  Psychology as AIIcon,
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface AIInsight {
  group_id: number;
  complaint_count: number;
  complaints: Array<{
    complaint_id: string;
    description: string;
    client: string;
    date: string;
  }>;
  top_keywords: string[];
  pattern_strength: string;
  clients_affected: number;
}

const GECAIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');

  const loadAIInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ai-insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setInsights(data.insights || []);
        setSummary(data.summary || 'No patterns detected');
      } else {
        setError(data.message || 'Failed to load AI insights');
      }
    } catch (err) {
      setError('Failed to connect to AI service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAIInsights();
  }, []);

  const getPatternStrengthColor = (strength: string) => {
    switch (strength) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const getPatternStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'high': return <WarningIcon />;
      case 'medium': return <TrendIcon />;
      default: return <AIIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" display="flex" alignItems="center">
          <AIIcon sx={{ mr: 1 }} />
          Insights IA - Analyse des Patterns
        </Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={loadAIInsights}
          disabled={loading}
        >
          {loading ? 'Analyse...' : 'Actualiser'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {summary && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">{summary}</Typography>
        </Alert>
      )}

      {insights.length === 0 && !loading && !error && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AIIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Aucun pattern détecté
          </Typography>
          <Typography variant="body2" color="text.secondary">
            L'IA n'a trouvé aucun pattern récurrent dans les réclamations récentes.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {insights.map((insight) => (
          <Grid item xs={12} md={6} key={insight.group_id}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" display="flex" alignItems="center">
                    {getPatternStrengthIcon(insight.pattern_strength)}
                    <Box ml={1}>Pattern #{insight.group_id}</Box>
                  </Typography>
                  <Chip
                    label={insight.pattern_strength.toUpperCase()}
                    color={getPatternStrengthColor(insight.pattern_strength) as any}
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Statistiques
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Chip
                      label={`${insight.complaint_count} réclamations`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`${insight.clients_affected} clients`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Mots-clés principaux
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {insight.top_keywords.map((keyword, index) => (
                      <Chip
                        key={index}
                        label={keyword}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Réclamations similaires ({insight.complaints.length})
                </Typography>
                <List dense>
                  {insight.complaints.slice(0, 3).map((complaint, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {complaint.description.substring(0, 80)}...
                          </Typography>
                        }
                        secondary={
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">
                              {complaint.client}
                            </Typography>
                            <Typography variant="caption">
                              {new Date(complaint.date).toLocaleDateString('fr-FR')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {insight.complaints.length > 3 && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>
                            +{insight.complaints.length - 3} autres réclamations similaires
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>

                <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Recommandation:</strong> Ce pattern récurrent nécessite une attention particulière. 
                    Considérez une analyse approfondie des processus concernés et la mise en place d'actions correctives.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default GECAIInsights;