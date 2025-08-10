import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MailTrackingEvent {
  id: string;
  messageId: string;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'replied';
  timestamp: Date;
  recipient: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  metadata?: any;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  attempts: number;
  nextRetry?: Date;
}

export interface ReadReceipt {
  messageId: string;
  recipient: string;
  readAt: Date;
  userAgent: string;
  ipAddress: string;
  location?: string;
}

export interface ResponseTracking {
  messageId: string;
  originalSubject: string;
  responses: {
    id: string;
    from: string;
    subject: string;
    receivedAt: Date;
    isAutoReply: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }[];
  responseRate: number;
  avgResponseTime: number; // in hours
}

@Injectable()
export class MailTrackingService {
  private readonly logger = new Logger(MailTrackingService.name);

  constructor(private prisma: PrismaService) {}

  // === DELIVERY CONFIRMATIONS ===
  async trackDelivery(messageId: string, recipient: string, status: string, metadata?: any): Promise<void> {
    try {
      const event: MailTrackingEvent = {
        id: `event_${Date.now()}`,
        messageId,
        eventType: status as any,
        timestamp: new Date(),
        recipient,
        metadata
      };

      await this.storeTrackingEvent(event);
      await this.updateDeliveryStatus(messageId, status, metadata);

      this.logger.log(`Delivery tracked: ${messageId} - ${status} for ${recipient}`);
    } catch (error) {
      this.logger.error('Failed to track delivery:', error);
    }
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null> {
    try {
      // Mock delivery status - in production would query database
      const mockStatus: DeliveryStatus = {
        messageId,
        status: 'delivered',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        attempts: 1
      };

      return mockStatus;
    } catch (error) {
      this.logger.error('Failed to get delivery status:', error);
      return null;
    }
  }

  async getDeliveryReport(messageIds: string[]): Promise<{ [messageId: string]: DeliveryStatus }> {
    try {
      const report: { [messageId: string]: DeliveryStatus } = {};
      
      for (const messageId of messageIds) {
        const status = await this.getDeliveryStatus(messageId);
        if (status) {
          report[messageId] = status;
        }
      }

      return report;
    } catch (error) {
      this.logger.error('Failed to get delivery report:', error);
      return {};
    }
  }

  // === READ RECEIPTS ===
  async trackEmailOpen(messageId: string, recipient: string, userAgent: string, ipAddress: string): Promise<void> {
    try {
      const location = await this.getLocationFromIP(ipAddress);
      
      const event: MailTrackingEvent = {
        id: `event_${Date.now()}`,
        messageId,
        eventType: 'opened',
        timestamp: new Date(),
        recipient,
        userAgent,
        ipAddress,
        location
      };

      await this.storeTrackingEvent(event);

      const readReceipt: ReadReceipt = {
        messageId,
        recipient,
        readAt: new Date(),
        userAgent,
        ipAddress,
        location
      };

      await this.storeReadReceipt(readReceipt);

      this.logger.log(`Email opened: ${messageId} by ${recipient}`);
    } catch (error) {
      this.logger.error('Failed to track email open:', error);
    }
  }

  async getReadReceipts(messageId: string): Promise<ReadReceipt[]> {
    try {
      // Mock read receipts - in production would query database
      const mockReceipts: ReadReceipt[] = [
        {
          messageId,
          recipient: 'client.abc@email.com',
          readAt: new Date(Date.now() - 30 * 60 * 1000),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ipAddress: '192.168.1.100',
          location: 'Paris, France'
        }
      ];

      return mockReceipts;
    } catch (error) {
      this.logger.error('Failed to get read receipts:', error);
      return [];
    }
  }

  async getReadStatistics(messageIds: string[]): Promise<any> {
    try {
      let totalSent = messageIds.length;
      let totalOpened = 0;
      let uniqueOpens = 0;
      const opensByRecipient: { [recipient: string]: number } = {};

      for (const messageId of messageIds) {
        const receipts = await this.getReadReceipts(messageId);
        if (receipts.length > 0) {
          uniqueOpens++;
          totalOpened += receipts.length;
          
          receipts.forEach(receipt => {
            opensByRecipient[receipt.recipient] = (opensByRecipient[receipt.recipient] || 0) + 1;
          });
        }
      }

      return {
        totalSent,
        totalOpened,
        uniqueOpens,
        openRate: totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0,
        avgOpensPerMessage: totalSent > 0 ? totalOpened / totalSent : 0,
        topRecipients: Object.entries(opensByRecipient)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([recipient, opens]) => ({ recipient, opens }))
      };
    } catch (error) {
      this.logger.error('Failed to get read statistics:', error);
      return {
        totalSent: 0,
        totalOpened: 0,
        uniqueOpens: 0,
        openRate: 0,
        avgOpensPerMessage: 0,
        topRecipients: []
      };
    }
  }

  // === RESPONSE TRACKING ===
  async trackResponse(originalMessageId: string, responseData: any): Promise<void> {
    try {
      const response = {
        id: `response_${Date.now()}`,
        from: responseData.from,
        subject: responseData.subject,
        receivedAt: new Date(),
        isAutoReply: this.detectAutoReply(responseData),
        sentiment: await this.analyzeSentiment(responseData.body)
      };

      await this.storeResponse(originalMessageId, response);

      const event: MailTrackingEvent = {
        id: `event_${Date.now()}`,
        messageId: originalMessageId,
        eventType: 'replied',
        timestamp: new Date(),
        recipient: responseData.from,
        metadata: { responseId: response.id }
      };

      await this.storeTrackingEvent(event);

      this.logger.log(`Response tracked: ${originalMessageId} from ${responseData.from}`);
    } catch (error) {
      this.logger.error('Failed to track response:', error);
    }
  }

  async getResponseTracking(messageId: string): Promise<ResponseTracking | null> {
    try {
      // Mock response tracking - in production would query database
      const mockTracking: ResponseTracking = {
        messageId,
        originalSubject: 'Demande de remboursement',
        responses: [
          {
            id: 'response_001',
            from: 'client.abc@email.com',
            subject: 'Re: Demande de remboursement',
            receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isAutoReply: false,
            sentiment: 'positive'
          }
        ],
        responseRate: 0.8,
        avgResponseTime: 4.5
      };

      return mockTracking;
    } catch (error) {
      this.logger.error('Failed to get response tracking:', error);
      return null;
    }
  }

  async getResponseAnalytics(messageIds: string[]): Promise<any> {
    try {
      let totalMessages = messageIds.length;
      let totalResponses = 0;
      let totalResponseTime = 0;
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

      for (const messageId of messageIds) {
        const tracking = await this.getResponseTracking(messageId);
        if (tracking && tracking.responses.length > 0) {
          totalResponses += tracking.responses.length;
          totalResponseTime += tracking.avgResponseTime;
          
          tracking.responses.forEach(response => {
            if (response.sentiment) {
              sentimentCounts[response.sentiment]++;
            }
          });
        }
      }

      return {
        totalMessages,
        totalResponses,
        responseRate: totalMessages > 0 ? (totalResponses / totalMessages) * 100 : 0,
        avgResponseTime: totalResponses > 0 ? totalResponseTime / totalResponses : 0,
        sentimentDistribution: sentimentCounts,
        autoReplyRate: Math.random() * 20 // Mock auto-reply rate
      };
    } catch (error) {
      this.logger.error('Failed to get response analytics:', error);
      return {
        totalMessages: 0,
        totalResponses: 0,
        responseRate: 0,
        avgResponseTime: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        autoReplyRate: 0
      };
    }
  }

  // === LINK TRACKING ===
  async trackLinkClick(messageId: string, recipient: string, linkUrl: string, userAgent: string, ipAddress: string): Promise<void> {
    try {
      const location = await this.getLocationFromIP(ipAddress);
      
      const event: MailTrackingEvent = {
        id: `event_${Date.now()}`,
        messageId,
        eventType: 'clicked',
        timestamp: new Date(),
        recipient,
        userAgent,
        ipAddress,
        location,
        metadata: { linkUrl }
      };

      await this.storeTrackingEvent(event);

      this.logger.log(`Link clicked: ${linkUrl} in ${messageId} by ${recipient}`);
    } catch (error) {
      this.logger.error('Failed to track link click:', error);
    }
  }

  async getLinkClickStats(messageId: string): Promise<any> {
    try {
      // Mock link click stats
      return {
        messageId,
        totalClicks: Math.floor(Math.random() * 20) + 5,
        uniqueClicks: Math.floor(Math.random() * 15) + 3,
        clicksByLink: [
          { url: 'https://company.com/remboursement', clicks: 12 },
          { url: 'https://company.com/contact', clicks: 8 },
          { url: 'https://company.com/faq', clicks: 5 }
        ],
        clicksByTime: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          clicks: Math.floor(Math.random() * 3)
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get link click stats:', error);
      return {
        messageId,
        totalClicks: 0,
        uniqueClicks: 0,
        clicksByLink: [],
        clicksByTime: []
      };
    }
  }

  // === COMPREHENSIVE TRACKING REPORT ===
  async getComprehensiveTrackingReport(messageIds: string[]): Promise<any> {
    try {
      const [deliveryReport, readStats, responseAnalytics] = await Promise.all([
        this.getDeliveryReport(messageIds),
        this.getReadStatistics(messageIds),
        this.getResponseAnalytics(messageIds)
      ]);

      return {
        summary: {
          totalMessages: messageIds.length,
          deliveryRate: this.calculateDeliveryRate(deliveryReport),
          openRate: readStats.openRate,
          responseRate: responseAnalytics.responseRate,
          avgResponseTime: responseAnalytics.avgResponseTime
        },
        delivery: deliveryReport,
        engagement: readStats,
        responses: responseAnalytics,
        timeline: await this.getEngagementTimeline(messageIds)
      };
    } catch (error) {
      this.logger.error('Failed to get comprehensive tracking report:', error);
      return {
        summary: {
          totalMessages: 0,
          deliveryRate: 0,
          openRate: 0,
          responseRate: 0,
          avgResponseTime: 0
        },
        delivery: {},
        engagement: {},
        responses: {},
        timeline: []
      };
    }
  }

  // === HELPER METHODS ===
  private async storeTrackingEvent(event: MailTrackingEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'MAIL_TRACKING_EVENT',
          details: event
        }
      });
    } catch (error) {
      this.logger.error('Failed to store tracking event:', error);
    }
  }

  private async updateDeliveryStatus(messageId: string, status: string, metadata?: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'DELIVERY_STATUS_UPDATED',
          details: { messageId, status, metadata, timestamp: new Date().toISOString() }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update delivery status:', error);
    }
  }

  private async storeReadReceipt(receipt: ReadReceipt): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'READ_RECEIPT_STORED',
          details: receipt
        }
      });
    } catch (error) {
      this.logger.error('Failed to store read receipt:', error);
    }
  }

  private async storeResponse(messageId: string, response: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'RESPONSE_TRACKED',
          details: { messageId, response }
        }
      });
    } catch (error) {
      this.logger.error('Failed to store response:', error);
    }
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    // Mock IP geolocation - in production would use a geolocation service
    const locations = ['Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private detectAutoReply(responseData: any): boolean {
    const autoReplyIndicators = [
      'auto-reply',
      'automatic reply',
      'out of office',
      'vacation',
      'absence',
      'réponse automatique',
      'absent du bureau'
    ];

    const subject = responseData.subject?.toLowerCase() || '';
    const body = responseData.body?.toLowerCase() || '';

    return autoReplyIndicators.some(indicator => 
      subject.includes(indicator) || body.includes(indicator)
    );
  }

  private async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Mock sentiment analysis - in production would use AI service
    const positiveWords = ['merci', 'excellent', 'parfait', 'satisfait', 'content'];
    const negativeWords = ['problème', 'erreur', 'mécontent', 'déçu', 'insatisfait'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateDeliveryRate(deliveryReport: { [messageId: string]: DeliveryStatus }): number {
    const statuses = Object.values(deliveryReport);
    if (statuses.length === 0) return 0;

    const delivered = statuses.filter(s => s.status === 'delivered').length;
    return (delivered / statuses.length) * 100;
  }

  private async getEngagementTimeline(messageIds: string[]): Promise<any[]> {
    // Mock engagement timeline
    const timeline: any[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      timeline.push({
        date: date.toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 20) + 5,
        delivered: Math.floor(Math.random() * 18) + 4,
        opened: Math.floor(Math.random() * 15) + 2,
        clicked: Math.floor(Math.random() * 8) + 1,
        replied: Math.floor(Math.random() * 5)
      });
    }

    return timeline.reverse();
  }
}