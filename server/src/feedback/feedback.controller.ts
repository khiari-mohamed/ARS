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

    // Validate input (optional, but recommended)
    if (!message || !page) {
      throw new BadRequestException('Message and page are required');
    }

    await this.prisma.feedback.create({
      data: {
        userId: req.user.id,
        message,
        page,
      },
    });
    return { success: true };
  }
}
