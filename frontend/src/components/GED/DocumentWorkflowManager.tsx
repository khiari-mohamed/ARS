import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar
} from '@mui/material';
// Timeline components replaced with custom implementation using standard MUI components
import {
  PlayArrow,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  Assignment,
  Approval,
  Visibility
} from '@mui/icons-material';
import { fetchWorkflowDefinitions, startWorkflow, completeWorkflowStep, getUserWorkflowTasks, getDocumentLifecycle } from '../../services/gedService';

interface WorkflowTask {
  instanceId: string;
  workflowName: string;
  documentTitle: string;
  stepName: string;
  assignedAt: Date;
  timeLimit: number;
  priority: string;
  status: string;
  documentId: string;
  stepId: string;
}

const DocumentWorkflowManager: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<WorkflowTask[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [comments, setComments] = useState('');
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [documentLifecycle, setDocumentLifecycle] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workflowsData, tasksData] = await Promise.all([
        fetchWorkflowDefinitions(),
        getUserWorkflowTasks('current_user')
      ]);
      setWorkflows(workflowsData);
      setUserTasks(tasksData);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    }
  };

  const handleStartWorkflow = async (workflowId: string, documentId: string) => {
    try {
      await startWorkflow(documentId, workflowId, 'current_user');
      await loadData();
      setWorkflowDialogOpen(false);
    } catch (error) {
      console.error('Failed to start workflow:', error);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await completeWorkflowStep(
        selectedTask.instanceId,
        selectedTask.stepId,
        decision,
        comments,
        'current_user'
      );
      await loadData();
      setTaskDialogOpen(false);
      setComments('');
      setDecision('approved');
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleViewLifecycle = async (documentId: string) => {
    try {
      const lifecycle = await getDocumentLifecycle(documentId);
      setDocumentLifecycle(lifecycle);
      setLifecycleDialogOpen(true);
    } catch (error) {
      console.error('Failed to load document lifecycle:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in_progress': return <Schedule color="primary" />;
      case 'pending': return <Schedule color="action" />;
      case 'failed': return <Cancel color="error" />;
      default: return <Schedule color="action" />;
    }
  };

  const formatTimeRemaining = (assignedAt: Date, timeLimit: number) => {
    const now = new Date();
    const deadline = new Date(assignedAt.getTime() + timeLimit * 60 * 60 * 1000);
    const remaining = deadline.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Expiré';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Box>
      {/* Header */}
      <Typography variant="h6" gutterBottom>
        Gestion des Workflows Documentaires
      </Typography>

      <Grid container spacing={3}>
        {/* User Tasks */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mes Tâches en Attente ({userTasks.length})
              </Typography>
              
              {userTasks.length === 0 ? (
                <Alert severity="info">
                  Aucune tâche de workflow en attente
                </Alert>
              ) : (
                <List>
                  {userTasks.map((task) => (
                    <ListItem
                      key={task.instanceId}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: getPriorityColor(task.priority) + '.main' }}>
                          <Assignment />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {task.documentTitle}
                            </Typography>
                            <Chip
                              label={task.priority}
                              color={getPriorityColor(task.priority) as any}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {task.workflowName} - {task.stepName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Assigné: {new Date(task.assignedAt).toLocaleString()} | 
                              Temps restant: {formatTimeRemaining(task.assignedAt, task.timeLimit)}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Approval />}
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskDialogOpen(true);
                          }}
                        >
                          Traiter
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleViewLifecycle(task.documentId)}
                        >
                          Historique
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow Definitions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflows Disponibles
              </Typography>
              
              <List>
                {workflows.map((workflow) => (
                  <ListItem key={workflow.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={workflow.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {workflow.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {workflow.steps.length} étapes | Types: {workflow.documentTypes.join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button
                      size="small"
                      startIcon={<PlayArrow />}
                      onClick={() => {
                        setSelectedDocument(workflow);
                        setWorkflowDialogOpen(true);
                      }}
                    >
                      Démarrer
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Start Workflow Dialog */}
      <Dialog open={workflowDialogOpen} onClose={() => setWorkflowDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Démarrer un Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sélectionnez un document pour démarrer le workflow "{selectedDocument?.name}"
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Document</InputLabel>
            <Select
              label="Document"
              value=""
              onChange={() => {}}
            >
              <MenuItem value="doc1">Contrat Assurance Santé - Client ABC</MenuItem>
              <MenuItem value="doc2">Bulletin de Soin - Janvier 2024</MenuItem>
              <MenuItem value="doc3">Facture - Prestation Médicale</MenuItem>
            </Select>
          </FormControl>

          {selectedDocument && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Étapes du Workflow:
              </Typography>
              <Stepper orientation="vertical">
                {selectedDocument.steps?.map((step: any, index: number) => (
                  <Step key={step.id} active={true}>
                    <StepLabel>{step.name}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        Type: {step.type} | Assigné à: {step.assigneeId}
                        {step.timeLimit && ` | Délai: ${step.timeLimit}h`}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkflowDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => handleStartWorkflow(selectedDocument?.id, 'selected_doc_id')}
          >
            Démarrer Workflow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Traiter la Tâche</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {selectedTask.documentTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Étape: {selectedTask.stepName} ({selectedTask.workflowName})
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Décision</InputLabel>
                <Select
                  value={decision}
                  label="Décision"
                  onChange={(e) => setDecision(e.target.value as any)}
                >
                  <MenuItem value="approved">Approuvé</MenuItem>
                  <MenuItem value="rejected">Rejeté</MenuItem>
                  <MenuItem value="needs_revision">Nécessite une révision</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Commentaires"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Ajoutez vos commentaires sur cette décision..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCompleteTask}
            disabled={!comments.trim()}
          >
            Valider la Décision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Lifecycle Dialog */}
      <Dialog open={lifecycleDialogOpen} onClose={() => setLifecycleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Cycle de Vie du Document</DialogTitle>
        <DialogContent>
          {documentLifecycle && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Statut actuel: 
                <Chip 
                  label={documentLifecycle.currentStatus} 
                  color="primary" 
                  sx={{ ml: 1 }} 
                />
              </Typography>

              {/* Custom Timeline Implementation */}
              <Box>
                {documentLifecycle.lifecycle.map((event: any, index: number) => (
                  <Box key={index} display="flex" mb={2}>
                    {/* Timeline Dot */}
                    <Box display="flex" flexDirection="column" alignItems="center" mr={2}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {getStatusIcon(event.status)}
                      </Avatar>
                      {index < documentLifecycle.lifecycle.length - 1 && (
                        <Box
                          sx={{
                            width: 2,
                            height: 40,
                            bgcolor: 'divider',
                            mt: 1
                          }}
                        />
                      )}
                    </Box>
                    {/* Timeline Content */}
                    <Box flex={1}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {event.status.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.comments}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="caption">{event.user}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(event.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Box>

              {documentLifecycle.nextActions && documentLifecycle.nextActions.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Actions Suivantes Possibles:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {documentLifecycle.nextActions.map((action: string, index: number) => (
                      <Chip key={index} label={action} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLifecycleDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentWorkflowManager;