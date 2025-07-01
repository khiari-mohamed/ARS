import { Controller, Get, Query, Req, Res, Post, Body } from '@nestjs/common';
import { OutlookService } from './outlook.service';

@Controller('outlook')
export class OutlookController {
  constructor(private readonly outlook: OutlookService) {}

  // Step 1: Get OAuth2 URL
  @Get('auth-url')
  getAuthUrl(@Query('redirectUri') redirectUri: string) {
    return { url: this.outlook.getAuthUrl(redirectUri) };
  }

  // Step 2: Exchange code for tokens
  @Post('exchange')
  async exchangeCode(@Body() body: { code: string; redirectUri: string }) {
    return this.outlook.exchangeCodeForToken(body.code, body.redirectUri);
  }

  // Step 3: Check connection status
  @Get('status')
  status() {
    return { connected: this.outlook.isConnected() };
  }

  // Step 4: Test send email (admin only)
  @Post('send-test')
  async sendTest(@Body() body: { to: string; subject: string; text: string }) {
    return this.outlook.sendMail(body.to, body.subject, body.text);
  }
}
