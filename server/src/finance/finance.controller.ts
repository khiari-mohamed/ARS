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

// Dummy user extraction (replace with real auth)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
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

  @Get(':id')
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
}