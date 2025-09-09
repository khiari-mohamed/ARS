import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { SlaConfigurationService, ClientSLAConfig } from './sla-configuration.service';

@Controller('sla-configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SlaConfigurationController {
  constructor(private slaConfigService: SlaConfigurationService) {}

  @Post(':clientId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async createSLAConfiguration(
    @Param('clientId') clientId: string,
    @Body() config: Omit<ClientSLAConfig, 'clientId'>
  ) {
    return this.slaConfigService.createSLAConfiguration(config, clientId);
  }

  @Put(':clientId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async updateSLAConfiguration(
    @Param('clientId') clientId: string,
    @Body() config: Partial<ClientSLAConfig>
  ) {
    return this.slaConfigService.updateSLAConfiguration(clientId, config);
  }

  @Get(':clientId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE)
  async getSLAConfiguration(@Param('clientId') clientId: string) {
    return this.slaConfigService.getSLAConfiguration(clientId);
  }

  @Get(':clientId/compliance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async evaluateSLACompliance(@Param('clientId') clientId: string) {
    return this.slaConfigService.evaluateSLACompliance(clientId);
  }

  @Get('dashboard/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getSLADashboard(@Query('clientId') clientId?: string) {
    return this.slaConfigService.getSLADashboardData(clientId);
  }

  @Get('templates/defaults')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async getConfigurableThresholds() {
    return this.slaConfigService.getConfigurableThresholds();
  }

  @Post(':clientId/alerts/trigger')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async triggerSLAAlert(
    @Param('clientId') clientId: string,
    @Body() alertData: { alertType: string; details: any }
  ) {
    await this.slaConfigService.triggerSLAAlert(clientId, alertData.alertType, alertData.details);
    return { success: true, message: 'SLA alert triggered successfully' };
  }

  @Get('analytics/trends')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getSLATrends(
    @Query('clientId') clientId?: string,
    @Query('period') period: string = 'monthly',
    @Query('modules') modules?: string
  ) {
    const moduleList = modules ? modules.split(',') : ['BORDEREAUX', 'RECLAMATIONS'];
    return this.getSLAAnalyticsTrends(clientId, period, moduleList);
  }

  @Post('bulk-update')
  @Roles(UserRole.SUPER_ADMIN)
  async bulkUpdateSLAConfigurations(
    @Body() updates: Array<{ clientId: string; config: Partial<ClientSLAConfig> }>
  ) {
    const results: Array<{ clientId: string; success: boolean; result?: any; error?: string }> = [];
    for (const update of updates) {
      try {
        const result = await this.slaConfigService.updateSLAConfiguration(update.clientId, update.config);
        results.push({ clientId: update.clientId, success: true, result });
      } catch (error) {
        results.push({ clientId: update.clientId, success: false, error: error.message });
      }
    }
    return { results, summary: { total: updates.length, success: results.filter(r => r.success).length } };
  }

  @Get('export/configurations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async exportSLAConfigurations(@Query('format') format: 'csv' | 'excel' = 'excel') {
    return this.exportConfigurations(format);
  }

  private async getSLAAnalyticsTrends(clientId?: string, period: string = 'monthly', modules: string[] = []) {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily': startDate.setDate(now.getDate() - 30); break;
      case 'weekly': startDate.setDate(now.getDate() - 84); break;
      case 'monthly': startDate.setMonth(now.getMonth() - 12); break;
      case 'yearly': startDate.setFullYear(now.getFullYear() - 3); break;
    }

    const trends: Array<{
      clientId: string;
      period: string;
      overallCompliance: number;
      moduleCompliance: any[];
      breaches: any[];
      thresholds: any;
      trend: Array<{ month: string; compliance: number }>;
    }> = [];
    const clients = clientId ? [{ id: clientId }] : await this.getActiveClients();

    for (const client of clients) {
      const compliance = await this.slaConfigService.evaluateSLACompliance(client.id);
      const config = await this.slaConfigService.getSLAConfiguration(client.id);
      
      trends.push({
        clientId: client.id,
        period,
        overallCompliance: compliance.overallCompliance,
        moduleCompliance: compliance.moduleCompliance.filter(m => 
          modules.length === 0 || modules.includes(m.module)
        ),
        breaches: compliance.breaches,
        thresholds: config?.thresholds,
        trend: await this.calculateComplianceTrend(client.id, startDate, now)
      });
    }

    return {
      period: { start: startDate, end: now, type: period },
      trends,
      summary: {
        avgCompliance: trends.reduce((acc, t) => acc + t.overallCompliance, 0) / (trends.length || 1),
        totalBreaches: trends.reduce((acc, t) => acc + t.breaches.length, 0),
        clientsAtRisk: trends.filter(t => t.overallCompliance < 90).length
      }
    };
  }

  private async getActiveClients() {
    // This would typically come from a client service
    return []; // Placeholder
  }

  private async calculateComplianceTrend(clientId: string, startDate: Date, endDate: Date): Promise<Array<{ month: string; compliance: number }>> {
    const monthlyData: Array<{ month: string; compliance: number }> = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      const monthlyCompliance = await this.calculateMonthlyCompliance(clientId, monthStart, monthEnd);
      
      monthlyData.push({
        month: monthStart.toISOString().substring(0, 7),
        compliance: monthlyCompliance
      });
      
      current.setMonth(current.getMonth() + 1);
    }
    
    return monthlyData;
  }

  private async calculateMonthlyCompliance(clientId: string, startDate: Date, endDate: Date): Promise<number> {
    // Placeholder implementation - would calculate actual compliance for the month
    return Math.random() * 100; // Replace with real calculation
  }

  private async exportConfigurations(format: 'csv' | 'excel') {
    const configurations = await this.slaConfigService.getSLADashboardData();
    
    if (format === 'csv') {
      const headers = ['Client ID', 'Client Name', 'Overall Compliance', 'Status', 'Breach Count', 'Last Updated'];
      const csvContent = [headers.join(',')];
      
      configurations.clients.forEach(client => {
        csvContent.push([
          client.clientId,
          `"${client.clientName}"`,
          client.overallCompliance.toFixed(2),
          client.status,
          client.breachCount,
          client.lastUpdated.toISOString().split('T')[0]
        ].join(','));
      });
      
      return {
        content: csvContent.join('\\n'),
        filename: `sla-configurations-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv'
      };
    }
    
    // Excel export would be implemented here
    return {
      content: 'Excel export not implemented',
      filename: `sla-configurations-${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }
}