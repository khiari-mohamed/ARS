import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Get,
  Query,
  Param,
  Patch,  
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { GedService } from './ged.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { UseGuards } from '@nestjs/common';

// Dummy user extraction (replace with real auth in production)
function getUserFromRequest(req: any) {
  // Example: req.user injected by auth middleware
  return req.user || { id: 'demo', role: 'SUPER_ADMIN' };
}



@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class GedController {
  constructor(private readonly gedService: GedService) {}

 @Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
  }),
)
async uploadDocument(
  @UploadedFile() file: Express.Multer.File,
  @Body() body: CreateDocumentDto,
  @Req() req: any,
) {
  const user = getUserFromRequest(req);
  if (!file) throw new Error('No file(s) uploaded.');
  return this.gedService.uploadDocument(file, body, user);
}

  // TEMP: Seed demo user, client, contract, and bordereau for testing
  @Get('seed-demo')
  async seedDemo(@Req() req: any) {
    // Seed a demo user
    await this.gedService['prisma'].user.upsert({
      where: { id: 'demo' },
      update: {},
      create: {
        id: 'demo',
        email: 'demo@example.com',
        password: 'password',
        fullName: 'Demo User',
        role: 'SUPER_ADMIN',
        createdAt: new Date(),
      },
    });
    // Seed a demo client
    await this.gedService['prisma'].client.upsert({
      where: { id: 'demo-client' },
      update: {},
      create: {
        id: 'demo-client',
        name: 'Demo Client',
        reglementDelay: 30,
        reclamationDelay: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    // Seed a demo contract
    await this.gedService['prisma'].contract.upsert({
      where: { id: 'demo-contract' },
      update: {},
      create: {
        id: 'demo-contract',
        clientId: 'demo-client',
        clientName: 'Demo Client',
        delaiReglement: 30,
        delaiReclamation: 15,
        assignedManagerId: 'demo',
        documentPath: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    // Seed a demo bordereau
    await this.gedService['prisma'].bordereau.upsert({
      where: { id: '12345' },
      update: {},
      create: {
        id: '12345',
        reference: 'REF12345',
        clientId: 'demo-client',
        contractId: 'demo-contract',
        dateReception: new Date(),
        delaiReglement: 30,
        nombreBS: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return { message: 'Demo user, client, contract, and bordereau seeded.' };
  }

  @Get('search')
  async searchDocuments(@Query() query: SearchDocumentDto, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.searchDocuments(query, user);
  }

  // Dashboard metrics endpoint
  @Get('stats')
  async getDocumentStats(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentStats(user);
  }

  // SLA breach alert endpoint
  @Get('sla-breaches')
  async getSlaBreaches(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getSlaBreaches(user);
  }
  
  // SLA status endpoint
  @Get('sla-status')
  async getSlaStatus(@Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getSlaStatus(user);
  }

  // Audit trail endpoint
  @Get(':id/audit')
  async getDocumentAudit(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentAudit(id, user);
  }

  // Assignment/reaffectation endpoint
  @Patch(':id/assign')
  async assignDocument(
    @Param('id') id: string,
    @Body() body: { assignedToUserId?: string; teamId?: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.assignDocument(id, body, user);
  }

  // Update document status endpoint
  @Patch(':id/status')
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.updateDocumentStatus(id, body.status, user);
  }

  @Patch(':id/tag')
  async tagDocument(
    @Param('id') id: string,
    @Body() tags: { type?: string; bordereauId?: string },
    @Req() req: any,
  ) {
    const user = getUserFromRequest(req);
    return this.gedService.tagDocument(id, tags, user);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.deleteDocument(id, user);
  }

  // Catch-all route MUST BE LAST
  @Get(':id')
  async getDocument(@Param('id') id: string, @Req() req: any) {
    const user = getUserFromRequest(req);
    return this.gedService.getDocumentById(id, user);
  }
}