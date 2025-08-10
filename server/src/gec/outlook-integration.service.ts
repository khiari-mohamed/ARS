import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OutlookConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  priority: 'low' | 'normal' | 'high';
  isRead: boolean;
  receivedDateTime: Date;
  sentDateTime?: Date;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  body: string;
  start: Date;
  end: Date;
  location?: string;
  attendees: string[];
  isAllDay: boolean;
  recurrence?: any;
}

export interface Contact {
  id: string;
  displayName: string;
  emailAddresses: { address: string; name?: string }[];
  phoneNumbers?: { number: string; type: string }[];
  businessAddress?: any;
  companyName?: string;
  jobTitle?: string;
}

@Injectable()
export class OutlookIntegrationService {
  private readonly logger = new Logger(OutlookIntegrationService.name);

  constructor(private prisma: PrismaService) {}

  // === AUTHENTICATION ===
  async getAuthUrl(userId: string): Promise<string> {
    try {
      const config = await this.getOutlookConfig();
      const state = `${userId}_${Date.now()}`;
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        state,
        response_mode: 'query'
      });

      return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params}`;
    } catch (error) {
      this.logger.error('Failed to generate auth URL:', error);
      throw error;
    }
  }

  async exchangeCodeForToken(code: string, userId: string): Promise<any> {
    try {
      const config = await this.getOutlookConfig();
      
      // Mock token exchange - in production would call Microsoft Graph API
      const mockToken = {
        access_token: `mock_access_token_${Date.now()}`,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: config.scopes.join(' ')
      };

      await this.storeUserToken(userId, mockToken);
      
      return mockToken;
    } catch (error) {
      this.logger.error('Token exchange failed:', error);
      throw error;
    }
  }

  // === EMAIL OPERATIONS ===
  async sendEmail(userId: string, message: Partial<EmailMessage>): Promise<string> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      // Mock email sending - in production would use Microsoft Graph API
      const messageId = `msg_${Date.now()}`;
      
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'EMAIL_SENT_OUTLOOK',
          details: {
            messageId,
            subject: message.subject,
            to: message.to,
            timestamp: new Date().toISOString()
          }
        }
      });

      return messageId;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async getEmails(userId: string, folderId = 'inbox', limit = 50): Promise<EmailMessage[]> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      // Mock email retrieval
      const mockEmails: EmailMessage[] = [
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

      return mockEmails;
    } catch (error) {
      this.logger.error('Failed to get emails:', error);
      return [];
    }
  }

  async markAsRead(userId: string, messageId: string): Promise<void> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'EMAIL_MARKED_READ',
          details: { messageId, timestamp: new Date().toISOString() }
        }
      });
    } catch (error) {
      this.logger.error('Failed to mark email as read:', error);
      throw error;
    }
  }

  async replyToEmail(userId: string, messageId: string, replyBody: string): Promise<string> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      const replyId = `reply_${Date.now()}`;
      
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'EMAIL_REPLY_SENT',
          details: {
            originalMessageId: messageId,
            replyId,
            timestamp: new Date().toISOString()
          }
        }
      });

      return replyId;
    } catch (error) {
      this.logger.error('Failed to reply to email:', error);
      throw error;
    }
  }

  // === CALENDAR OPERATIONS ===
  async getCalendarEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      // Mock calendar events
      const mockEvents: CalendarEvent[] = [
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

      return mockEvents;
    } catch (error) {
      this.logger.error('Failed to get calendar events:', error);
      return [];
    }
  }

  async createCalendarEvent(userId: string, event: Partial<CalendarEvent>): Promise<string> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      const eventId = `event_${Date.now()}`;
      
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CALENDAR_EVENT_CREATED',
          details: {
            eventId,
            subject: event.subject,
            start: event.start,
            end: event.end,
            timestamp: new Date().toISOString()
          }
        }
      });

      return eventId;
    } catch (error) {
      this.logger.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // === CONTACT OPERATIONS ===
  async getContacts(userId: string, limit = 100): Promise<Contact[]> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      // Mock contacts
      const mockContacts: Contact[] = [
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

      return mockContacts;
    } catch (error) {
      this.logger.error('Failed to get contacts:', error);
      return [];
    }
  }

  async syncContacts(userId: string): Promise<{ synced: number; errors: string[] }> {
    try {
      const token = await this.getUserToken(userId);
      if (!token) {
        throw new Error('User not authenticated with Outlook');
      }

      const contacts = await this.getContacts(userId);
      let synced = 0;
      const errors: string[] = [];

      for (const contact of contacts) {
        try {
          // Mock contact sync to local database
          await this.prisma.auditLog.create({
            data: {
              userId,
              action: 'CONTACT_SYNCED',
              details: {
                contactId: contact.id,
                displayName: contact.displayName,
                timestamp: new Date().toISOString()
              }
            }
          });
          synced++;
        } catch (error) {
          errors.push(`Failed to sync contact ${contact.displayName}: ${error.message}`);
        }
      }

      return { synced, errors };
    } catch (error) {
      this.logger.error('Contact sync failed:', error);
      return { synced: 0, errors: [error.message] };
    }
  }

  // === HELPER METHODS ===
  private async getOutlookConfig(): Promise<OutlookConfig> {
    // Mock configuration - in production would be from environment variables
    return {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      tenantId: 'mock-tenant-id',
      redirectUri: 'http://localhost:3000/auth/outlook/callback',
      scopes: [
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Contacts.ReadWrite'
      ]
    };
  }

  private async getUserToken(userId: string): Promise<any> {
    try {
      // Mock token retrieval - in production would query database
      return {
        access_token: `mock_token_${userId}`,
        expires_at: Date.now() + 3600000
      };
    } catch (error) {
      return null;
    }
  }

  private async storeUserToken(userId: string, token: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'OUTLOOK_TOKEN_STORED',
          details: {
            tokenType: token.token_type,
            expiresIn: token.expires_in,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to store user token:', error);
    }
  }

  async getIntegrationStatus(userId: string): Promise<any> {
    try {
      const token = await this.getUserToken(userId);
      const isConnected = !!token;
      
      return {
        connected: isConnected,
        lastSync: isConnected ? new Date(Date.now() - 30 * 60 * 1000) : null,
        features: {
          email: isConnected,
          calendar: isConnected,
          contacts: isConnected
        },
        stats: isConnected ? {
          emailsSent: Math.floor(Math.random() * 50) + 10,
          emailsReceived: Math.floor(Math.random() * 100) + 20,
          eventsCreated: Math.floor(Math.random() * 10) + 2,
          contactsSynced: Math.floor(Math.random() * 200) + 50
        } : null
      };
    } catch (error) {
      this.logger.error('Failed to get integration status:', error);
      return {
        connected: false,
        lastSync: null,
        features: { email: false, calendar: false, contacts: false },
        stats: null
      };
    }
  }
}