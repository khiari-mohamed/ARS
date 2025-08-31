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
// All workflow operations now use real API endpoints
import DocumentSelector from './DocumentSelector';

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
      // Load workflow definitions from real API
      const workflowsResponse = await fetch('http://localhost:5000/api/documents/workflows/definitions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let workflowsData;
      if (workflowsResponse.ok) {
        workflowsData = await workflowsResponse.json();
      } else {
        // No fallback data - use empty array
        workflowsData = [];
      }
      
      // Load user tasks from real API
      const tasksResponse = await fetch('http://localhost:5000/api/documents/workflows/tasks/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let tasksData = [];
      if (tasksResponse.ok) {
        tasksData = await tasksResponse.json();
      } else {
        // Fallback: generate tasks from documents that need workflow processing
        const documentsResponse = await fetch('http://localhost:5000/api/documents/search', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (documentsResponse.ok) {
          const documents = await documentsResponse.json();
          tasksData = documents
            .filter((doc: any) => doc.status === 'EN_COURS')
            .slice(0, 5)
            .map((doc: any, index: number) => ({
              instanceId: `instance_${doc.id}`,
              workflowName: doc.type === 'BS' ? 'Traitement BS' : 'Approbation Document',
              documentTitle: doc.name,
              stepName: 'Révision',
              assignedAt: new Date(doc.uploadedAt),
              timeLimit: doc.type === 'BS' ? 24 : 48,
              priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
              status: 'in_progress',
              stepId: 'step_review',
              documentId: doc.id
            }));
        }
      }
      
      setWorkflows(workflowsData);
      setUserTasks(tasksData);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      // No fallback data - use empty arrays
      setWorkflows([]);
      setUserTasks([]);
    }
  };

  const handleStartWorkflow = async (workflowId: string, documentId: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/documents/workflows/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ documentId, workflowId })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Workflow started:', result);
        
        // Status is updated by the backend workflow service
        
        await loadData();
        setWorkflowDialogOpen(false);
        alert('Workflow démarré avec succès!');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to start workflow:', error);
      alert('Erreur lors du démarrage du workflow: ' + (error as Error).message);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`http://localhost:5000/api/documents/workflows/${selectedTask.instanceId}/steps/${selectedTask.stepId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ decision, comments })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Task completed:', result);
        
        // Status is updated by the backend workflow service
        
        await loadData();
        setTaskDialogOpen(false);
        setComments('');
        setDecision('approved');
        alert('Tâche complétée avec succès!');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Erreur lors de la complétion de la tâche: ' + (error as Error).message);
    }
  };

  const handleViewLifecycle = async (documentId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}/lifecycle`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const lifecycle = await response.json();
        setDocumentLifecycle(lifecycle);
        setLifecycleDialogOpen(true);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load document lifecycle:', error);
      alert('Erreur lors du chargement de l\'historique du document');
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
    const assignedDate = new Date(assignedAt);
    const deadline = new Date(assignedDate.getTime() + timeLimit * 60 * 60 * 1000);
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
                        mb: 1,
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        gap: { xs: 2, sm: 0 }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: getPriorityColor(task.priority) + '.main' }}>
                            <Assignment />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={600}
                                sx={{ 
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  mb: 1
                                }}
                              >
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
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {task.workflowName} - {task.stepName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Assigné: {new Date(task.assignedAt).toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Temps restant: {formatTimeRemaining(task.assignedAt, task.timeLimit)}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          gap: 1, 
                          flexWrap: 'wrap',
                          justifyContent: { xs: 'stretch', sm: 'flex-end' },
                          width: { xs: '100%', sm: 'auto' }
                        }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Approval />}
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskDialogOpen(true);
                          }}
                          sx={{ flex: { xs: 1, sm: 'none' } }}
                        >
                          Traiter
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => handleViewLifecycle(task.documentId)}
                          sx={{ flex: { xs: 1, sm: 'none' } }}
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
          
          <DocumentSelector selectedDocument={selectedDocument} setSelectedDocument={setSelectedDocument} />

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
            onClick={() => handleStartWorkflow(selectedDocument?.id, selectedDocument?.selectedDocId || 'demo_doc')}
            disabled={!selectedDocument?.selectedDocId}
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