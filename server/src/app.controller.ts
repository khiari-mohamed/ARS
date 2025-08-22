import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  getHello(): string {
    console.log('🔥 ROOT ENDPOINT HIT!');
    return this.appService.getHello();
  }

  @Get('test')
  getTest(): any {
    console.log('🔥 TEST ENDPOINT HIT!');
    return { message: 'Test endpoint working', timestamp: new Date().toISOString() };
  }

  @Post('feedback')
  async submitFeedback(@Body() body: { message: string; page: string }) {
    console.log('🔥 FEEDBACK ENDPOINT HIT!', body);
    try {
      await this.prisma.feedback.create({
        data: {
          userId: 'debug-user',
          message: body.message,
          page: body.page,
        },
      });
      console.log('✅ Feedback saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Feedback error:', error);
      return { success: false, error: 'Failed to save feedback' };
    }
  }
}
