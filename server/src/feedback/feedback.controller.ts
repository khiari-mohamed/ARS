import { Controller, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackDto } from './feedback.dto'; // Import a DTO for type safety

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async submitFeedback(@Body() body: FeedbackDto, @Req() req: any) {
    const { message, page } = body;

    if (!message || !page) {
      throw new BadRequestException('Message and page are required');
    }

    try {
      // Create a dummy user if needed
      let userId = req.user?.id || req.user?.sub;
      
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        // Create anonymous user for feedback
        const anonymousUser = await this.prisma.user.create({
          data: {
            id: userId,
            email: 'anonymous@feedback.local',
            password: 'dummy',
            fullName: 'Anonymous User',
            role: 'ANONYMOUS'
          }
        });
        userId = anonymousUser.id;
      }
      
      await this.prisma.feedback.create({
        data: {
          userId: userId,
          message,
          page,
        },
      });
      
      return { success: true };
    } catch (error) {
      console.error('Feedback error:', error);
      throw new BadRequestException('Failed to save feedback');
    }
  }
}
