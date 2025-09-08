import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { EnhancedCorbeilleService } from './enhanced-corbeille.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow/enhanced-corbeille')
export class EnhancedCorbeilleController {
  constructor(private readonly corbeilleService: EnhancedCorbeilleService) {}

  @Get('chef/:userId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getChefCorbeille(@Param('userId') userId: string) {
    return this.corbeilleService.getChefCorbeille(userId);
  }

  @Get('gestionnaire/:userId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getGestionnaireCorbeille(@Param('userId') userId: string) {
    return this.corbeilleService.getGestionnaireCorbeille(userId);
  }

  @Post('bulk-assign')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async bulkAssignBordereaux(
    @Body() data: {
      bordereauIds: string[];
      assigneeId: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!data.bordereauIds || !data.assigneeId) {
      throw new BadRequestException('Missing required fields');
    }

    return this.corbeilleService.bulkAssignBordereaux(
      data.bordereauIds,
      data.assigneeId,
      userId
    );
  }

  @Post('auto-assign-by-client')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async autoAssignByClient(
    @Body() data: { bordereauIds: string[] },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!data.bordereauIds) {
      throw new BadRequestException('Missing bordereauIds');
    }

    return this.corbeilleService.autoAssignByClient(data.bordereauIds, userId);
  }

  @Post('auto-assign-by-type')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async autoAssignByType(
    @Body() data: {
      bordereauIds: string[];
      documentType: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!data.bordereauIds || !data.documentType) {
      throw new BadRequestException('Missing required fields');
    }

    return this.corbeilleService.autoAssignByType(
      data.bordereauIds,
      data.documentType,
      userId
    );
  }

  @Post('return-to-chef')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async returnToChef(
    @Body() data: {
      bordereauId: string;
      reason: string;
    },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!data.bordereauId || !data.reason) {
      throw new BadRequestException('Missing required fields');
    }

    return this.corbeilleService.returnToChef(
      data.bordereauId,
      userId,
      data.reason
    );
  }

  @Post('mark-processed')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async markAsProcessed(
    @Body() data: { bordereauId: string },
    @Req() req: Request
  ) {
    const user = req['user'] as any;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!data.bordereauId) {
      throw new BadRequestException('Missing bordereauId');
    }

    return this.corbeilleService.markBordereauAsProcessed(
      data.bordereauId,
      userId
    );
  }
}