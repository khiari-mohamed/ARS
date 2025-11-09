import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SearchContractDto } from './dto/search-contract.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Express } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createContractDto: CreateContractDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    try {
      console.log('=== CONTRACT CREATION DEBUG ===');
      console.log('DTO received:', createContractDto);
      console.log('File received:', file ? { name: file.originalname, size: file.size } : 'No file');
      console.log('User:', req.user);
      
      const userId = req.user?.id || req.user?.sub;
      console.log('User ID:', userId);
      
      const result = await this.contractsService.create(createContractDto, file, userId);
      console.log('Contract created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('=== CONTRACT CREATION ERROR ===');
      console.error('Error details:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Query() query: SearchContractDto) {
    return this.contractsService.findAll(query);
  }

  @Get('statistics')
  async getStatistics() {
    return this.contractsService.getStatistics();
  }

  @Get('export/excel')
  async exportExcel(@Query() query: SearchContractDto, @Res() res: any) {
    const buffer = await this.contractsService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="contracts.xlsx"'
    });
    res.send(buffer);
  }

  @Post('check-sla-breaches')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async checkSLABreaches() {
    return this.contractsService.checkSLABreaches();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Get(':id/sla-compliance')
  async getSLACompliance(@Param('id') id: string) {
    return this.contractsService.getSLACompliance(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Req() req: any
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.contractsService.update(id, updateContractDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.contractsService.remove(id, userId);
  }

  @Post(':id/upload-document')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.contractsService.uploadDocument(id, file);
  }

  @Get(':id/download-document')
  async downloadDocument(@Param('id') id: string, @Res() res: any) {
    return this.contractsService.downloadDocument(id, res);
  }

  @Post(':id/reassign-chef')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.RESPONSABLE_DEPARTEMENT)
  async reassignChef(
    @Param('id') id: string,
    @Body() body: { newChefId: string },
    @Req() req: any
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.contractsService.reassignChef(id, body.newChefId, userId);
  }
}