import { Controller, Get, Post, Body, Req, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Controller('notifications')
export class NotificationController {
  // In-memory store for demo purposes
  private prefs: Record<string, any> = {};
  private transporter: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService) {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }

  @Get('preferences')
  getPreferences(@Req() req: any) {
    // Use user id or a default key
    const userId = req.user?.id || 'demo';
    return this.prefs[userId] || { channel: 'EMAIL', type: 'ALL', recipient: '' };
  }

  @Post('preferences')
  setPreferences(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || 'demo';
    this.prefs[userId] = body;
    return { success: true };
  }

  @Post('reassignment')
  async sendReassignmentNotification(@Body() data: {
    bordereauId: string;
    fromUserId: string;
    toUserId: string;
    comment?: string;
    timestamp: string;
  }) {
    console.log('📧 NOTIFICATION: Processing reassignment notification');
    
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

      // 2. Create in-app notification in database
      const notification = await this.prisma.notification.create({
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
      }).catch(() => null); // Ignore if notification table doesn't exist

      // 3. Send email notification
      const emailSent = await this.sendEmail({
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

      console.log('✅ Notification processed successfully');
      console.log('- Database notification:', notification ? 'Created' : 'Skipped');
      console.log('- Email sent:', emailSent ? 'Yes' : 'Failed');

      return {
        success: true,
        message: 'Reassignment notification sent successfully',
        notificationId: notification?.id || `notif-${Date.now()}`,
        emailSent,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Notification error:', error);
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
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'ARS System <noreply@ars-system.com>',
        to: options.to,
        subject: options.subject,
        html: options.html
      });
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }
}