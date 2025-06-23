import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import { OcrRequestDto } from './dto/ocr-request.dto';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
  async processOcr(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: OcrRequestDto,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.ocrService.processOcr(file, dto, user);
  }

  @Get(':docId')
  async getOcrResult(@Param('docId') docId: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.ocrService.getOcrResult(docId, user);
  }

  @Patch(':docId')
  async patchOcrResult(
    @Param('docId') docId: string,
    @Body() correction: any,
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.ocrService.patchOcrResult(docId, correction, user);
  }

  @Get('logs')
  async getOcrLogs(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.ocrService.getOcrLogs(user);
  }
}
