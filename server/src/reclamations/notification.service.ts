import { Injectable, Logger } from '@nestjs/common';
import { OutlookService } from '../integrations/outlook.service';
// import twilio from 'twilio'; // Uncomment if you want SMS support

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(private readonly outlook: OutlookService) {}

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await this.outlook.sendMail(to, subject, text);
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
