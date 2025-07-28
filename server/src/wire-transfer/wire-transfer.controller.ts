import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { WireTransferService } from './wire-transfer.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as multer from 'multer';

@Controller('wire-transfer')
export class WireTransferController {
  constructor(private readonly service: WireTransferService) {}

  // --- Society ---
  @Post('society')
  createSociety(@Body() data: any) { return this.service.createSociety(data); }
  @Get('society')
  getSocieties() { return this.service.getSocieties(); }
  @Get('society/:id')
  getSociety(@Param('id') id: string) { return this.service.getSociety(id); }
  @Patch('society/:id')
  updateSociety(@Param('id') id: string, @Body() data: any) { return this.service.updateSociety(id, data); }
  @Delete('society/:id')
  deleteSociety(@Param('id') id: string) { return this.service.deleteSociety(id); }

  // --- Member ---
  @Post('member')
  createMember(@Body() data: any) { return this.service.createMember(data); }
  @Get('member')
  getMembers(@Query('societyId') societyId?: string) { return this.service.getMembers(societyId); }
  @Get('member/:id')
  getMember(@Param('id') id: string) { return this.service.getMember(id); }
  @Patch('member/:id')
  updateMember(@Param('id') id: string, @Body() data: any) { return this.service.updateMember(id, data); }
  @Delete('member/:id')
  deleteMember(@Param('id') id: string) { return this.service.deleteMember(id); }

  // --- Donneur d'Ordre ---
  @Post('donneur')
  createDonneur(@Body() data: any) { return this.service.createDonneur(data); }
  @Get('donneur')
  getDonneurs(@Query('societyId') societyId?: string) { return this.service.getDonneurs(societyId); }
  @Get('donneur/:id')
  getDonneur(@Param('id') id: string) { return this.service.getDonneur(id); }
  @Patch('donneur/:id')
  updateDonneur(@Param('id') id: string, @Body() data: any) { return this.service.updateDonneur(id, data); }
  @Delete('donneur/:id')
  deleteDonneur(@Param('id') id: string) { return this.service.deleteDonneur(id); }

  // --- Batch ---
  @Post('batch')
  createBatch(@Body() data: any) { return this.service.createBatch(data); }
  @Get('batch')
  getBatches(@Query('societyId') societyId?: string) { return this.service.getBatches(societyId); }
  @Get('batch/:id')
  getBatch(@Param('id') id: string) { return this.service.getBatch(id); }
  @Patch('batch/:id')
  updateBatch(@Param('id') id: string, @Body() data: any) { return this.service.updateBatch(id, data); }
  @Delete('batch/:id')
  deleteBatch(@Param('id') id: string) { return this.service.deleteBatch(id); }

  // --- WireTransfer ---
  @Post('transfer')
  createTransfer(@Body() data: any) { return this.service.createTransfer(data); }
  @Get('transfer')
  getTransfers(@Query('batchId') batchId?: string) { return this.service.getTransfers(batchId); }
  @Get('transfer/:id')
  getTransfer(@Param('id') id: string) { return this.service.getTransfer(id); }
  @Patch('transfer/:id')
  updateTransfer(@Param('id') id: string, @Body() data: any) { return this.service.updateTransfer(id, data); }
  @Delete('transfer/:id')
  deleteTransfer(@Param('id') id: string) { return this.service.deleteTransfer(id); }

  // --- Status/History ---
  @Get('batch/:id/history')
  getBatchHistory(@Param('id') id: string) { return this.service.getBatchHistory(id); }
  @Get('transfer/:id/history')
  getTransferHistory(@Param('id') id: string) { return this.service.getTransferHistory(id); }

  // --- File Preview/Validation (TXT) ---
  @Post('batch/preview')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async previewBatch(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.service.previewBatch(file, body);
  }

  // --- File Upload (TXT) ---
  @Post('batch/upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadBatch(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.service.uploadAndProcessBatch(file, body);
  }

  // --- PDF/TXT Generation ---
  @Get('batch/:id/download/pdf')
  async downloadBatchPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.generateBatchPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="batch_${id}.pdf"`);
    res.end(buffer);
  }
  @Get('batch/:id/download/txt')
  async downloadBatchTxt(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.generateBatchTxt(id);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="batch_${id}.txt"`);
    res.end(buffer);
  }

  // --- Archiving ---
  @Patch('batch/:id/archive')
  async archiveBatch(@Param('id') id: string) {
    return this.service.archiveBatch(id);
  }

  // --- Dashboard ---
  @Get('dashboard/stats')
  async dashboardStats() {
    return this.service.getDashboardStats();
  }

  // --- Analytics Dashboard ---
  @Get('dashboard/analytics')
  async dashboardAnalytics(@Query() query: any, @Req() req: any) {
    // query: { companyId, state, userId, delayMin, delayMax, periodStart, periodEnd }
    // req.user for role-based filtering
    return this.service.getDashboardAnalytics(query, req.user);
  }

  // --- Export Dashboard Analytics ---
  @Get('dashboard/analytics/export/excel')
  async exportDashboardAnalyticsExcel(@Query() query: any, @Req() req: any, @Res() res: Response) {
    const buffer = await this.service.exportDashboardAnalyticsExcel(query, req.user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard_analytics.xlsx"');
    res.end(buffer);
  }
  @Get('dashboard/analytics/export/pdf')
  async exportDashboardAnalyticsPdf(@Query() query: any, @Req() req: any, @Res() res: Response) {
    const buffer = await this.service.exportDashboardAnalyticsPdf(query, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard_analytics.pdf"');
    res.end(buffer);
  }

  // --- Alerts ---
  @Get('alerts')
  async getAlerts() {
    return this.service.getAlerts();
  }
}
