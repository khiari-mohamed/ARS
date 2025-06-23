import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  // In production, replace this with real email, push, or in-app notification logic
  async notify(event: string, payload: any) {
    // For now, just log to console
    console.log(`[NOTIFY][${event}]`, payload);
  }
}
