import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OutlookService { // Updated for TypeScript compilation
  private readonly logger = new Logger(OutlookService.name);
  private transporter: nodemailer.Transporter | null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.warn('⚠️ SMTP credentials not configured - email notifications disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gnet.tn',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true' || true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await this.transporter.verify();
      this.logger.log('✅ SMTP transporter initialized and verified successfully');
    } catch (error) {
      this.logger.warn(`⚠️ SMTP initialization failed: ${error.message} - Email notifications will be disabled`);
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.warn('SMTP transporter not initialized, skipping email');
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@arstunisia.com',
        to,
        subject,
        text,
        html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendTuniclaimSyncNotification(
    to: string, 
    syncResult: { imported: number; errors: number; duration?: string }
  ): Promise<void> {
    const subject = syncResult.errors > 0 
      ? 'MY TUNICLAIM - Synchronisation avec erreurs'
      : 'MY TUNICLAIM - Synchronisation réussie';

    const text = `
Synchronisation MY TUNICLAIM terminée

Résultats:
- Bordereaux importés: ${syncResult.imported}
- Erreurs: ${syncResult.errors}
${syncResult.duration ? `- Durée: ${syncResult.duration}` : ''}

Timestamp: ${new Date().toLocaleString('fr-FR')}

${syncResult.errors > 0 ? 'Veuillez vérifier les logs pour plus de détails.' : ''}
    `.trim();

    await this.sendMail(to, subject, text);
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      
      await this.transporter.verify();
      this.logger.log('SMTP connection test successful');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection test failed:', error.message);
      return false;
    }
  }

  isConnected(): boolean {
    return !!this.transporter;
  }

  getAuthUrl(redirectUri: string): string {
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=placeholder&redirect_uri=${redirectUri}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    return { access_token: 'placeholder', expires_in: 3600 };
  }
}