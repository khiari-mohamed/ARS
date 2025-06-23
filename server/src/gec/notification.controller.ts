import { Controller, Get, Post, Body, Req } from '@nestjs/common';

@Controller('notifications')
export class NotificationController {
  // In-memory store for demo purposes
  private prefs: Record<string, any> = {};

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
}