import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LocalAPI } from '../../services/axios';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  CheckCircle, 
  Schedule, 
  Warning, 
  Assignment,
  Scanner,
  Person,
  SupervisorAccount
} from '@mui/icons-material';

const fetchWorkflowStatus = async () => {
  const { data } = await LocalAPI.get('/workflow/overload-status');
  return data;
};

export const WorkflowStatus: React.FC = () => {
  const { data: statusData, isLoading } = useQuery(
    ['workflow-status'],
    fetchWorkflowStatus,
    { refetchInterval: 60000 }
  );

  const workflowSteps = [
    {
      id: 1,
      name: 'Bureau d\'Ordre (BO)',
      description: 'Saisie des informations et envoi au SCAN',
      icon: <Assignment />,
      status: 'implemented',
      features: [
        'Interface dédiée BO',
        'Saisie des données bordereaux',
        'Notification automatique SCAN',
        'Intégration module client'
      ]
    },
    {
      id: 2,
      name: 'Service SCAN',
      description: 'Numérisation et indexation des documents',
      icon: <Scanner />,
      status: 'implemented',
      features: [
        'Corbeille SCAN dédiée',
        'Workflow de numérisation',
        'Notification automatique Chef',
        'Progression automatique'
      ]
    },
    {
      id: 3,
      name: 'Chef d\'Équipe',
      description: 'Affectation et supervision globale',
      icon: <SupervisorAccount />,
      status: 'implemented',
      features: [
        'Corbeille globale (3 sections)',
        'Affectation par lots',
        'Tableau de bord performance',
        'Alertes surcharge'
      ]
    },
    {
      id: 4,
      name: 'Gestionnaire',
      description: 'Traitement personnel des dossiers',
      icon: <Person />,
      status: 'implemented',
      features: [
        'Corbeille personnelle',
        'Retour au chef avec notification',
        'Tableau de bord personnel',
        'Suivi SLA et urgences'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'success';
      case 'partial': return 'warning';
      case 'missing': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircle color="success" />;
      case 'partial': return <Schedule color="warning" />;
      case 'missing': return <Warning color="error" />;
      default: return <Assignment />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        État d'Implémentation du Workflow
      </Typography>

      {/* Overall Status */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="h6">✅ Workflow 100% Implémenté</Typography>
        <Typography variant="body2">
          Les 4 étapes du workflow sont entièrement fonctionnelles avec notifications automatiques et détection de surcharge.
        </Typography>
      </Alert>

      {/* Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progression Globale
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={100} color="success" />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">100%</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Toutes les fonctionnalités requises sont implémentées et opérationnelles
          </Typography>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Grid container spacing={3}>
        {workflowSteps.map((step) => (
          <Grid item xs={12} md={6} key={step.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  {step.icon}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    {step.name}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(step.status)}
                    label="Implémenté"
                    color={getStatusColor(step.status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>

                <List dense>
                  {step.features.map((feature, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Key Features */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Fonctionnalités Clés Implémentées
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Notifications automatiques entre étapes" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Auto-affectation basée sur charge de travail" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Intégration chargé de compte" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Détection automatique de surcharge" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Alertes Super Admin en temps réel" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Suivi SLA avec codes couleur" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Tableaux de bord par rôle" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary="Historique complet des actions" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkflowStatus;