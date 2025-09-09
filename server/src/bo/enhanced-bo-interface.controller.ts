import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { EnhancedBOInterfaceService, BOManualEntryData, BOBatchData } from './enhanced-bo-interface.service';

@Controller('bo-interface')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnhancedBOInterfaceController {
  constructor(private readonly boService: EnhancedBOInterfaceService) {}

  @Post('manual-entry')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE)
  async createManualEntry(
    @Body() data: BOManualEntryData,
    @Request() req: any
  ) {
    return this.boService.createManualEntry(data, req.user.id);
  }

  @Get('client/:clientId/autofill')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE)
  async getClientAutoFillData(@Param('clientId') clientId: string) {
    return this.boService.getClientAutoFillData(clientId);
  }

  @Post('batch-entry')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE)
  async createBatchEntry(
    @Body() data: BOBatchData,
    @Request() req: any
  ) {
    return this.boService.createBatchEntry(data, req.user.id);
  }

  @Get('dashboard')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBODashboard(@Request() req: any) {
    return this.boService.getBODashboard(req.user.id);
  }

  @Get('performance')
  @Roles(UserRole.BO, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getBOPerformanceMetrics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ) {
    return this.boService.getBOPerformanceMetrics(period);
  }
}