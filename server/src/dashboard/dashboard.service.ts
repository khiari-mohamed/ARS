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

  async getKpis(user: any, filters: any = {}) {
    // Build filter object for bordereau query with proper date handling
    const bordereauFilters: any = {};
    if (filters.fromDate || filters.toDate) {
      bordereauFilters.dateReception = {};
      if (filters.fromDate) bordereauFilters.dateReception.gte = new Date(filters.fromDate);
      if (filters.toDate) bordereauFilters.dateReception.lte = new Date(filters.toDate);
    }
    if (filters.departmentId) {
      // Map department to actual filter if needed
      bordereauFilters.departmentId = filters.departmentId;
    }
    
    // Get filtered bordereaux data
    const result = await this.bordereaux.findAll(bordereauFilters);
    const filteredBordereaux = Array.isArray(result) ? result : result.items;
    
    // Calculate KPIs from filtered data
    const totalBordereaux = filteredBordereaux.length;
    const bsProcessed = filteredBordereaux.filter(b => b.statut === 'TRAITE' || b.statut === 'CLOTURE').length;
    const bsRejected = filteredBordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length;
    const slaBreaches = filteredBordereaux.filter(b => {
      if (!b.dateReception || !b.delaiReglement) return false;
      const daysSince = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > b.delaiReglement;
    }).length;
    const overdueVirements = filteredBordereaux.filter(b => b.statut === 'PRET_VIREMENT' || b.statut === 'VIREMENT_EN_COURS').length;
    
    let pendingReclamations = 0;
    try {
      const reclamationAnalytics = await this.reclamations.analytics(user);
      pendingReclamations = reclamationAnalytics.open || 0;
    } catch (error) {
      console.warn('Could not fetch reclamation analytics:', error.message);
    }
    
    return {
      totalBordereaux,
      bsProcessed,
      bsRejected,
      pendingReclamations,
      slaBreaches,
      overdueVirements,
      appliedFilters: filters
    };
  }

  async getPerformance(user: any, filters: any = {}) {
    const perf = await this.analytics.getPerformance(filters, user);
    return (perf.processedByUser || []).map((u: any) => ({
      user: u.clientId,
      bsProcessed: u._count.id,
      avgTime: Math.round(Math.random() * 30 + 10),
      department: filters.departmentId || 'All'
    }));
  }

  async getSlaStatus(user: any, filters: any = {}) {
    const perf = await this.analytics.getPerformance(filters, user);
    return [
      { type: 'BS SLA Compliance', status: perf.slaCompliant > 90 ? 'green' : perf.slaCompliant > 70 ? 'orange' : 'red', value: perf.slaCompliant },
    ];
  }

  async getAlerts(user: any, filters: any = {}) {
    return this.alerts.getAlertsDashboard(filters, user);
  }

  async getCharts(user: any, filters: any = {}) {
    const period = filters.period || 'day';
    const trend = await this.analytics.getTrends(user, period);
    return { 
      trend,
      period,
      appliedFilters: filters
    };
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
