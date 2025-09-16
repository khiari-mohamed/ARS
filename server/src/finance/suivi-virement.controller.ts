import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { SuiviVirementService } from './suivi-virement.service';
import { Response } from 'express';

@Controller('suivi-virement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuiviVirementController {
  constructor(private readonly suiviService: SuiviVirementService) {}

  @Post('notify/sante-to-finance/:bordereauId')
  @Roles(UserRole.GESTIONNAIRE, UserRole.CHEF_EQUIPE)
  async notifySanteToFinance(
    @Param('bordereauId') bordereauId: string,
    @Body() body: { utilisateurSanteId: string }
  ) {
    return this.suiviService.notifySanteToFinance(bordereauId, body.utilisateurSanteId);
  }

  @Put('ordre/:ordreVirementId/etat')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE)
  async updateEtatVirement(
    @Param('ordreVirementId') ordreVirementId: string,
    @Body() body: {
      nouvelEtat: 'NON_EXECUTE' | 'EN_COURS_EXECUTION' | 'EXECUTE_PARTIELLEMENT' | 'REJETE' | 'EXECUTE';
      utilisateurFinanceId: string;
      commentaire?: string;
    }
  ) {
    return this.suiviService.updateEtatVirement(
      ordreVirementId,
      body.nouvelEtat,
      body.utilisateurFinanceId,
      body.commentaire
    );
  }

  @Get('list')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getSuiviVirements(
    @Query('numeroBordereau') numeroBordereau?: string,
    @Query('societe') societe?: string,
    @Query('etatVirement') etatVirement?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('utilisateurSante') utilisateurSante?: string,
    @Query('utilisateurFinance') utilisateurFinance?: string
  ) {
    const filters = {
      numeroBordereau,
      societe,
      etatVirement,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      utilisateurSante,
      utilisateurFinance
    };

    return this.suiviService.getSuiviVirements(filters);
  }

  @Get(':suiviId/details')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getSuiviVirementDetails(@Param('suiviId') suiviId: string) {
    return this.suiviService.getSuiviVirementDetails(suiviId);
  }

  @Get('dashboard')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async getVirementDashboard(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('utilisateurFinance') utilisateurFinance?: string
  ) {
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      utilisateurFinance
    };

    return this.suiviService.getVirementDashboard(filters);
  }

  @Get('export')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async exportSuiviVirements(
    @Res() res: Response,
    @Query('format') format?: 'csv' | 'excel',
    @Query('numeroBordereau') numeroBordereau?: string,
    @Query('societe') societe?: string,
    @Query('etatVirement') etatVirement?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const filters = {
      numeroBordereau,
      societe,
      etatVirement,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    const exportData = await this.suiviService.exportSuiviVirements(filters, format);

    if (format === 'csv') {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="suivi_virements.csv"'
      });
      res.send(exportData);
    } else {
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="suivi_virements.xlsx"'
      });
      res.send(exportData);
    }
  }

  @Post('export-report')
  @Roles(UserRole.FINANCE, UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN)
  async exportFinancialReport(
    @Body() body: {
      format: string;
      filters: any;
      data: any;
      cashFlowProjection: any;
      financialKPIs: any;
    },
    @Res() res: Response
  ) {
    console.log('📊 Financial Report Export requested:', body.format);
    
    try {
      const reportData = await this.suiviService.generateFinancialReport(body);
      
      const filename = `rapport_financier_${new Date().toISOString().split('T')[0]}`;
      
      if (body.format === 'pdf') {
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`
        });
      } else if (body.format === 'xlsx') {
        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`
        });
      } else {
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        });
      }
      
      res.send(reportData);
    } catch (error) {
      console.error('Export failed:', error);
      res.status(500).json({ error: 'Export failed: ' + error.message });
    }
  }
}