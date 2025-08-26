import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FinanceService } from './finance.service';
import { CreateVirementDto } from './dto/create-virement.dto';
import { ConfirmVirementDto } from './dto/confirm-virement.dto';
import { SearchVirementDto } from './dto/search-virement.dto';
import { CreateOVDto } from './dto/create-ov.dto';
import { UpdateOVStatusDto } from './dto/update-ov-status.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';
import { Express } from 'express';

// Extract user from authenticated request
function getUserFromRequest(req: any) {
  // In production, this should come from JWT token validation
  // For now, provide a fallback that works with the existing auth system
  if (req.user) {
    return req.user;
  }
  
  // Fallback for development/testing
  return {
    id: 'system-user',
    email: 'system@ars.com',
    fullName: 'System User',
    role: 'FINANCE',
    active: true
  };
}



@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('virements')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  async createVirement(@Body() dto: CreateVirementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    // Validate input
    if (!dto.bordereauId || typeof dto.montant !== 'number' || !dto.referenceBancaire || !dto.dateDepot || !dto.dateExecution) {
      throw new Error('All required fields must be provided.');
    }
    return this.financeService.createVirement(dto, user);
  }

  @Patch(':id/confirm')
  async confirmVirement(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.confirmVirement(id, user);
  }

  @Get('search')
  async searchVirements(@Query() query: SearchVirementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.searchVirements(query, user);
  }

  @Get('virement/:id')
  async getVirement(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.getVirementById(id, user);
  }

  @Get('export')
  async exportVirements(
    @Query('format') format: string,
    @Query() query: SearchVirementDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const user = getUserFromRequest(req);
    return this.financeService.exportVirements(format, query, user, res);
  }

  @Post('auto-confirm')
  async autoConfirmVirements(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.autoConfirmVirements();
  }

  // OV Processing endpoints
  @Post('ov/validate-file')
  @UseInterceptors(FileInterceptor('file'))
  async validateOVFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.validateOVFile(file, body, user);
  }

  @Post('ov/process')
  async processOV(@Body() dto: CreateOVDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.processOV(dto, user);
  }

  @Get('ov/tracking')
  async getOVTracking(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.getOVTracking(query, user);
  }

  @Patch('ov/:id/status')
  async updateOVStatus(@Param('id') id: string, @Body() dto: UpdateOVStatusDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.updateOVStatus(id, dto, user);
  }

  @Get('ov/:id/pdf')
  async generateOVPDF(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.generateOVPDF(id, res, user);
  }

  @Get('ov/:id/txt')
  async generateOVTXT(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.generateOVTXT(id, res, user);
  }

  // Donneurs d'Ordre endpoints
  @Get('donneurs')
  async getDonneurs(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.getDonneurs(user);
  }

  @Post('donneurs')
  async createDonneur(@Body() data: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.createDonneur(data, user);
  }

  @Patch('donneurs/:id')
  async updateDonneur(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.updateDonneur(id, data, user);
  }

  @Delete('donneurs/:id')
  async deleteDonneur(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.deleteDonneur(id, user);
  }

  // Adherents endpoints
  @Get('adherents')
  async getAdherents(@Query() query: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.getAdherents(query, user);
  }

  @Post('adherents')
  async createAdherent(@Body() data: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.createAdherent(data, user);
  }

  @Patch('adherents/:id')
  async updateAdherent(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.updateAdherent(id, data, user);
  }

  @Delete('adherents/:id')
  async deleteAdherent(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.deleteAdherent(id, user);
  }

  // Notifications endpoint
  @Post('notify-finance')
  async notifyFinanceTeam(@Body() data: { bordereauId: string, message?: string }, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.notifyFinanceTeam(data.bordereauId, data.message, user);
  }

  // Alerts endpoint
  @Get('alerts')
  async getFinanceAlerts(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.getFinanceAlerts(user);
  }

  // Export report endpoint
  @Post('export-report')
  async exportReport(@Body() exportData: any, @Res() res: Response, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.financeService.exportReport(exportData, res, user);
  }

  @Post('generate-ov')
  async generateOV(@Body() generateOVDto: {
    bordereauIds: string[];
    donneurOrdre?: string;
    format: 'PDF' | 'TXT' | 'BOTH';
    includeDetails: boolean;
  }, @Req() req: any) {
    console.log('📡 Finance Controller: Received OV generation request');
    console.log('📡 Request body:', JSON.stringify(generateOVDto, null, 2));
    try {
      const result = await this.financeService.generateOV(generateOVDto);
      console.log('✅ Finance Controller: OV generated successfully');
      return result;
    } catch (error) {
      console.error('❌ Finance Controller: Error generating OV:', error);
      throw error;
    }
  }
}