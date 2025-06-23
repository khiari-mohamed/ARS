import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateVirementDto } from './dto/create-virement.dto';
import { ConfirmVirementDto } from './dto/confirm-virement.dto';
import { SearchVirementDto } from './dto/search-virement.dto';
import { Response } from 'express';

// Dummy user extraction (replace with real auth)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@Controller('virements')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  async createVirement(@Body() dto: CreateVirementDto, @Req() req: any) {
    const user = getUserFromRequest(req);
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
    // Role check is enforced in the service
    return this.financeService.autoConfirmVirements();
  }
}