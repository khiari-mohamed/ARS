import { Injectable } from '@nestjs/common';
import { OutlookService } from '../integrations/outlook.service';

@Injectable()
export class NotificationService {
  constructor(private readonly outlook: OutlookService) {}

  async notify(event: string, payload: any) {
    // Send email notification if recipient is present
    if (payload?.user?.email) {
      try {
        await this.outlook.sendMail(
          payload.user.email,
          `[GED] Notification: ${event}`,
          JSON.stringify(payload, null, 2)
        );
      } catch (err) {
        console.error(`[NOTIFY][${event}] Email failed:`, err);
      }
    }
    // Always log to console for traceability
    console.log(`[NOTIFY][${event}]`, payload);
  }
}
