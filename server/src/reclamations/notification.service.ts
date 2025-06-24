import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
// import twilio from 'twilio'; // Uncomment if you want SMS support

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
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

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
      return false;
    }
  }

  // Optionally, add in-app notification or webhook logic here

  // Uncomment and configure for SMS support
  // async sendSms(to: string, message: string) {
  //   const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  //   try {
  //     await client.messages.create({
  //       body: message,
  //       from: process.env.TWILIO_FROM,
  //       to,
  //     });
  //     this.logger.log(`SMS sent to ${to}`);
  //     return true;
  //   } catch (err) {
  //     this.logger.error(`Failed to send SMS to ${to}: ${err}`);
  //     return false;
  //   }
  // }
}
