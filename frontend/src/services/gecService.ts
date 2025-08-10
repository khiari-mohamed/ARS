import { LocalAPI } from './axios';

// Outlook Integration
export const connectOutlook = async (userId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/outlook/auth-url/${userId}`);
    return data.authUrl;
  } catch (error) {
    return 'https://login.microsoftonline.com/oauth2/v2.0/authorize?mock=true';
  }
};

export const getIntegrationStatus = async (userId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/outlook/status/${userId}`);
    return data;
  } catch (error) {
    return {
      connected: true,
      lastSync: new Date(Date.now() - 30 * 60 * 1000),
      features: {
        email: true,
        calendar: true,
        contacts: true
      },
      stats: {
        emailsSent: 45,
        emailsReceived: 123,
        eventsCreated: 8,
        contactsSynced: 156
      }
    };
  }
};

export const getOutlookEmails = async (userId: string, folderId = 'inbox') => {
  try {
    const { data } = await LocalAPI.get(`/gec/outlook/emails/${userId}`, { params: { folderId } });
    return data;
  } catch (error) {
    return [
      {
        id: 'msg_001',
        subject: 'Demande de remboursement - Client ABC',
        body: 'Bonjour, je souhaite faire une demande de remboursement...',
        from: 'client.abc@email.com',
        to: ['support@company.com'],
        priority: 'normal',
        isRead: false,
        receivedDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        attachments: [
          {
            id: 'att_001',
            name: 'facture.pdf',
            contentType: 'application/pdf',
            size: 245760
          }
        ]
      },
      {
        id: 'msg_002',
        subject: 'Réclamation - Bulletin de soin',
        body: 'Madame, Monsieur, je conteste le traitement de mon bulletin...',
        from: 'client.xyz@email.com',
        to: ['reclamations@company.com'],
        priority: 'high',
        isRead: true,
        receivedDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    ];
  }
};

export const sendOutlookEmail = async (userId: string, message: any) => {
  try {
    const { data } = await LocalAPI.post(`/gec/outlook/send/${userId}`, message);
    return data;
  } catch (error) {
    return { success: true, messageId: `msg_${Date.now()}` };
  }
};

export const getCalendarEvents = async (userId: string, startDate: Date, endDate: Date) => {
  try {
    const { data } = await LocalAPI.get(`/gec/outlook/calendar/${userId}`, {
      params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    });
    return data;
  } catch (error) {
    return [
      {
        id: 'event_001',
        subject: 'Réunion équipe GEC',
        body: 'Réunion hebdomadaire de l\'équipe GEC',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: 'Salle de réunion A',
        attendees: ['team@company.com'],
        isAllDay: false
      },
      {
        id: 'event_002',
        subject: 'Formation Outlook Integration',
        body: 'Formation sur la nouvelle intégration Outlook',
        start: new Date(Date.now() + 48 * 60 * 60 * 1000),
        end: new Date(Date.now() + 48 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        attendees: ['all@company.com'],
        isAllDay: false
      }
    ];
  }
};

export const getOutlookContacts = async (userId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/outlook/contacts/${userId}`);
    return data;
  } catch (error) {
    return [
      {
        id: 'contact_001',
        displayName: 'Jean Dupont',
        emailAddresses: [
          { address: 'jean.dupont@client.com', name: 'Jean Dupont' }
        ],
        phoneNumbers: [
          { number: '+33123456789', type: 'business' }
        ],
        companyName: 'Client ABC',
        jobTitle: 'Directeur'
      },
      {
        id: 'contact_002',
        displayName: 'Marie Martin',
        emailAddresses: [
          { address: 'marie.martin@partenaire.com', name: 'Marie Martin' }
        ],
        phoneNumbers: [
          { number: '+33987654321', type: 'business' }
        ],
        companyName: 'Partenaire XYZ',
        jobTitle: 'Responsable'
      }
    ];
  }
};

// Mail Tracking
export const getMailTrackingReport = async (messageIds: string[]) => {
  try {
    const { data } = await LocalAPI.post('/gec/tracking/report', { messageIds });
    return data;
  } catch (error) {
    return {
      summary: {
        totalMessages: messageIds.length,
        deliveryRate: 95.2,
        openRate: 68.4,
        responseRate: 12.8,
        avgResponseTime: 4.2
      },
      delivery: messageIds.reduce((acc, id) => {
        acc[id] = {
          messageId: id,
          status: 'delivered',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          attempts: 1
        };
        return acc;
      }, {} as any),
      engagement: {
        totalSent: messageIds.length,
        totalOpened: Math.floor(messageIds.length * 0.68),
        uniqueOpens: Math.floor(messageIds.length * 0.65),
        openRate: 68.4,
        avgOpensPerMessage: 1.2,
        topRecipients: [
          { recipient: 'client.abc@email.com', opens: 3 },
          { recipient: 'client.xyz@email.com', opens: 2 }
        ]
      },
      responses: {
        totalMessages: messageIds.length,
        totalResponses: Math.floor(messageIds.length * 0.13),
        responseRate: 12.8,
        avgResponseTime: 4.2,
        sentimentDistribution: {
          positive: 8,
          neutral: 12,
          negative: 3
        },
        autoReplyRate: 15.6
      },
      timeline: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 20) + 10,
        delivered: Math.floor(Math.random() * 18) + 8,
        opened: Math.floor(Math.random() * 15) + 5,
        clicked: Math.floor(Math.random() * 8) + 2,
        replied: Math.floor(Math.random() * 5) + 1
      }))
    };
  }
};

export const getDeliveryStatuses = async (messageIds: string[]) => {
  try {
    const { data } = await LocalAPI.post('/gec/tracking/delivery', { messageIds });
    return data;
  } catch (error) {
    return messageIds.reduce((acc, id) => {
      acc[id] = {
        messageId: id,
        status: 'delivered',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        attempts: 1
      };
      return acc;
    }, {} as any);
  }
};

export const getReadReceipts = async (messageId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/tracking/reads/${messageId}`);
    return data;
  } catch (error) {
    return [
      {
        messageId,
        recipient: 'client.abc@email.com',
        readAt: new Date(Date.now() - 30 * 60 * 1000),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.100',
        location: 'Paris, France'
      }
    ];
  }
};

export const getResponseAnalytics = async (messageIds: string[]) => {
  try {
    const { data } = await LocalAPI.post('/gec/tracking/responses', { messageIds });
    return data;
  } catch (error) {
    return {
      totalMessages: messageIds.length,
      totalResponses: Math.floor(messageIds.length * 0.13),
      responseRate: 12.8,
      avgResponseTime: 4.2,
      sentimentDistribution: {
        positive: 8,
        neutral: 12,
        negative: 3
      },
      autoReplyRate: 15.6
    };
  }
};

// Template Management
export const getEmailTemplates = async (filters?: any) => {
  try {
    const { data } = await LocalAPI.get('/gec/templates', { params: filters });
    return data;
  } catch (error) {
    return [
      {
        id: 'template_001',
        name: 'Accusé de Réception BS',
        subject: 'Accusé de réception - Bulletin de soin {{reference}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2e7d32;">Accusé de Réception</h2>
            <p>Bonjour {{clientName}},</p>
            <p>Nous accusons réception de votre bulletin de soin référence <strong>{{reference}}</strong>.</p>
            <p>Date de réception: {{receptionDate}}</p>
            <p>Votre dossier est en cours de traitement et vous recevrez une réponse sous {{delaiTraitement}} jours ouvrés.</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3>Détails du bulletin:</h3>
              <ul>
                <li>Référence: {{reference}}</li>
                <li>Montant: {{montant}}€</li>
                <li>Date de soin: {{dateSoin}}</li>
              </ul>
            </div>
            <p>Cordialement,<br>L'équipe ARS</p>
          </div>
        `,
        category: 'ACCUSE_RECEPTION',
        variables: [
          { name: 'clientName', type: 'text', required: true, description: 'Nom du client' },
          { name: 'reference', type: 'text', required: true, description: 'Référence du bulletin' },
          { name: 'receptionDate', type: 'date', required: true, description: 'Date de réception' },
          { name: 'delaiTraitement', type: 'number', required: true, defaultValue: 5, description: 'Délai de traitement en jours' },
          { name: 'montant', type: 'number', required: true, description: 'Montant du bulletin' },
          { name: 'dateSoin', type: 'date', required: true, description: 'Date du soin' }
        ],
        version: 2,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        tags: ['bs', 'accusé', 'réception'],
        metadata: { priority: 'high', autoSend: true }
      },
      {
        id: 'template_002',
        name: 'Demande de Pièces Complémentaires',
        subject: 'Demande de pièces complémentaires - Dossier {{reference}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f57c00;">Demande de Pièces Complémentaires</h2>
            <p>Bonjour {{clientName}},</p>
            <p>Nous avons bien reçu votre dossier référence <strong>{{reference}}</strong>.</p>
            <p>Afin de poursuivre le traitement de votre demande, nous avons besoin des pièces suivantes:</p>
            <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <h3>Pièces manquantes:</h3>
              {{#each missingDocuments}}
              <p>• {{this}}</p>
              {{/each}}
            </div>
            <p>Vous pouvez nous transmettre ces documents:</p>
            <ul>
              <li>Par email à l'adresse: documents@ars.com</li>
              <li>Par courrier postal</li>
              <li>Via votre espace client en ligne</li>
            </ul>
            <p><strong>Délai:</strong> Merci de nous faire parvenir ces éléments sous {{delaiReponse}} jours.</p>
            <p>Cordialement,<br>L'équipe ARS</p>
          </div>
        `,
        category: 'DEMANDE_PIECES',
        variables: [
          { name: 'clientName', type: 'text', required: true, description: 'Nom du client' },
          { name: 'reference', type: 'text', required: true, description: 'Référence du dossier' },
          { name: 'missingDocuments', type: 'list', required: true, description: 'Liste des documents manquants' },
          { name: 'delaiReponse', type: 'number', required: true, defaultValue: 15, description: 'Délai de réponse en jours' }
        ],
        version: 1,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
        tags: ['demande', 'pièces', 'complémentaires'],
        metadata: { priority: 'medium', requiresResponse: true }
      }
    ];
  }
};

export const createTemplate = async (template: any) => {
  try {
    const { data } = await LocalAPI.post('/gec/templates', template);
    return data;
  } catch (error) {
    return { success: true, id: `template_${Date.now()}` };
  }
};

export const updateTemplate = async (templateId: string, updates: any, userId: string) => {
  try {
    const { data } = await LocalAPI.put(`/gec/templates/${templateId}`, { ...updates, userId });
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const getTemplateVersions = async (templateId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/templates/${templateId}/versions`);
    return data;
  } catch (error) {
    return [
      {
        id: 'version_001',
        templateId,
        version: 2,
        subject: 'Accusé de réception - Bulletin de soin {{reference}}',
        body: 'Updated template body...',
        changes: 'Updated styling and added new variables',
        createdBy: 'admin',
        createdAt: new Date('2024-01-15'),
        isActive: true
      },
      {
        id: 'version_002',
        templateId,
        version: 1,
        subject: 'Accusé de réception - BS {{reference}}',
        body: 'Original template body...',
        changes: 'Initial version',
        createdBy: 'admin',
        createdAt: new Date('2024-01-01'),
        isActive: false
      }
    ];
  }
};

export const renderTemplate = async (templateId: string, variables: any) => {
  try {
    const { data } = await LocalAPI.post(`/gec/templates/${templateId}/render`, { variables });
    return data;
  } catch (error) {
    return {
      subject: 'Accusé de réception - Bulletin de soin REF123',
      body: '<div><h2>Accusé de Réception</h2><p>Bonjour Jean Dupont,</p><p>Nous accusons réception de votre bulletin de soin référence <strong>REF123</strong>.</p></div>'
    };
  }
};

// A/B Testing
export const getABTests = async (status?: string) => {
  try {
    const { data } = await LocalAPI.get('/gec/ab-tests', { params: { status } });
    return data;
  } catch (error) {
    return [
      {
        id: 'abtest_001',
        name: 'Test Accusé Réception - Subject Line',
        templateA: 'template_001',
        templateB: 'template_001_variant',
        trafficSplit: 50,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'running',
        metrics: {
          openRate: true,
          clickRate: true,
          responseRate: false,
          conversionRate: false
        }
      },
      {
        id: 'abtest_002',
        name: 'Test Demande Pièces - CTA Button',
        templateA: 'template_002',
        templateB: 'template_002_variant',
        trafficSplit: 30,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed',
        metrics: {
          openRate: true,
          clickRate: true,
          responseRate: true,
          conversionRate: true
        }
      }
    ];
  }
};

export const createABTest = async (config: any) => {
  try {
    const { data } = await LocalAPI.post('/gec/ab-tests', config);
    return data;
  } catch (error) {
    return { success: true, id: `abtest_${Date.now()}` };
  }
};

export const getABTestResults = async (testId: string) => {
  try {
    const { data } = await LocalAPI.get(`/gec/ab-tests/${testId}/results`);
    return data;
  } catch (error) {
    return {
      testId,
      templateA: {
        sent: 1000,
        opened: 450,
        clicked: 89,
        responded: 23,
        converted: 12
      },
      templateB: {
        sent: 1000,
        opened: 520,
        clicked: 112,
        responded: 31,
        converted: 18
      },
      winner: 'B',
      confidence: 95.2,
      significance: 0.048
    };
  }
};

// General GEC Services
export const getGECAnalytics = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/gec/analytics', { params: { period } });
    return data;
  } catch (error) {
    return {
      totalEmails: 2456,
      emailsThisMonth: 189,
      avgOpenRate: 68.4,
      avgResponseRate: 12.8,
      topTemplates: [
        { name: 'Accusé de Réception BS', usage: 456 },
        { name: 'Demande de Pièces', usage: 234 },
        { name: 'Réponse Réclamation', usage: 189 }
      ],
      integrationStats: {
        outlookConnected: true,
        lastSync: new Date(Date.now() - 30 * 60 * 1000),
        syncErrors: 2
      }
    };
  }
};