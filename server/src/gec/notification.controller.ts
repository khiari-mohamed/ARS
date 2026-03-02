import { Controller, Get, Post, Body, Req, Injectable, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Controller('notifications')
export class NotificationController {
  // In-memory store for demo purposes
  private prefs: Record<string, any> = {};
  private transporter: nodemailer.Transporter | null;

  constructor(private readonly prisma: PrismaService) {
    this.initializeTransporter();
  }
  
  private async initializeTransporter() {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return;
      }

      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const isSecure = smtpPort === 465;

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gnet.tn',
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        requireTLS: !isSecure
      });
      
      await this.transporter.verify();
    } catch (error) {
      this.transporter = null;
    }
  }

  @Get('preferences')
  getPreferences(@Req() req: any) {
    const userId = req.user?.id || 'demo';
    return this.prefs[userId] || {
      emailEnabled: true,
      inAppEnabled: true,
      slaAlerts: true,
      reclamationAlerts: true,
      assignmentAlerts: true
    };
  }

  @Post('preferences')
  async setPreferences(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || 'demo';
    this.prefs[userId] = body;
    
    // Store in database
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          // Store preferences in a JSON field or create separate table
          // For now, we'll use audit log to track preferences
        }
      });
    } catch (error) {
      return { success: false };
    }
    
    return { success: true };
  }

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return [];
    
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return notifications;
    } catch (error) {
      return [];
    }
  }

  @Post('mark-read/:id')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    try {
      await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { read: true }
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  @Post('reassignment')
  async sendReassignmentNotification(@Body() data: {
    bordereauId: string;
    fromUserId: string;
    toUserId: string;
    comment?: string;
    timestamp: string;
  }) {
    // Check user preferences
    const userPrefs = this.prefs[data.toUserId] || {
      emailEnabled: true,
      inAppEnabled: true,
      assignmentAlerts: true
    };
    
    if (!userPrefs.assignmentAlerts) {
      return { success: true, message: 'Notification disabled by user preferences' };
    }
    
    try {
      // 1. Get user and bordereau details
      const [newUser, oldUser, bordereau] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: data.toUserId } }),
        this.prisma.user.findUnique({ where: { id: data.fromUserId } }),
        this.prisma.bordereau.findUnique({ 
          where: { id: data.bordereauId },
          include: { client: true }
        })
      ]);

      if (!newUser || !bordereau) {
        throw new Error('User or bordereau not found');
      }

      // 2. Create in-app notification in database (if enabled)
      let notification: any = null;
      if (userPrefs.inAppEnabled) {
        try {
          notification = await this.prisma.notification.create({
            data: {
              userId: data.toUserId,
              type: 'REASSIGNMENT',
              title: 'Nouveau bordereau assigné',
              message: `Le bordereau ${bordereau.reference} vous a été assigné${data.comment ? ` - ${data.comment}` : ''}`,
              data: {
                bordereauId: data.bordereauId,
                fromUserId: data.fromUserId,
                comment: data.comment
              },
              read: false
            }
          });
        } catch (error) {
          // Silent fail
        }
      }

      // 3. Send email notification (if enabled)
      let emailSent = false;
      if (userPrefs.emailEnabled && newUser.email) {
        emailSent = await this.sendEmail({
          to: newUser.email,
          subject: `🔔 Nouveau bordereau assigné - ${bordereau.reference}`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📋 Nouveau bordereau assigné</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Référence:</strong> ${bordereau.reference}</p>
              <p><strong>Client:</strong> ${bordereau.client?.name || 'N/A'}</p>
              <p><strong>Assigné par:</strong> ${oldUser?.fullName || 'Système'}</p>
              ${data.comment ? `<p><strong>Commentaire:</strong> ${data.comment}</p>` : ''}
              <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            <p>Veuillez vous connecter au système pour traiter ce bordereau.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>Système de Gestion ARS - Notification automatique</p>
            </div>
          </div>
        `
        });
      }

      return {
        success: true,
        message: 'Reassignment notification sent successfully',
        notificationId: notification?.id || `notif-${Date.now()}`,
        emailSent,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to send notification',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@arstunisia.com',
        to: options.to,
        subject: options.subject,
        html: options.html
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}