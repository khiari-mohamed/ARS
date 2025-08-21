import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  GetApp,
  Business,
  Scanner,
  LocalHospital,
  Email,
  AccountBalance,
  People,
  Analytics,
  Warning,
  SmartToy
} from '@mui/icons-material';
import FlowDiagram from './FlowDiagram';
import ModuleDetails from './ModuleDetails';
import { moduleData, roleData } from './guideData';

const GuideFlowPage: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value);
    setSelectedModule(null);
  };

  const handleModuleClick = (moduleId: string) => {
    setSelectedModule(moduleId);
  };

  const startGuidedTour = () => {
    setShowGuidedTour(true);
    const modules = Object.keys(moduleData);
    let index = 0;
    const interval = setInterval(() => {
      setSelectedModule(modules[index]);
      index++;
      if (index >= modules.length) {
        clearInterval(interval);
        setShowGuidedTour(false);
      }
    }, 3000);
  };

  const exportDiagram = () => {
    const element = document.createElement('a');
    const file = new Blob(['ARS Application Flow Diagram - Generated from Guide Module'], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'ARS_Flow_Diagram.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflow: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          📘 Guide & Flux Fonctionnel de l'Application ARS
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Visualisation des modules, des processus et des rôles utilisateurs
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={startGuidedTour}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
          >
            🎥 Visite Guidée
          </Button>
          <Button
            variant="contained"
            startIcon={<GetApp />}
            onClick={exportDiagram}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
          >
            Exporter le Schéma
          </Button>
          
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={selectedRole}
              onChange={handleRoleChange}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.9)', 
                '& .MuiSelect-select': { py: 1 }
              }}
            >
              <MenuItem value="ALL">👑 Vue Complète</MenuItem>
              <MenuItem value="BUREAU_ORDRE">📥 Bureau d'Ordre</MenuItem>
              <MenuItem value="SCAN">🖨️ Équipe Scan</MenuItem>
              <MenuItem value="CHEF_EQUIPE">👨⚕️ Chef d'Équipe</MenuItem>
              <MenuItem value="GESTIONNAIRE">👩💼 Gestionnaire</MenuItem>
              <MenuItem value="FINANCE">💰 Finance</MenuItem>
              <MenuItem value="CLIENT_SERVICE">👥 Service Client</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '600px', position: 'relative' }}>
            <CardContent sx={{ height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Diagramme de Flux Interactif
              </Typography>
              <FlowDiagram
                selectedRole={selectedRole}
                selectedModule={selectedModule}
                onModuleClick={handleModuleClick}
                showGuidedTour={showGuidedTour}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '600px', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détails du Module
              </Typography>
              {selectedModule ? (
                <ModuleDetails moduleId={selectedModule} role={selectedRole} />
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="textSecondary">
                    Cliquez sur un module dans le diagramme pour voir ses détails
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Résumé du Workflow Global
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">🔄 Flux Opérationnel Principal</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 1:</strong> 📥 Bureau d'Ordre reçoit le dossier → enregistrement initial avec référence unique
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 2:</strong> 🖨️ Scan numérise + indexe GED → affectation automatique selon la charge
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 3:</strong> 👨⚕️ Chef d'équipe affecte → gestionnaires traitent → suivi SLA temps réel
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 4:</strong> ✉️ Réclamations et GEC gérés en parallèle avec IA de classification
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 5:</strong> 💰 Finance exécute les virements → confirmation → archivage automatique
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Étape 6:</strong> 📊 Analytics centralise KPIs, Alertes temps réel, IA optimise les affectations
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏷️ Légende des Statuts
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip
                    icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />}
                    label="Traité dans les temps"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff9800' }} />}
                    label="Risque de retard"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f44336' }} />}
                    label="Dépassement SLA"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default GuideFlowPage;