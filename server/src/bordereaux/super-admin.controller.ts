import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // === SYSTEM DASHBOARD ===
  @Get('system-health')
  async getSystemHealth() {
    return this.superAdminService.getSystemHealth();
  }

  @Get('queues-overview')
  async getQueuesOverview() {
    return this.superAdminService.getAllQueuesOverview();
  }

  @Get('performance-metrics')
  async getPerformanceMetrics(@Query('period') period?: string) {
    return this.superAdminService.getSystemPerformanceMetrics(period);
  }

  @Get('system-stats')
  async getSystemStats() {
    return this.superAdminService.getSystemStats();
  }

  @Get('system-logs')
  async getSystemLogs(@Query() filters: any) {
    return this.superAdminService.getSystemLogs(filters);
  }

  // === SLA CONFIGURATION ===
  @Get('sla-configurations')
  async getSLAConfigurations() {
    return this.superAdminService.getSLAConfigurations();
  }

  @Post('sla-configurations')
  async createSLAConfiguration(@Body() config: any) {
    return this.superAdminService.createSLAConfiguration(config);
  }

  @Put('sla-configurations/:id')
  async updateSLAConfiguration(@Param('id') id: string, @Body() updates: any) {
    return this.superAdminService.updateSLAConfiguration(id, updates);
  }

  @Delete('sla-configurations/:id')
  async deleteSLAConfiguration(@Param('id') id: string) {
    return this.superAdminService.deleteSLAConfiguration(id);
  }

  // === SYSTEM CONFIGURATION ===
  @Get('system-configuration')
  async getSystemConfiguration() {
    return this.superAdminService.getSystemConfiguration();
  }

  @Put('system-configuration')
  async updateSystemConfiguration(@Body() updates: any) {
    return this.superAdminService.updateSystemConfiguration(updates);
  }

  @Post('test-email-config')
  async testEmailConfiguration(@Body() config: any) {
    const result = await this.superAdminService.testEmailConfiguration(config);
    return { success: result };
  }

  @Post('test-sms-config')
  async testSMSConfiguration(@Body() config: any) {
    const result = await this.superAdminService.testSMSConfiguration(config);
    return { success: result };
  }

  // === USER MANAGEMENT ===
  @Get('users')
  async getAllUsers(@Query() filters: any) {
    return this.superAdminService.getAllUsers(filters);
  }

  @Post('users/bulk-create')
  async bulkCreateUsers(@Body() data: { users: any[] }) {
    return this.superAdminService.bulkCreateUsers(data.users);
  }

  @Put('users/bulk-update')
  async bulkUpdateUsers(@Body() data: { updates: { userId: string; data: any }[] }) {
    return this.superAdminService.bulkUpdateUsers(data.updates);
  }

  @Delete('users/bulk-delete')
  async bulkDeleteUsers(@Body() data: { userIds: string[] }) {
    return this.superAdminService.bulkDeleteUsers(data.userIds);
  }

  @Get('role-templates')
  async getRoleTemplates() {
    return this.superAdminService.getRoleTemplates();
  }

  @Post('users/from-template')
  async createUserFromTemplate(@Body() data: { templateId: string; userData: any }) {
    return this.superAdminService.createUserFromTemplate(data.templateId, data.userData);
  }
}