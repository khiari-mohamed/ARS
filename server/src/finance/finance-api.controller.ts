import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

// Extract user from authenticated request
function getUserFromRequest(req: any) {
  if (req.user) {
    return req.user;
  }
  
  return {
    id: 'system-user',
    email: 'system@ars.com',
    fullName: 'System User',
    role: 'FINANCE',
    active: true
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceApiController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('generate-ov')
  async generateOV(@Body() generateOVDto: {
    bordereauIds: string[];
    donneurOrdre?: string;
    format: 'PDF' | 'TXT' | 'BOTH';
    includeDetails: boolean;
  }, @Req() req: any) {
    console.log('📡 Finance API Controller: Received OV generation request');
    console.log('📡 Request body:', JSON.stringify(generateOVDto, null, 2));
    try {
      const result = await this.financeService.generateOV(generateOVDto);
      console.log('✅ Finance API Controller: OV generated successfully');
      return result;
    } catch (error) {
      console.error('❌ Finance API Controller: Error generating OV:', error);
      throw error;
    }
  }
}