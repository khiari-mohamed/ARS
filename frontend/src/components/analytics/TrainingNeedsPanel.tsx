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
  Divider
} from '@mui/material';
import {
  School,
  TrendingUp,
  Person,
  AccessTime,
  AttachMoney
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

interface TrainingNeed {
  skill: string;
  affectedUsers: number;
  improvementPotential: number;
  priority: 'high' | 'medium' | 'low';
  description: string;
  users: string[];
  confidence: number;
  estimated_duration: string;
  cost_benefit_ratio: number;
}

const TrainingNeedsPanel: React.FC = () => {
  const [trainingNeeds, setTrainingNeeds] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainingNeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await LocalAPI.post('/analytics/ai/training-needs', {
        analysis_type: 'training_needs'
      });
      
      setTrainingNeeds(response.data || []);
    } catch (err: any) {
      console.error('Training needs fetch error:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des besoins de formation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingNeeds();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
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
            <Button color="inherit" size="small" onClick={fetchTrainingNeeds}>
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
          <School sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Besoins de Formation IA
          </Typography>
          <Button 
            size="small" 
            onClick={fetchTrainingNeeds}
            sx={{ ml: 'auto' }}
          >
            Actualiser
          </Button>
        </Box>

        {trainingNeeds.length === 0 ? (
          <Alert severity="info">
            Aucun besoin de formation identifié actuellement
          </Alert>
        ) : (
          <List>
            {trainingNeeds.map((need, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <School color={getPriorityColor(need.priority) as any} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {need.skill}
                        </Typography>
                        <Chip 
                          label={need.priority.toUpperCase()} 
                          color={getPriorityColor(need.priority) as any}
                          size="small"
                        />
                        <Chip 
                          label={`${Math.round(need.confidence * 100)}% confiance`}
                          color={getConfidenceColor(need.confidence) as any}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {need.description}
                        </Typography>
                        
                        <Box display="flex" flexWrap="wrap" gap={2} mb={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="caption">
                              {need.affectedUsers} utilisateurs
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <TrendingUp fontSize="small" color="action" />
                            <Typography variant="caption">
                              +{need.improvementPotential}% amélioration
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="caption">
                              {need.estimated_duration}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AttachMoney fontSize="small" color="action" />
                            <Typography variant="caption">
                              ROI: {need.cost_benefit_ratio.toFixed(1)}x
                            </Typography>
                          </Box>
                        </Box>

                        {need.users.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Utilisateurs concernés: {need.users.slice(0, 3).join(', ')}
                            {need.users.length > 3 && ` et ${need.users.length - 3} autres`}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < trainingNeeds.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingNeedsPanel;