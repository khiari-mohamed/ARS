import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gnet.tn',
        port: 465,
        secure: true, // SSL
        auth: {
          user: 'noreply@arstunisia.com',
          pass: 'NR*ars2025**##'
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      this.logger.log('SMTP transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SMTP transporter:', error.message);
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.warn('SMTP transporter not initialized, skipping email');
        return;
      }

      const mailOptions = {
        from: 'noreply@arstunisia.com',
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
    // Placeholder for OAuth implementation
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=placeholder&redirect_uri=${redirectUri}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
    // Placeholder for OAuth implementation
    return { access_token: 'placeholder', expires_in: 3600 };
  }
}