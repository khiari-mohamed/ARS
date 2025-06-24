import { Injectable } from '@nestjs/common';
import { TraitementService } from '../traitement/traitement.service';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { ReclamationsService } from '../reclamations/reclamations.service';
import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { TuniclaimService } from '../integrations/tuniclaim.service';

@Injectable()
export class DashboardService {
  constructor(
    private traitement: TraitementService,
    private bordereaux: BordereauxService,
    private reclamations: ReclamationsService,
    private alerts: AlertsService,
    private analytics: AnalyticsService,
    private tuniclaim: TuniclaimService,
  ) {}

  async getKpis(user: any) {
    const bordereauKPIs = await this.bordereaux.getBordereauKPIs();
    const totalBordereaux = bordereauKPIs.length;
    const bsProcessed = bordereauKPIs.filter(b => b.statusColor === 'GREEN').length;
    const bsRejected = bordereauKPIs.filter(b => b.statusColor === 'RED').length;
    const slaBreaches = bsRejected;
    const overdueVirements = bordereauKPIs.filter(b => b.statut === 'EN_COURS').length;
    const pendingReclamations = await this.reclamations.analytics(user).then(a => a.open);
    return {
      totalBordereaux,
      bsProcessed,
      bsRejected,
      pendingReclamations,
      slaBreaches,
      overdueVirements,
    };
  }

  async getPerformance(user: any) {
    const perf = await this.analytics.getPerformance({}, user);
    return (perf.processedByUser  || []).map((u: any) => ({
      user: u.clientId,
      bsProcessed: u._count.id,
      avgTime: Math.round(Math.random() * 30 + 10), // Stub: replace with real avg time if available
    }));
  }

  async getSlaStatus(user: any) {
    const perf = await this.analytics.getPerformance({}, user);
    return [
      { type: 'BS SLA Compliance', status: perf.slaCompliant > 90 ? 'green' : perf.slaCompliant > 70 ? 'orange' : 'red', value: perf.slaCompliant },
    ];
  }

  async getAlerts(user: any) {
    return this.alerts.getAlertsDashboard({}, user);
  }

  async getCharts(user: any) {
    const trend = await this.analytics.getTrends(user, 'day');
    return { trend };
  }

  async getOverview(query: any, user: any) {
    const period = query.period || 'day';
    const teamId = query.teamId;
    const status = query.status;
    const fromDate = query.fromDate;
    const toDate = query.toDate;
    const analyticsQuery = { ...query, period, teamId, status, fromDate, toDate };
    const [traitementKpi, bordereauKpi, reclamationKpi, aiReco, alerts, analytics, trends] = await Promise.all([
      this.traitement.kpi(user),
      this.bordereaux.getBordereauKPIs(),
      this.reclamations.analytics(user),
      this.traitement.aiRecommendations(user),
      this.alerts.getAlertsDashboard(analyticsQuery, user),
      this.analytics.getDailyKpis(analyticsQuery, user),
      this.analytics.getTrends(user, period),
    ]);
    return {
      traitementKpi,
      bordereauKpi,
      reclamationKpi,
      aiReco,
      alerts,
      analytics,
      trends,
      filters: { period, teamId, status, fromDate, toDate },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAlertsSummary(query: any, user: any) {
    const alerts = await this.alerts.getAlertsDashboard(query, user);
    const summary = alerts.reduce((acc, a) => {
      acc[a.alertLevel] = (acc[a.alertLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { summary, total: alerts.length };
  }

  async getSyncStatus() {
    const lastLog = await this.tuniclaim.getLastSyncLog();
    return {
      lastSync: lastLog ? lastLog.date : null,
      imported: lastLog ? lastLog.imported : null,
      errors: lastLog ? lastLog.errors : null,
      details: lastLog ? lastLog.details : null,
    };
  }

  async getSyncLogs(limit = 20) {
    return this.tuniclaim.getSyncLogs(limit);
  }

  async syncAndSaveStatus() {
    const result = await this.tuniclaim.syncBs();
    return await this.getSyncStatus();
  }

  async exportKpis(query: any, user: any) {
    return this.analytics.exportAnalytics({ ...query, format: query.format || 'excel' }, user);
  }

  // New: Advanced KPI with filtering
  async getAdvancedKpis(query: any, user: any) {
    const { departmentId, managerId, teamId, fromDate, toDate } = query;
    const filters: any = {};
    if (departmentId) filters.departmentId = departmentId;
    if (managerId) filters.managerId = managerId;
    if (teamId) filters.teamId = teamId;
    if (fromDate || toDate) filters.date = {};
    if (fromDate) filters.date.gte = new Date(fromDate);
    if (toDate) filters.date.lte = new Date(toDate);

    // Fetch KPIs with filters
    const kpis = await this.analytics.getFilteredKpis(filters, user);

    // Planned vs actual, resource estimation
    const planned = await this.analytics.getPerformance(filters, user);
    const actual = await this.analytics.getPerformance(filters, user);
    const resourceEstimation = await this.analytics.estimateResources(filters, user);

    return {
      ...kpis,
      planned,
      actual,
      resourceEstimation,
    };
  }




  //////////////////////


   async getDepartments(user: any) {
    // In the future, fetch from DB here.
    // For now, return the static list:
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
