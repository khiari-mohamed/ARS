import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IntegrationConnector {
  id: string;
  name: string;
  type: 'rest' | 'soap' | 'webhook' | 'ftp' | 'email';
  config: any;
  active: boolean;
  lastSync?: Date;
  status: 'connected' | 'disconnected' | 'error';
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface SyncResult {
  connectorId: string;
  status: 'success' | 'partial' | 'failed';
  documentsProcessed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class IntegrationApisService {
  private readonly logger = new Logger(IntegrationApisService.name);

  constructor(private prisma: PrismaService) {}

  // === THIRD-PARTY CONNECTORS ===
  async getConnectors(): Promise<IntegrationConnector[]> {
    try {
      // Mock connectors - in production would be stored in database
      return [
        {
          id: 'connector_sharepoint',
          name: 'Microsoft SharePoint',
          type: 'rest',
          config: {
            baseUrl: 'https://company.sharepoint.com',
            clientId: '***',
            clientSecret: '***',
            tenantId: '***',
            siteId: 'documents-site'
          },
          active: true,
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'connected'
        },
        {
          id: 'connector_dropbox',
          name: 'Dropbox Business',
          type: 'rest',
          config: {
            accessToken: '***',
            refreshToken: '***',
            appKey: '***',
            appSecret: '***',
            rootFolder: '/ARS_Documents'
          },
          active: true,
          lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000),
          status: 'connected'
        },
        {
          id: 'connector_ftp',
          name: 'FTP Server Legacy',
          type: 'ftp',
          config: {
            host: 'ftp.legacy-system.com',
            port: 21,
            username: '***',
            password: '***',
            remotePath: '/documents',
            passive: true
          },
          active: false,
          lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'disconnected'
        },
        {
          id: 'connector_email',
          name: 'Email Attachments',
          type: 'email',
          config: {
            imapHost: 'imap.company.com',
            imapPort: 993,
            username: 'documents@company.com',
            password: '***',
            folders: ['INBOX', 'Documents'],
            processAttachments: true
          },
          active: true,
          lastSync: new Date(Date.now() - 30 * 60 * 1000),
          status: 'connected'
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get connectors:', error);
      return [];
    }
  }

  async createConnector(connector: Omit<IntegrationConnector, 'id' | 'lastSync' | 'status'>): Promise<IntegrationConnector> {
    try {
      const newConnector: IntegrationConnector = {
        id: `connector_${Date.now()}`,
        ...connector,
        status: 'disconnected'
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'CONNECTOR_CREATED',
          details: {
            connectorId: newConnector.id,
            name: newConnector.name,
            type: newConnector.type
          }
        }
      });

      return newConnector;
    } catch (error) {
      this.logger.error('Failed to create connector:', error);
      throw error;
    }
  }

  async testConnector(connectorId: string): Promise<{ success: boolean; message: string }> {
    try {
      const connector = await this.getConnector(connectorId);
      if (!connector) {
        return { success: false, message: 'Connector not found' };
      }

      // Mock connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      const success = Math.random() > 0.2; // 80% success rate

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'CONNECTOR_TEST',
          details: {
            connectorId,
            success,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success,
        message: success ? 'Connection successful' : 'Connection failed - check configuration'
      };
    } catch (error) {
      this.logger.error('Connector test failed:', error);
      return { success: false, message: 'Test failed with error' };
    }
  }

  async syncConnector(connectorId: string): Promise<SyncResult> {
    const startTime = new Date();
    
    try {
      const connector = await this.getConnector(connectorId);
      if (!connector) {
        throw new Error('Connector not found');
      }

      let documentsProcessed = 0;
      const errors: string[] = [];

      // Mock sync process based on connector type
      switch (connector.type) {
        case 'rest':
          documentsProcessed = await this.syncRestConnector(connector);
          break;
        case 'ftp':
          documentsProcessed = await this.syncFtpConnector(connector);
          break;
        case 'email':
          documentsProcessed = await this.syncEmailConnector(connector);
          break;
        default:
          throw new Error(`Unsupported connector type: ${connector.type}`);
      }

      const endTime = new Date();
      const result: SyncResult = {
        connectorId,
        status: errors.length === 0 ? 'success' : 'partial',
        documentsProcessed,
        errors,
        startTime,
        endTime
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'CONNECTOR_SYNC_COMPLETED',
          details: result
        }
      });

      return result;
    } catch (error) {
      this.logger.error('Connector sync failed:', error);
      return {
        connectorId,
        status: 'failed',
        documentsProcessed: 0,
        errors: [error.message],
        startTime,
        endTime: new Date()
      };
    }
  }

  private async syncRestConnector(connector: IntegrationConnector): Promise<number> {
    // Mock REST API sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.floor(Math.random() * 20) + 5;
  }

  private async syncFtpConnector(connector: IntegrationConnector): Promise<number> {
    // Mock FTP sync
    await new Promise(resolve => setTimeout(resolve, 3000));
    return Math.floor(Math.random() * 15) + 3;
  }

  private async syncEmailConnector(connector: IntegrationConnector): Promise<number> {
    // Mock email sync
    await new Promise(resolve => setTimeout(resolve, 1500));
    return Math.floor(Math.random() * 10) + 2;
  }

  // === WEBHOOK NOTIFICATIONS ===
  async getWebhookSubscriptions(): Promise<WebhookSubscription[]> {
    try {
      return [
        {
          id: 'webhook_001',
          url: 'https://external-system.com/webhooks/documents',
          events: ['document.created', 'document.updated', 'document.approved'],
          secret: 'webhook_secret_123',
          active: true,
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2
          }
        },
        {
          id: 'webhook_002',
          url: 'https://crm-system.com/api/document-notifications',
          events: ['document.approved', 'workflow.completed'],
          active: true,
          retryPolicy: {
            maxRetries: 5,
            backoffMultiplier: 1.5
          }
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get webhook subscriptions:', error);
      return [];
    }
  }

  async createWebhookSubscription(subscription: Omit<WebhookSubscription, 'id'>): Promise<WebhookSubscription> {
    try {
      const newSubscription: WebhookSubscription = {
        id: `webhook_${Date.now()}`,
        ...subscription
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WEBHOOK_SUBSCRIPTION_CREATED',
          details: {
            webhookId: newSubscription.id,
            url: newSubscription.url,
            events: newSubscription.events
          }
        }
      });

      return newSubscription;
    } catch (error) {
      this.logger.error('Failed to create webhook subscription:', error);
      throw error;
    }
  }

  async sendWebhookNotification(event: string, payload: any): Promise<void> {
    try {
      const subscriptions = await this.getWebhookSubscriptions();
      const relevantSubscriptions = subscriptions.filter(s => 
        s.active && s.events.includes(event)
      );

      for (const subscription of relevantSubscriptions) {
        await this.deliverWebhook(subscription, event, payload);
      }
    } catch (error) {
      this.logger.error('Failed to send webhook notifications:', error);
    }
  }

  private async deliverWebhook(subscription: WebhookSubscription, event: string, payload: any): Promise<void> {
    try {
      // Mock webhook delivery
      const webhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload
      };

      // Simulate HTTP request
      await new Promise(resolve => setTimeout(resolve, 500));
      const success = Math.random() > 0.1; // 90% success rate

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WEBHOOK_DELIVERED',
          details: {
            webhookId: subscription.id,
            event,
            success,
            url: subscription.url,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (!success) {
        // Schedule retry
        await this.scheduleWebhookRetry(subscription, event, payload, 1);
      }
    } catch (error) {
      this.logger.error('Webhook delivery failed:', error);
      await this.scheduleWebhookRetry(subscription, event, payload, 1);
    }
  }

  private async scheduleWebhookRetry(
    subscription: WebhookSubscription, 
    event: string, 
    payload: any, 
    attempt: number
  ): Promise<void> {
    if (attempt > subscription.retryPolicy.maxRetries) {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WEBHOOK_RETRY_EXHAUSTED',
          details: {
            webhookId: subscription.id,
            event,
            attempts: attempt,
            timestamp: new Date().toISOString()
          }
        }
      });
      return;
    }

    const delay = Math.pow(subscription.retryPolicy.backoffMultiplier, attempt - 1) * 1000;
    
    setTimeout(async () => {
      try {
        await this.deliverWebhook(subscription, event, payload);
      } catch (error) {
        await this.scheduleWebhookRetry(subscription, event, payload, attempt + 1);
      }
    }, delay);
  }

  // === API ENDPOINTS ===
  async getApiEndpoints(): Promise<any[]> {
    return [
      {
        id: 'api_documents',
        path: '/api/v1/documents',
        method: 'GET',
        description: 'List documents with filtering and pagination',
        authentication: 'Bearer Token',
        rateLimit: '1000/hour',
        active: true
      },
      {
        id: 'api_document_upload',
        path: '/api/v1/documents',
        method: 'POST',
        description: 'Upload new document',
        authentication: 'Bearer Token',
        rateLimit: '100/hour',
        active: true
      },
      {
        id: 'api_document_search',
        path: '/api/v1/documents/search',
        method: 'POST',
        description: 'Advanced document search',
        authentication: 'Bearer Token',
        rateLimit: '500/hour',
        active: true
      },
      {
        id: 'api_workflow_status',
        path: '/api/v1/workflows/{id}/status',
        method: 'GET',
        description: 'Get workflow instance status',
        authentication: 'Bearer Token',
        rateLimit: '2000/hour',
        active: true
      }
    ];
  }

  async generateApiKey(name: string, permissions: string[]): Promise<{ apiKey: string; secret: string }> {
    try {
      const apiKey = `ars_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const secret = Math.random().toString(36).substr(2, 32);

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'API_KEY_GENERATED',
          details: {
            name,
            permissions,
            apiKey: apiKey.substring(0, 10) + '...',
            timestamp: new Date().toISOString()
          }
        }
      });

      return { apiKey, secret };
    } catch (error) {
      this.logger.error('Failed to generate API key:', error);
      throw error;
    }
  }

  // === INTEGRATION MONITORING ===
  async getIntegrationStats(): Promise<any> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const syncLogs = await this.prisma.auditLog.findMany({
        where: {
          action: { in: ['CONNECTOR_SYNC_COMPLETED', 'WEBHOOK_DELIVERED'] },
          timestamp: { gte: last24Hours }
        }
      });

      const connectorSyncs = syncLogs.filter(log => log.action === 'CONNECTOR_SYNC_COMPLETED');
      const webhookDeliveries = syncLogs.filter(log => log.action === 'WEBHOOK_DELIVERED');

      return {
        totalSyncs: connectorSyncs.length,
        successfulSyncs: connectorSyncs.filter(log => log.details?.status === 'success').length,
        totalWebhooks: webhookDeliveries.length,
        successfulWebhooks: webhookDeliveries.filter(log => log.details?.success === true).length,
        documentsProcessed: connectorSyncs.reduce((sum, log) => sum + (log.details?.documentsProcessed || 0), 0),
        avgSyncTime: this.calculateAvgSyncTime(connectorSyncs),
        errorRate: this.calculateErrorRate(syncLogs)
      };
    } catch (error) {
      this.logger.error('Failed to get integration stats:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        totalWebhooks: 0,
        successfulWebhooks: 0,
        documentsProcessed: 0,
        avgSyncTime: 0,
        errorRate: 0
      };
    }
  }

  private calculateAvgSyncTime(syncLogs: any[]): number {
    if (syncLogs.length === 0) return 0;
    
    const totalTime = syncLogs.reduce((sum, log) => {
      const startTime = new Date(log.details?.startTime);
      const endTime = new Date(log.details?.endTime);
      return sum + (endTime.getTime() - startTime.getTime());
    }, 0);

    return totalTime / syncLogs.length / 1000; // Convert to seconds
  }

  private calculateErrorRate(logs: any[]): number {
    if (logs.length === 0) return 0;
    
    const errorCount = logs.filter(log => 
      log.details?.status === 'failed' || log.details?.success === false
    ).length;

    return (errorCount / logs.length) * 100;
  }

  private async getConnector(connectorId: string): Promise<IntegrationConnector | null> {
    const connectors = await this.getConnectors();
    return connectors.find(c => c.id === connectorId) || null;
  }
}