import { Injectable } from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure your SMTP or Mailgun/SendGrid here
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async notify(event: string, payload: any) {
    // Send email notification if recipient is present
    if (payload?.user?.email) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@example.com',
          to: payload.user.email,
          subject: `[GED] Notification: ${event}`,
          text: JSON.stringify(payload, null, 2),
        });
      } catch (err) {
        console.error(`[NOTIFY][${event}] Email failed:`, err);
      }
    }
    // Always log to console for traceability
    console.log(`[NOTIFY][${event}]`, payload);
  }
}
