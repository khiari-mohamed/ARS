import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Box, Card, CardContent, Divider, Alert
} from '@mui/material';
// Date picker imports removed - using regular TextField instead
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PreviewIcon from '@mui/icons-material/Preview';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const CreateCorrespondenceTab: React.FC = () => {
  const [formData, setFormData] = useState({
    templateId: '',
    clientId: '',
    linkedTo: '',
    subject: '',
    body: '',
    priority: 'NORMAL',
    slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    recipientEmail: ''
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [preview, setPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        
        // Load real templates
        const templatesResponse = await fetch('http://localhost:5000/api/courriers/templates', { headers });
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData.map((t: any) => ({ id: t.id, name: t.name, type: t.type })));
        } else {
          setTemplates([
            { id: '1', name: 'Courrier de Règlement', type: 'REGLEMENT' },
            { id: '2', name: 'Courrier de Réclamation', type: 'RECLAMATION' },
            { id: '3', name: 'Relance Client', type: 'RELANCE' }
          ]);
        }
        
        // Load real clients
        const clientsResponse = await fetch('http://localhost:5000/api/clients', { headers });
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.map((c: any) => ({ id: c.id, name: c.name, email: c.email })));
        } else {
          setClients([
            { id: '1', name: 'Client A', email: 'clienta@example.com' },
            { id: '2', name: 'Client B', email: 'clientb@example.com' }
          ]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const handleTemplateChange = async (templateId: string) => {
    setFormData({...formData, templateId});
    
    if (templateId) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/courriers/templates/${templateId}/render`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          const template = await response.json();
          setFormData(prev => ({
            ...prev,
            subject: template.subject || 'Objet du template',
            body: template.body || 'Corps du message avec variables {{clientName}}'
          }));
        }
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    }
  };

  const handlePreview = () => {
    // Generate preview with variables replaced
    const selectedClient = clients.find(c => c.id === formData.clientId);
    let previewSubject = formData.subject;
    let previewBody = formData.body;
    
    if (selectedClient) {
      previewSubject = previewSubject.replace(/{{clientName}}/g, selectedClient.name);
      previewBody = previewBody.replace(/{{clientName}}/g, selectedClient.name);
    }
    
    setPreview(`Sujet: ${previewSubject}\n\n${previewBody}`);
  };

  const handleSave = async (action: 'draft' | 'send' | 'schedule') => {
    setSaving(true);
    try {
      // First create the courrier in database
      const createResponse = await fetch('http://localhost:5000/api/courriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subject: formData.subject,
          body: formData.body,
          type: getCourrierType(),
          templateUsed: formData.templateId || null,
          bordereauId: formData.linkedTo || null
        })
      });
      
      if (!createResponse.ok) {
        throw new Error('Failed to create courrier');
      }
      
      const courrier = await createResponse.json();
      
      // If sending, call the send endpoint
      if (action === 'send' && formData.recipientEmail) {
        const sendResponse = await fetch(`http://localhost:5000/api/courriers/${courrier.id}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            recipientEmail: formData.recipientEmail
          })
        });
        
        if (!sendResponse.ok) {
          throw new Error('Failed to send courrier');
        }
      }
      
      const actionMessages = {
        draft: 'Brouillon sauvegardé avec succès',
        send: 'Courrier envoyé avec succès',
        schedule: 'Courrier programmé avec succès'
      };
      
      alert(actionMessages[action]);
      
      // Reset form after successful action
      if (action === 'send') {
        setFormData({
          templateId: '',
          clientId: '',
          linkedTo: '',
          subject: '',
          body: '',
          priority: 'NORMAL',
          slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          recipientEmail: ''
        });
        setPreview('');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };
  
  const getCourrierType = () => {
    const template = templates.find(t => t.id === formData.templateId);
    if (template?.type && ['REGLEMENT', 'RELANCE', 'RECLAMATION', 'AUTRE'].includes(template.type)) {
      return template.type;
    }
    
    // Determine type from subject/content
    const subject = formData.subject.toLowerCase();
    if (subject.includes('règlement') || subject.includes('reglement')) return 'REGLEMENT';
    if (subject.includes('réclamation') || subject.includes('reclamation')) return 'RECLAMATION';
    if (subject.includes('relance')) return 'RELANCE';
    return 'AUTRE';
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Form Section */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Créer une Correspondance
            </Typography>

            <Grid container spacing={2}>
              {/* Template Selector */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={formData.templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    label="Template"
                  >
                    <MenuItem value="">Courrier personnalisé</MenuItem>
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Client Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Client</InputLabel>
                  <Select
                    value={formData.clientId}
                    onChange={(e) => {
                      const clientId = e.target.value;
                      const client = clients.find(c => c.id === clientId);
                      setFormData({
                        ...formData, 
                        clientId,
                        recipientEmail: client?.email || ''
                      });
                    }}
                    label="Client"
                  >
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Priority */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priorité</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    label="Priorité"
                  >
                    <MenuItem value="NORMAL">Normal</MenuItem>
                    <MenuItem value="URGENT">Urgent</MenuItem>
                    <MenuItem value="CRITIQUE">Critique</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Linked To */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Lié à (Contrat/Bordereau)"
                  value={formData.linkedTo}
                  onChange={(e) => setFormData({...formData, linkedTo: e.target.value})}
                  fullWidth
                  placeholder="REF-12345"
                />
              </Grid>

              {/* SLA Deadline */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Échéance SLA"
                  type="datetime-local"
                  value={formData.slaDeadline.toISOString().slice(0, 16)}
                  onChange={(e) => setFormData({...formData, slaDeadline: new Date(e.target.value)})}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Subject */}
              <Grid item xs={12}>
                <TextField
                  label="Sujet"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  fullWidth
                  required
                />
              </Grid>

              {/* Body */}
              <Grid item xs={12}>
                <TextField
                  label="Corps du message"
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  fullWidth
                  multiline
                  rows={8}
                  required
                  helperText="Utilisez {{clientName}}, {{contractNumber}} pour les variables"
                />
              </Grid>

              {/* Recipient Email */}
              <Grid item xs={12}>
                <TextField
                  label="Email destinataire"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({...formData, recipientEmail: e.target.value})}
                  fullWidth
                  type="email"
                />
              </Grid>

              {/* Attachment */}
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  component="label"
                >
                  Joindre un fichier
                  <input type="file" hidden />
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                Sauvegarder brouillon
              </Button>
              
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => handleSave('send')}
                disabled={saving || !formData.subject || !formData.body}
              >
                {saving ? 'Envoi...' : 'Envoyer'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => handleSave('schedule')}
                disabled={saving}
              >
                Programmer envoi
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
              >
                Aperçu
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Preview Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Aperçu du Document
            </Typography>
            
            {preview ? (
              <Card variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {preview}
                </Typography>
              </Card>
            ) : (
              <Box sx={{ 
                height: 200, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px dashed #ccc',
                borderRadius: 1,
                color: 'text.secondary'
              }}>
                <Typography>Cliquez sur "Aperçu" pour voir le rendu</Typography>
              </Box>
            )}

            {formData.templateId && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Template sélectionné: {templates.find(t => t.id === formData.templateId)?.name}
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateCorrespondenceTab;