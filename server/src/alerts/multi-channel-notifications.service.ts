import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'slack' | 'teams' | 'webhook';
  config: any;
  active: boolean;
  priority: number;
  rateLimits: RateLimit;
}

export interface RateLimit {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  variables: string[];
  active: boolean;
}

export interface NotificationRequest {
  recipients: string[];
  channels: string[];
  templateId?: string;
  subject?: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  variables?: { [key: string]: any };
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  filename: string;
  contentType: string;
  data: string; // base64
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'failed' | 'queued' | 'rate_limited';
  channel: string;
  recipient: string;
  sentAt?: Date;
  error?: string;
  deliveryStatus?: 'delivered' | 'bounced' | 'opened' | 'clicked';
}

@Injectable()
export class MultiChannelNotificationsService {
  private readonly logger = new Logger(MultiChannelNotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // === CHANNEL MANAGEMENT ===
  async getNotificationChannels(): Promise<NotificationChannel[]> {
    try {
      return [
        {
          id: 'email_primary',
          name: 'Email Principal',
          type: 'email',
          config: {
            smtp: {
              host: 'smtp.company.com',
              port: 587,
              secure: false,
              auth: {
                user: 'alerts@company.com',
                pass: '***'
              }
            },
            from: 'ARS Alerts <alerts@company.com>'
          },
          active: true,
          priority: 1,
          rateLimits: {
            maxPerMinute: 60,
            maxPerHour: 1000,
            maxPerDay: 10000
          }
        },
        {
          id: 'sms_primary',
          name: 'SMS Principal',
          type: 'sms',
          config: {
            provider: 'twilio',
            accountSid: '***',
            authToken: '***',
            from: '+33123456789'
          },
          active: true,
          priority: 2,
          rateLimits: {
            maxPerMinute: 10,
            maxPerHour: 100,
            maxPerDay: 500
          }
        },
        {
          id: 'push_mobile',
          name: 'Push Mobile',
          type: 'push',
          config: {
            fcm: {
              serverKey: '***',
              senderId: '123456789'
            },
            apns: {
              keyId: '***',
              teamId: '***',
              bundleId: 'com.company.ars'
            }
          },
          active: true,
          priority: 3,
          rateLimits: {
            maxPerMinute: 100,
            maxPerHour: 2000,
            maxPerDay: 20000
          }
        },
        {
          id: 'slack_alerts',
          name: 'Slack Alerts',
          type: 'slack',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/***',
            botToken: 'xoxb-***',
            defaultChannel: '#alerts'
          },
          active: true,
          priority: 4,
          rateLimits: {
            maxPerMinute: 30,
            maxPerHour: 500,
            maxPerDay: 5000
          }
        },
        {
          id: 'teams_notifications',
          name: 'Microsoft Teams',
          type: 'teams',
          config: {
            webhookUrl: 'https://company.webhook.office.com/***',
            tenantId: '***',
            clientId: '***'
          },
          active: true,
          priority: 5,
          rateLimits: {
            maxPerMinute: 20,
            maxPerHour: 300,
            maxPerDay: 2000
          }
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get notification channels:', error);
      return [];
    }
  }

  async createNotificationChannel(channel: Omit<NotificationChannel, 'id'>): Promise<NotificationChannel> {
    try {
      const newChannel: NotificationChannel = {
        id: `channel_${Date.now()}`,
        ...channel
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'NOTIFICATION_CHANNEL_CREATED',
          details: {
            channelId: newChannel.id,
            name: newChannel.name,
            type: newChannel.type
          }
        }
      });

      return newChannel;
    } catch (error) {
      this.logger.error('Failed to create notification channel:', error);
      throw error;
    }
  }

  async testNotificationChannel(channelId: string): Promise<{ success: boolean; message: string }> {
    try {
      const channel = await this.getNotificationChannel(channelId);
      if (!channel) {
        return { success: false, message: 'Channel not found' };
      }

      // Mock channel test
      await new Promise(resolve => setTimeout(resolve, 1000));
      const success = Math.random() > 0.1; // 90% success rate

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'NOTIFICATION_CHANNEL_TESTED',
          details: {
            channelId,
            success,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success,
        message: success ? 'Channel test successful' : 'Channel test failed - check configuration'
      };
    } catch (error) {
      this.logger.error('Channel test failed:', error);
      return { success: false, message: 'Test failed with error' };
    }
  }

  // === NOTIFICATION SENDING ===
  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channelId of request.channels) {
      const channel = await this.getNotificationChannel(channelId);
      if (!channel || !channel.active) {
        results.push({
          id: `result_${Date.now()}`,
          status: 'failed',
          channel: channelId,
          recipient: 'N/A',
          error: 'Channel not found or inactive'
        });
        continue;
      }

      for (const recipient of request.recipients) {
        try {
          // Check rate limits
          if (await this.isRateLimited(channelId)) {
            results.push({
              id: `result_${Date.now()}`,
              status: 'rate_limited',
              channel: channelId,
              recipient,
              error: 'Rate limit exceeded'
            });
            continue;
          }

          const result = await this.sendToChannel(channel, recipient, request);
          results.push(result);
        } catch (error) {
          results.push({
            id: `result_${Date.now()}`,
            status: 'failed',
            channel: channelId,
            recipient,
            error: error.message
          });
        }
      }
    }

    await this.logNotificationBatch(request, results);
    return results;
  }

  private async sendToChannel(
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      switch (channel.type) {
        case 'email':
          return await this.sendEmail(resultId, channel, recipient, request);
        case 'sms':
          return await this.sendSMS(resultId, channel, recipient, request);
        case 'push':
          return await this.sendPushNotification(resultId, channel, recipient, request);
        case 'slack':
          return await this.sendSlackMessage(resultId, channel, recipient, request);
        case 'teams':
          return await this.sendTeamsMessage(resultId, channel, recipient, request);
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }
    } catch (error) {
      return {
        id: resultId,
        status: 'failed',
        channel: channel.id,
        recipient,
        error: error.message
      };
    }
  }

  private async sendEmail(
    resultId: string, 
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // Mock email sending
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('SMTP connection failed');
    }

    return {
      id: resultId,
      status: 'sent',
      channel: channel.id,
      recipient,
      sentAt: new Date(),
      deliveryStatus: 'delivered'
    };
  }

  private async sendSMS(
    resultId: string, 
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // Mock SMS sending
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (Math.random() < 0.03) { // 3% failure rate
      throw new Error('SMS delivery failed');
    }

    return {
      id: resultId,
      status: 'sent',
      channel: channel.id,
      recipient,
      sentAt: new Date(),
      deliveryStatus: 'delivered'
    };
  }

  private async sendPushNotification(
    resultId: string, 
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // Mock push notification
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Push notification failed');
    }

    return {
      id: resultId,
      status: 'sent',
      channel: channel.id,
      recipient,
      sentAt: new Date(),
      deliveryStatus: 'delivered'
    };
  }

  private async sendSlackMessage(
    resultId: string, 
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // Mock Slack message
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (Math.random() < 0.01) { // 1% failure rate
      throw new Error('Slack API error');
    }

    return {
      id: resultId,
      status: 'sent',
      channel: channel.id,
      recipient,
      sentAt: new Date(),
      deliveryStatus: 'delivered'
    };
  }

  private async sendTeamsMessage(
    resultId: string, 
    channel: NotificationChannel, 
    recipient: string, 
    request: NotificationRequest
  ): Promise<NotificationResult> {
    // Mock Teams message
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Teams webhook error');
    }

    return {
      id: resultId,
      status: 'sent',
      channel: channel.id,
      recipient,
      sentAt: new Date(),
      deliveryStatus: 'delivered'
    };
  }

  // === TEMPLATES MANAGEMENT ===
  async getNotificationTemplates(channelType?: string): Promise<NotificationTemplate[]> {
    try {
      const templates = [
        {
          id: 'email_sla_breach',
          name: 'SLA Breach Alert',
          channel: 'email',
          subject: 'URGENT: SLA Breach Alert - {{alertType}}',
          body: `
            <h2>SLA Breach Alert</h2>
            <p>Alert Type: {{alertType}}</p>
            <p>Severity: {{severity}}</p>
            <p>Description: {{description}}</p>
            <p>Time: {{timestamp}}</p>
            <p>Action Required: {{actionRequired}}</p>
          `,
          variables: ['alertType', 'severity', 'description', 'timestamp', 'actionRequired'],
          active: true
        },
        {
          id: 'sms_critical_alert',
          name: 'Critical Alert SMS',
          channel: 'sms',
          body: 'CRITICAL: {{alertType}} - {{description}}. Action required immediately. Time: {{timestamp}}',
          variables: ['alertType', 'description', 'timestamp'],
          active: true
        },
        {
          id: 'slack_system_down',
          name: 'System Down Slack',
          channel: 'slack',
          body: `
            {
              "text": "🚨 System Down Alert",
              "attachments": [
                {
                  "color": "danger",
                  "fields": [
                    {"title": "System", "value": "{{systemName}}", "short": true},
                    {"title": "Duration", "value": "{{duration}}", "short": true},
                    {"title": "Impact", "value": "{{impact}}", "short": false}
                  ]
                }
              ]
            }
          `,
          variables: ['systemName', 'duration', 'impact'],
          active: true
        }
      ];

      return channelType ? templates.filter(t => t.channel === channelType) : templates;
    } catch (error) {
      this.logger.error('Failed to get notification templates:', error);
      return [];
    }
  }

  async renderTemplate(templateId: string, variables: { [key: string]: any }): Promise<{ subject?: string; body: string }> {
    try {
      const template = await this.getNotificationTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      let renderedSubject = template.subject;
      let renderedBody = template.body;

      // Simple template rendering
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        if (renderedSubject) {
          renderedSubject = renderedSubject.replace(regex, String(value));
        }
        renderedBody = renderedBody.replace(regex, String(value));
      });

      return {
        subject: renderedSubject,
        body: renderedBody
      };
    } catch (error) {
      this.logger.error('Failed to render template:', error);
      throw error;
    }
  }

  // === RATE LIMITING ===
  private async isRateLimited(channelId: string): Promise<boolean> {
    // Mock rate limiting check
    return Math.random() < 0.02; // 2% rate limited
  }

  private async updateRateLimitCounters(channelId: string): Promise<void> {
    // Mock rate limit counter update
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'RATE_LIMIT_UPDATED',
        details: { channelId, timestamp: new Date().toISOString() }
      }
    });
  }

  // === DELIVERY TRACKING ===
  async trackDeliveryStatus(notificationId: string, status: string, metadata?: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'NOTIFICATION_DELIVERY_TRACKED',
          details: {
            notificationId,
            status,
            metadata,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to track delivery status:', error);
    }
  }

  async getDeliveryStatistics(period = '24h'): Promise<any> {
    try {
      const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
      
      return {
        totalSent: Math.floor(Math.random() * 1000) + 500,
        delivered: Math.floor(Math.random() * 900) + 450,
        failed: Math.floor(Math.random() * 50) + 10,
        bounced: Math.floor(Math.random() * 30) + 5,
        opened: Math.floor(Math.random() * 400) + 200,
        clicked: Math.floor(Math.random() * 100) + 50,
        byChannel: {
          email: { sent: 450, delivered: 425, failed: 15, opened: 180 },
          sms: { sent: 200, delivered: 195, failed: 3 },
          push: { sent: 300, delivered: 285, failed: 8, opened: 120 },
          slack: { sent: 80, delivered: 78, failed: 1 },
          teams: { sent: 45, delivered: 43, failed: 1 }
        },
        period
      };
    } catch (error) {
      this.logger.error('Failed to get delivery statistics:', error);
      return {
        totalSent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        byChannel: {},
        period
      };
    }
  }

  // === HELPER METHODS ===
  private async getNotificationChannel(channelId: string): Promise<NotificationChannel | null> {
    const channels = await this.getNotificationChannels();
    return channels.find(c => c.id === channelId) || null;
  }

  private async getNotificationTemplate(templateId: string): Promise<NotificationTemplate | null> {
    const templates = await this.getNotificationTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  private async logNotificationBatch(request: NotificationRequest, results: NotificationResult[]): Promise<void> {
    try {
      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.filter(r => r.status === 'failed').length;

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'NOTIFICATION_BATCH_SENT',
          details: {
            totalRecipients: request.recipients.length,
            channels: request.channels,
            priority: request.priority,
            successCount,
            failureCount,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to log notification batch:', error);
    }
  }

  // === NOTIFICATION PREFERENCES ===
  async getUserNotificationPreferences(userId: string): Promise<any> {
    try {
      // Mock user preferences
      return {
        userId,
        channels: {
          email: { enabled: true, priority: ['urgent', 'high'] },
          sms: { enabled: true, priority: ['urgent'] },
          push: { enabled: true, priority: ['urgent', 'high', 'medium'] },
          slack: { enabled: false, priority: [] },
          teams: { enabled: true, priority: ['urgent', 'high'] }
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'Europe/Paris'
        },
        frequency: {
          maxPerHour: 10,
          maxPerDay: 50,
          digestMode: false
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user notification preferences:', error);
      return null;
    }
  }

  async updateUserNotificationPreferences(userId: string, preferences: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'NOTIFICATION_PREFERENCES_UPDATED',
          details: {
            preferences,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update user notification preferences:', error);
      throw error;
    }
  }
}