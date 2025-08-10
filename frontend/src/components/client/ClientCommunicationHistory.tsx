import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add,
  Email,
  Phone,
  Message,
  Person,
  AccessTime,
  Description as Template,
  Send
} from '@mui/icons-material';
import { fetchCommunicationHistory, addCommunicationLog, fetchCommunicationTemplates } from '../../services/clientService';

interface Props {
  clientId: string;
  clientName: string;
}

const communicationTypes = [
  { value: 'email', label: 'Email', icon: <Email /> },
  { value: 'call', label: 'Phone Call', icon: <Phone /> },
  { value: 'meeting', label: 'Meeting', icon: <Person /> },
  { value: 'message', label: 'Message', icon: <Message /> }
];

const ClientCommunicationHistory: React.FC<Props> = ({ clientId, clientName }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'email',
    subject: '',
    content: '',
    contactPerson: ''
  });

  useEffect(() => {
    loadHistory();
    loadTemplates();
  }, [clientId]);

  const loadHistory = async () => {
    try {
      const data = await fetchCommunicationHistory(clientId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load communication history:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await fetchCommunicationTemplates(clientId);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addCommunicationLog(clientId, formData);
      setDialogOpen(false);
      setFormData({ type: 'email', subject: '', content: '', contactPerson: '' });
      loadHistory();
    } catch (error) {
      console.error('Failed to add communication log:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: any) => {
    const processedSubject = template.subject.replace('{{clientName}}', clientName);
    const processedBody = template.body.replace('{{clientName}}', clientName);
    
    setFormData(prev => ({
      ...prev,
      subject: processedSubject,
      content: processedBody
    }));
    setTemplateDialogOpen(false);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = communicationTypes.find(t => t.value === type);
    return typeConfig?.icon || <Message />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'primary';
      case 'call': return 'success';
      case 'meeting': return 'warning';
      case 'message': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Communication History
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Template />}
            onClick={() => setTemplateDialogOpen(true)}
            size="small"
          >
            Templates
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Log Communication
          </Button>
        </Box>
      </Box>

      {/* Communication Stats */}
      <Grid container spacing={2} mb={3}>
        {communicationTypes.map((type) => {
          const count = history.filter(h => h.type === type.value).length;
          return (
            <Grid item xs={6} sm={3} key={type.value}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                    {type.icon}
                    <Typography variant="h6" ml={1}>
                      {count}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {type.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Communication History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getTypeIcon(item.type)}
                    label={item.type}
                    color={getTypeColor(item.type) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {item.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.content?.substring(0, 100)}...
                  </Typography>
                </TableCell>
                <TableCell>{item.contactPerson}</TableCell>
                <TableCell>{item.user}</TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small">
                      <Message />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No communication history found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Communication Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Log Communication</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  {communicationTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box display="flex" alignItems="center">
                        {type.icon}
                        <Typography ml={1}>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.subject || !formData.content}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Communication Templates</DialogTitle>
        <DialogContent>
          <Box>
            {templates.map((template) => (
              <Card key={template.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Subject: {template.subject}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {template.body.substring(0, 150)}...
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Send />}
                    onClick={() => applyTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <Typography color="text.secondary" align="center">
                No templates available
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientCommunicationHistory;