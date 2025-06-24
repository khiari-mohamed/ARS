import { Controller, Get, Post, Query, Req, UseGuards, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  async getKpis(@Req() req) {
    return this.dashboardService.getKpis(req.user);
  }

  @Get('performance')
  async getPerformance(@Req() req) {
    return this.dashboardService.getPerformance(req.user);
  }

  @Get('sla-status')
  async getSlaStatus(@Req() req) {
    return this.dashboardService.getSlaStatus(req.user);
  }

  @Get('alerts')
  async getAlerts(@Req() req) {
    return this.dashboardService.getAlerts(req.user);
  }

  @Get('charts')
  async getCharts(@Req() req) {
    return this.dashboardService.getCharts(req.user);
  }

  @Get('overview')
  async getOverview(@Query() query: any, @Req() req) {
    // Support filters: period, teamId, status, fromDate, toDate
    return this.dashboardService.getOverview(query, req.user);
  }

  @Get('alerts-summary')
  async getAlertsSummary(@Query() query: any, @Req() req) {
    // Filtered alerts summary
    return this.dashboardService.getAlertsSummary(query, req.user);
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.dashboardService.getSyncStatus();
  }

  @Get('sync-logs')
  async getSyncLogs(@Query('limit') limit: number = 20) {
    return this.dashboardService.getSyncLogs(limit);
  }

  @Get('export')
  async exportKpis(@Query() query: any, @Req() req, @Res() res: Response) {
    const result = await this.dashboardService.exportKpis(query, req.user);
    if (result && result.filePath) {
      // For Excel/PDF, stream the file if needed
      res.download(result.filePath);
    } else {
      res.json(result);
    }
  }

  @Post('sync')
  async syncBs() {
    return this.dashboardService.syncAndSaveStatus();
  }

  // New: Advanced KPI with filtering
  @Get('advanced-kpis')
  async getAdvancedKpis(@Query() query: any, @Req() req) {
    return this.dashboardService.getAdvancedKpis(query, req.user);
  }

  @Get('departments')
  async getDepartments(@Req() req) {
    // Try to fetch dynamically if you have a service method
    if (this.dashboardService.getDepartments) {
      try {
        const departments = await this.dashboardService.getDepartments(req.user);
        if (departments && departments.length > 0) return departments;
      } catch (e) {
        // Log error and fall back to static
        console.warn('Failed to fetch departments dynamically, using static fallback.', e);
      }
    }
    // Static fallback (from your CDC)
    return [
      { id: 'bureau-ordre', name: "Bureau d’ordre", details: "Réception et enregistrement des dossiers" },
      { id: 'scan', name: "Service SCAN / Équipe Scan", details: "Numérisation et indexation des documents" },
      { id: 'sante', name: "Équipe Santé / Équipe Métier", details: "Traitement des bordereaux et bulletins de soins" },
      { id: 'chef-equipe', name: "Chef d’Équipe", details: "Supervision et répartition des tâches aux gestionnaires" },
      { id: 'gestionnaire', name: "Gestionnaire", details: "Traitement opérationnel des dossiers" },
      { id: 'production', name: "Équipe Production", details: "Partie de l’équipe Santé" },
      { id: 'tiers-payant', name: "Équipe Tiers Payant", details: "Traitement des dossiers spécifiques tiers payant" },
      { id: 'finance', name: "Service Financier / Finance", details: "Suivi et exécution des virements" },
      { id: 'client', name: "Service Client", details: "Gestion des réclamations et interaction client" },
      { id: 'super-admin', name: "Super Admin", details: "Supervision globale et vue sur tous les tableaux de bord" },
      { id: 'responsable', name: "Responsable de Département", details: "Responsable de son unité avec accès aux données de performance" },
      { id: 'charge-compte', name: "Chargé de Compte", details: "Liaison avec les clients pour les délais et contrats" }
    ];
  }
}