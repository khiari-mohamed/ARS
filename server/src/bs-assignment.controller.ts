import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { UserRole } from './auth/user-role.enum';
import { AssignmentEntityType, BsAssignmentService } from './bs-assignment.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('bs-assignment')
export class BsAssignmentController {
  constructor(private readonly bsAssignmentService: BsAssignmentService) {}

  @Get('eligible-users')
  async getEligibleUsers(@Query('excludeUserId') excludeUserId?: string) {
    return this.bsAssignmentService.getEligibleUsers(excludeUserId);
  }

  @Get('dossiers')
  async getDossiers(@Query() query: any) {
    return this.bsAssignmentService.getDossiers(query);
  }

  @Post('reassign')
  async reassign(@Body() body: {
    entityType?: AssignmentEntityType;
    bulletinSoinIds: string[];
    targetUserId: string;
    performedByUserId?: string;
    reason?: string;
  }, @Req() req: Request & { user?: { id?: string; userId?: string } }) {
    return this.bsAssignmentService.reassign({
      ...body,
      performedByUserId: req.user?.id || req.user?.userId || body.performedByUserId || ''
    });
  }

  @Get('history/:bulletinSoinId')
  async getHistory(@Param('bulletinSoinId') bulletinSoinId: string) {
    return this.bsAssignmentService.getHistory(bulletinSoinId);
  }
}