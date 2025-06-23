import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
 Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SearchContractDto } from './dto/search-contract.dto';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { dest: './uploads/contracts' }))
  async createContract(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateContractDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.contractsService.createContract(dto, file, user);
  }

  @Patch(':id')
  async updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.contractsService.updateContract(id, dto, user);
  }

  @Delete(':id')
  async deleteContract(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.contractsService.deleteContract(id, user);
  }

  @Get(':id')
  async getContract(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.contractsService.getContract(id, user);
  }

  @Get('search')
  async searchContracts(@Query() query: SearchContractDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.contractsService.searchContracts(query, user);
  }

  @Get(':id/history')
  async getContractHistory(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.contractsService.getContractHistory(id, user);
  }

  @Get()
  async getAllContracts(@Req() req: any) {
    const user = getUserFromRequest(req);
    // You may want to add filtering logic or just return all
    return this.contractsService.searchContracts({}, user);
  }

  @Get('export/excel')
  async exportContractsExcel(@Req() req: any, @Query() query: SearchContractDto, @Res() res) {
    const user = getUserFromRequest(req);
    const result = await this.contractsService.exportContractsExcel(query, user) as {
      file: Buffer;
      filename: string;
      contentType: string;
    };
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.file);
  }

  @Get('export/pdf')
  async exportContractsPdf(@Req() req: any, @Query() query: SearchContractDto, @Res() res) {
    const user = getUserFromRequest(req);
    const result = await this.contractsService.exportContractsPdf(query, user) as {
      file: Buffer;
      filename: string;
      contentType: string;
    };
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.file);
  }

  // 3. Dashboard/Statistics Endpoint
  @Get('dashboard/statistics')
  async getContractStatistics(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.contractsService.getContractStatistics(user);
  }

  // 2. SLA Breach Detection (manual trigger)
  @Post('sla/check')
  async checkSlaBreaches() {
    return this.contractsService.checkSlaBreaches();
  }

  // 4. Automatic Contract-Bordereau Association (manual trigger)
  @Post('associate-bordereaux')
  async associateContractsToBordereaux() {
    return this.contractsService.associateContractsToBordereaux();
  }

  // 5. GEC Integration (manual trigger for reminders)
  @Post('reminders/trigger')
  async triggerContractReminders() {
    return this.contractsService.triggerContractReminders();
  }

  // 6. GED Integration: Indexing & Search (manual trigger)
  @Post('ged/index')
  async indexContractsForGed() {
    return this.contractsService.indexContractsForGed();
  }

  // 7. Link Contracts to Complaints (manual trigger)
  @Post('link-complaints')
  async linkContractsToComplaints() {
    return this.contractsService.linkContractsToComplaints();
  }
}
