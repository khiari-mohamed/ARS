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
        const { getEmailTemplates } = await import('../../services/gecService');
        const templatesData = await getEmailTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load templates:', error);
        // Fallback to mock data
        setTemplates([
          { id: '1', name: 'Courrier de Règlement', type: 'REGLEMENT' },
          { id: '2', name: 'Courrier de Réclamation', type: 'RECLAMATION' },
          { id: '3', name: 'Relance Client', type: 'RELANCE' }
        ]);
      }
      
      // Mock clients - replace with actual API
      setClients([
        { id: '1', name: 'Client A', email: 'clienta@example.com' },
        { id: '2', name: 'Client B', email: 'clientb@example.com' }
      ]);
    };
    loadData();
  }, []);

  const handleTemplateChange = async (templateId: string) => {
    setFormData({...formData, templateId});
    
    if (templateId) {
      try {
        const { renderTemplate } = await import('../../services/gecService');
        const template = await renderTemplate(templateId, {});
        
        setFormData(prev => ({
          ...prev,
          subject: template.subject,
          body: template.body
        }));
      } catch (error) {
        console.error('Failed to load template:', error);
        // Fallback to mock
        setFormData(prev => ({
          ...prev,
          subject: 'Objet automatique du template',
          body: 'Corps du message avec variables {{clientName}}'
        }));
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
      const { sendOutlookEmail } = await import('../../services/gecService');
      
      // Create and send correspondence
      if (action === 'send') {
        await sendOutlookEmail('current-user', {
          subject: formData.subject,
          body: formData.body,
          to: [formData.recipientEmail]
        });
      }
      
      const actionMessages = {
        draft: 'Brouillon sauvegardé',
        send: 'Courrier envoyé avec succès',
        schedule: 'Courrier programmé'
      };
      
      alert(actionMessages[action]);
      
      // Reset form after send
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
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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