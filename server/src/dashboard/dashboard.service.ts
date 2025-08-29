import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TraitementService } from '../traitement/traitement.service';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { ReclamationsService } from '../reclamations/reclamations.service';
import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { TuniclaimService } from '../integrations/tuniclaim.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';
const AI_USERNAME = process.env.AI_USERNAME || 'admin';
const AI_PASSWORD = process.env.AI_PASSWORD || 'secret';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private traitement: TraitementService,
    private bordereaux: BordereauxService,
    private reclamations: ReclamationsService,
    private alerts: AlertsService,
    private analytics: AnalyticsService,
    private tuniclaim: TuniclaimService,
  ) {}

  async getKpis(user: any, filters: any = {}) {
    try {
      // Build comprehensive filters based on user role and permissions
      const where: any = this.buildUserFilters(user, filters);
      
      // Get real-time data from database
      const [bordereaux, reclamations, virements, bulletinSoins] = await Promise.all([
        this.prisma.bordereau.findMany({ where, include: { client: true, virement: true } }),
        this.prisma.reclamation.findMany({ 
          where: { 
            ...where,
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
          }
        }),
        this.prisma.virement.findMany({ 
          where: { 
            confirmed: false,
            bordereau: where
          }
        }),
        this.prisma.bulletinSoin.findMany({ 
          where: {
            bordereau: where
          }
        })
      ]);
      
      // Calculate real-time KPIs
      const totalBordereaux = bordereaux.length;
      const bsProcessed = bordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)).length;
      const bsRejected = bordereaux.filter(b => ['EN_DIFFICULTE', 'REJETE'].includes(b.statut)).length;
      const bsInProgress = bordereaux.filter(b => ['EN_COURS', 'ASSIGNE', 'SCAN_EN_COURS'].includes(b.statut)).length;
      const bsPending = bordereaux.filter(b => ['EN_ATTENTE', 'A_SCANNER', 'A_AFFECTER'].includes(b.statut)).length;
      
      // Calculate SLA breaches with real logic
      const now = new Date();
      const slaBreaches = bordereaux.filter(b => {
        if (!b.dateReception || !b.delaiReglement) return false;
        const daysSince = Math.floor((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > b.delaiReglement && !['CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut);
      }).length;
      
      // Calculate processing efficiency
      const avgProcessingTime = this.calculateAvgProcessingTime(bordereaux);
      const slaCompliance = totalBordereaux > 0 ? ((totalBordereaux - slaBreaches) / totalBordereaux * 100) : 100;
      
      // Get AI-powered insights
      const aiInsights = await this.getAIInsights(bordereaux, user);
      
      return {
        // Core KPIs
        totalBordereaux,
        bsProcessed,
        bsRejected,
        bsInProgress,
        bsPending,
        pendingReclamations: reclamations.length,
        slaBreaches,
        overdueVirements: virements.length,
        
        // Performance metrics
        avgProcessingTime,
        slaCompliance: Math.round(slaCompliance * 100) / 100,
        processingRate: totalBordereaux > 0 ? Math.round((bsProcessed / totalBordereaux) * 100) : 0,
        
        // Financial metrics
        totalBulletinSoins: bulletinSoins.length,
        totalAmount: bulletinSoins.reduce((sum, bs) => sum + (bs.totalPec || 0), 0),
        
        // AI insights
        aiInsights,
        
        // Metadata
        appliedFilters: filters,
        lastUpdated: now.toISOString(),
        userRole: user.role
      };
    } catch (error) {
      console.error('Error getting KPIs:', error);
      return this.getFallbackKpis(filters);
    }
  }

  async getPerformance(user: any, filters: any = {}) {
    try {
      const where = this.buildUserFilters(user, filters);
      
      // Get performance data by user/team
      const performanceData = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId'],
        where,
        _count: { id: true },
        _avg: { delaiReglement: true }
      });
      
      // Get user details and calculate metrics
      const userIds = performanceData.map(p => p.assignedToUserId).filter(Boolean) as string[];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, role: true, department: true }
      });
      
      // Calculate processing times and efficiency
      const enrichedPerformance = await Promise.all(
        performanceData.map(async (perf) => {
          const userData = users.find(u => u.id === perf.assignedToUserId);
          const processingTimes = await this.calculateUserProcessingTimes(perf.assignedToUserId!, where);
          
          return {
            userId: perf.assignedToUserId,
            userName: userData?.fullName || 'Unknown',
            role: userData?.role || 'Unknown',
            department: userData?.department || 'Unknown',
            bsProcessed: perf._count.id,
            avgSlaTime: perf._avg.delaiReglement || 0,
            avgProcessingTime: processingTimes.avg,
            efficiency: processingTimes.efficiency,
            slaCompliance: processingTimes.slaCompliance,
            workload: await this.calculateCurrentWorkload(perf.assignedToUserId!)
          };
        })
      );
      
      // Get AI performance recommendations
      const aiRecommendations = await this.getPerformanceRecommendations(enrichedPerformance);
      
      return {
        performance: enrichedPerformance,
        aiRecommendations,
        summary: {
          totalUsers: enrichedPerformance.length,
          avgEfficiency: enrichedPerformance.reduce((sum, p) => sum + p.efficiency, 0) / enrichedPerformance.length,
          topPerformer: enrichedPerformance.sort((a, b) => b.efficiency - a.efficiency)[0]
        }
      };
    } catch (error) {
      console.error('Error getting performance:', error);
      return { performance: [], aiRecommendations: [], summary: {} };
    }
  }

  async getSlaStatus(user: any, filters: any = {}) {
    try {
      const where = this.buildUserFilters(user, filters);
      const now = new Date();
      
      // Get all bordereaux with SLA calculations
      const bordereaux = await this.prisma.bordereau.findMany({
        where,
        include: { client: true, contract: true }
      });
      
      // Calculate SLA status categories
      const slaAnalysis = bordereaux.map(b => {
        const daysSinceReception = b.dateReception ? 
          Math.floor((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const slaLimit = b.delaiReglement || b.contract?.delaiReglement || 5;
        const remainingDays = slaLimit - daysSinceReception;
        
        let status: 'green' | 'orange' | 'red';
        if (remainingDays > 2) status = 'green';
        else if (remainingDays > 0) status = 'orange';
        else status = 'red';
        
        return {
          id: b.id,
          reference: b.reference,
          status,
          remainingDays,
          daysSinceReception,
          slaLimit,
          isCompleted: ['CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)
        };
      });
      
      // Group by status
      const withinSla = slaAnalysis.filter(s => s.status === 'green').length;
      const atRisk = slaAnalysis.filter(s => s.status === 'orange').length;
      const breached = slaAnalysis.filter(s => s.status === 'red' && !s.isCompleted).length;
      const total = bordereaux.length;
      
      // Get AI SLA predictions
      const aiPredictions = await this.getSLAPredictions(bordereaux);
      
      return [
        {
          type: 'Dans les délais',
          status: 'green',
          value: withinSla,
          percentage: total > 0 ? Math.round((withinSla / total) * 100) : 0
        },
        {
          type: 'À risque',
          status: 'orange', 
          value: atRisk,
          percentage: total > 0 ? Math.round((atRisk / total) * 100) : 0
        },
        {
          type: 'Dépassés',
          status: 'red',
          value: breached,
          percentage: total > 0 ? Math.round((breached / total) * 100) : 0
        },
        {
          type: 'Conformité SLA Globale',
          status: breached === 0 ? 'green' : breached < total * 0.1 ? 'orange' : 'red',
          value: total > 0 ? Math.round(((total - breached) / total) * 100) : 100,
          percentage: 100
        }
      ];
    } catch (error) {
      console.error('Error getting SLA status:', error);
      return [];
    }
  }

  async getAlerts(user: any, filters: any = {}) {
    try {
      // Get real-time alerts from database
      const where = this.buildUserFilters(user, filters);
      const alerts = await this.alerts.getAlertsDashboard(filters, user);
      
      // Get AI-powered alert analysis
      const aiAlerts = await this.getAIAlerts(where, user);
      
      // Combine and prioritize alerts
      const combinedAlerts = [...alerts, ...aiAlerts]
        .sort((a, b) => {
          const priorityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
          return (priorityOrder[b.alertLevel] || 0) - (priorityOrder[a.alertLevel] || 0);
        })
        .slice(0, 20); // Limit to top 20 alerts
      
      return {
        alerts: combinedAlerts,
        summary: {
          total: combinedAlerts.length,
          critical: combinedAlerts.filter(a => a.alertLevel === 'CRITICAL').length,
          high: combinedAlerts.filter(a => a.alertLevel === 'HIGH').length,
          medium: combinedAlerts.filter(a => a.alertLevel === 'MEDIUM').length,
          low: combinedAlerts.filter(a => a.alertLevel === 'LOW').length
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting alerts:', error);
      return { alerts: [], summary: {}, lastUpdated: new Date().toISOString() };
    }
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

  // Helper methods for dashboard functionality
  private buildUserFilters(user: any, filters: any = {}) {
    const where: any = {};
    
    // Apply role-based filtering
    if (user.role === 'GESTIONNAIRE') {
      where.assignedToUserId = user.id;
    } else if (user.role === 'CHEF_EQUIPE') {
      where.teamId = user.id;
    } else if (user.role === 'BO') {
      where.statut = { in: ['EN_ATTENTE', 'A_SCANNER'] };
    } else if (user.role === 'SCAN') {
      where.statut = { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] };
    }
    
    // Apply date filters
    if (filters.fromDate || filters.toDate) {
      where.dateReception = {};
      if (filters.fromDate) where.dateReception.gte = new Date(filters.fromDate);
      if (filters.toDate) where.dateReception.lte = new Date(filters.toDate);
    }
    
    // Apply department filter
    if (filters.departmentId && filters.departmentId !== 'all') {
      // Map department to appropriate filter
      switch (filters.departmentId) {
        case 'bureau-ordre':
          where.statut = { in: ['EN_ATTENTE', 'A_SCANNER'] };
          break;
        case 'scan':
          where.statut = { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] };
          break;
        case 'sante':
        case 'production':
          where.statut = { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'] };
          break;
        case 'finance':
          where.statut = { in: ['PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE'] };
          break;
      }
    }
    
    return where;
  }
  
  private calculateAvgProcessingTime(bordereaux: any[]): number {
    const processedBordereaux = bordereaux.filter(b => 
      b.dateReception && b.dateCloture && ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)
    );
    
    if (processedBordereaux.length === 0) return 0;
    
    const totalTime = processedBordereaux.reduce((sum, b) => {
      const processingTime = new Date(b.dateCloture!).getTime() - new Date(b.dateReception!).getTime();
      return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);
    
    return Math.round((totalTime / processedBordereaux.length) * 100) / 100;
  }
  
  private async calculateUserProcessingTimes(userId: string, where: any) {
    const userBordereaux = await this.prisma.bordereau.findMany({
      where: { ...where, assignedToUserId: userId },
      select: {
        dateReception: true,
        dateCloture: true,
        delaiReglement: true,
        statut: true
      }
    });
    
    const processedBordereaux = userBordereaux.filter(b => 
      b.dateReception && b.dateCloture && ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)
    );
    
    if (processedBordereaux.length === 0) {
      return { avg: 0, efficiency: 0, slaCompliance: 0 };
    }
    
    const processingTimes = processedBordereaux.map(b => {
      const processingTime = new Date(b.dateCloture!).getTime() - new Date(b.dateReception!).getTime();
      return processingTime / (1000 * 60 * 60 * 24); // Convert to days
    });
    
    const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    const slaCompliant = processedBordereaux.filter(b => {
      const processingTime = new Date(b.dateCloture!).getTime() - new Date(b.dateReception!).getTime();
      const days = processingTime / (1000 * 60 * 60 * 24);
      return days <= (b.delaiReglement || 5);
    }).length;
    
    const slaCompliance = (slaCompliant / processedBordereaux.length) * 100;
    const efficiency = Math.max(0, 100 - (avgTime * 10)); // Simple efficiency calculation
    
    return {
      avg: Math.round(avgTime * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
      slaCompliance: Math.round(slaCompliance * 100) / 100
    };
  }
  
  private async calculateCurrentWorkload(userId: string): Promise<number> {
    const activeCount = await this.prisma.bordereau.count({
      where: {
        assignedToUserId: userId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      }
    });
    return activeCount;
  }
  
  private async getAIToken(): Promise<string> {
    try {
      const credentials = [
        { username: 'admin', password: 'secret' },
        { username: 'analyst', password: 'secret' },
        { username: AI_USERNAME, password: AI_PASSWORD }
      ];
      
      for (const cred of credentials) {
        try {
          const formData = new URLSearchParams();
          formData.append('grant_type', 'password');
          formData.append('username', cred.username);
          formData.append('password', cred.password);
          
          const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 5000
          });
          
          console.log(`✅ Dashboard AI authenticated with ${cred.username}`);
          return tokenResponse.data.access_token;
        } catch (credError: any) {
          console.warn(`❌ Dashboard AI auth failed with ${cred.username}: ${credError.response?.status || credError.message}`);
          continue;
        }
      }
      throw new Error('All credentials failed');
    } catch (error: any) {
      console.error('🚫 Dashboard AI authentication failed:', error.message);
      throw new Error('AI authentication failed');
    }
  }
  
  private async getAIInsights(bordereaux: any[], user: any) {
    try {
      const token = await this.getAIToken();
      
      // Prepare data for AI analysis
      const analysisData = bordereaux.slice(0, 10).map(b => ({
        id: b.id,
        start_date: b.dateReception,
        deadline: new Date(new Date(b.dateReception!).getTime() + (b.delaiReglement || 5) * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut) ? 100 : 
                         ['EN_COURS', 'ASSIGNE'].includes(b.statut) ? 50 : 10,
        total_required: 100,
        sla_days: b.delaiReglement || 5
      }));
      
      // Get AI predictions and recommendations with better error handling
      const makeAIRequest = async (endpoint: string, data: any) => {
        try {
          return await axios.post(`${AI_MICROSERVICE_URL}${endpoint}`, data, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 8000
          });
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            // Token expired, get new one and retry
            const newToken = await this.getAIToken();
            return await axios.post(`${AI_MICROSERVICE_URL}${endpoint}`, data, {
              headers: { 'Authorization': `Bearer ${newToken}` },
              timeout: 8000
            });
          }
          throw error;
        }
      };
      
      // Make requests sequentially to avoid overwhelming the AI service
      let slaResult, prioritiesResult;
      
      try {
        slaResult = { status: 'fulfilled', value: await makeAIRequest('/sla_prediction', analysisData) };
      } catch (error) {
        slaResult = { status: 'rejected', reason: error };
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        prioritiesResult = { status: 'fulfilled', value: await makeAIRequest('/priorities', analysisData) };
      } catch (error) {
        prioritiesResult = { status: 'rejected', reason: error };
      }
      
      const slaData = slaResult.status === 'fulfilled' ? slaResult.value.data : null;
      const prioritiesData = prioritiesResult.status === 'fulfilled' ? prioritiesResult.value.data : null;
      
      return {
        slaRisks: slaData?.sla_predictions?.filter(p => p.risk === '🔴' || p.risk === '🟠').length || 0,
        highPriorityItems: prioritiesData?.priorities?.slice(0, 5) || [],
        recommendations: [
          'Réaffecter les dossiers critiques',
          'Augmenter les ressources pour les équipes surchargées',
          'Optimiser les processus de traitement'
        ]
      };
    } catch (error: any) {
      console.warn('Dashboard AI insights unavailable:', error.message);
      return {
        slaRisks: 0,
        highPriorityItems: [],
        recommendations: ['Service IA temporairement indisponible - Données de base utilisées']
      };
    }
  }
  
  private async getSLAPredictions(bordereaux: any[]) {
    try {
      const token = await this.getAIToken();
      const analysisData = bordereaux.map(b => ({
        id: b.id,
        start_date: b.dateReception,
        deadline: new Date(new Date(b.dateReception!).getTime() + (b.delaiReglement || 5) * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut) ? 100 : 
                         ['EN_COURS', 'ASSIGNE'].includes(b.statut) ? 50 : 10,
        total_required: 100
      }));
      
      const response = await axios.post(`${AI_MICROSERVICE_URL}/sla_prediction`, analysisData, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      return response.data.sla_predictions || [];
    } catch (error) {
      return [];
    }
  }
  
  private async getPerformanceRecommendations(performanceData: any[]) {
    try {
      const token = await this.getAIToken();
      const payload = {
        managers: performanceData.map(p => ({
          id: p.userId,
          avg_time: p.avgProcessingTime,
          norm_time: 3, // Standard processing time
          workload: p.workload
        })),
        threshold: 1.5
      };
      
      const response = await axios.post(`${AI_MICROSERVICE_URL}/reassignment`, payload, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000
      });
      
      return response.data.reassignment || [];
    } catch (error: any) {
      console.warn('Performance recommendations unavailable:', error.message);
      return [];
    }
  }
  
  private async getAIAlerts(where: any, user: any) {
    try {
      // Get current workload data
      const workloadData = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId'],
        where: { ...where, statut: { in: ['ASSIGNE', 'EN_COURS'] } },
        _count: { id: true }
      });
      
      const token = await this.getAIToken();
      const payload = {
        context: {
          team_workloads: workloadData.map(w => ({
            team_id: w.assignedToUserId,
            workload: w._count.id
          }))
        },
        decision_type: 'workload_rebalancing'
      };
      
      const response = await axios.post(`${AI_MICROSERVICE_URL}/automated_decisions`, payload, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000
      });
      
      return (response.data.decisions || []).map(decision => ({
        id: `ai_${Date.now()}_${Math.random()}`,
        alertType: 'AI_RECOMMENDATION',
        alertLevel: decision.priority?.toUpperCase() || 'MEDIUM',
        message: decision.action || 'Recommandation IA',
        reason: decision.recommendations?.join(', ') || 'Optimisation suggérée',
        createdAt: new Date(),
        source: 'AI_ENGINE'
      }));
    } catch (error: any) {
      console.warn('AI alerts unavailable:', error.message);
      return [];
    }
  }
  
  private getFallbackKpis(filters: any) {
    return {
      totalBordereaux: 0,
      bsProcessed: 0,
      bsRejected: 0,
      bsInProgress: 0,
      bsPending: 0,
      pendingReclamations: 0,
      slaBreaches: 0,
      overdueVirements: 0,
      avgProcessingTime: 0,
      slaCompliance: 100,
      processingRate: 0,
      totalBulletinSoins: 0,
      totalAmount: 0,
      aiInsights: {
        slaRisks: 0,
        highPriorityItems: [],
        recommendations: ['Service temporairement indisponible']
      },
      appliedFilters: filters,
      lastUpdated: new Date().toISOString(),
      userRole: 'UNKNOWN'
    };
  }

  // Real-time dashboard for different roles
  async getRoleBasedDashboard(user: any, filters: any = {}) {
    const baseData = await Promise.all([
      this.getKpis(user, filters),
      this.getPerformance(user, filters),
      this.getSlaStatus(user, filters),
      this.getAlerts(user, filters)
    ]);
    
    const [kpis, performance, slaStatus, alerts] = baseData;
    
    switch (user.role) {
      case 'SUPER_ADMIN':
        return this.getSuperAdminDashboard(kpis, performance, slaStatus, alerts, user, filters);
      case 'CHEF_EQUIPE':
        return this.getChefEquipeDashboard(kpis, performance, slaStatus, alerts, user, filters);
      case 'GESTIONNAIRE':
        return this.getGestionnaireDashboard(kpis, performance, slaStatus, alerts, user, filters);
      case 'FINANCE':
        return this.getFinanceDashboard(kpis, performance, slaStatus, alerts, user, filters);
      default:
        return { kpis, performance, slaStatus, alerts };
    }
  }
  
  private async getSuperAdminDashboard(kpis: any, performance: any, slaStatus: any, alerts: any, user: any, filters: any) {
    // Get additional super admin specific data
    const [departmentStats, clientStats, financialSummary] = await Promise.all([
      this.getDepartmentStatistics(),
      this.getClientStatistics(),
      this.getFinancialSummary()
    ]);
    
    return {
      kpis,
      performance,
      slaStatus,
      alerts,
      departmentStats,
      clientStats,
      financialSummary,
      role: 'SUPER_ADMIN',
      permissions: ['VIEW_ALL', 'EXPORT', 'MANAGE_USERS', 'SYSTEM_CONFIG']
    };
  }
  
  private async getChefEquipeDashboard(kpis: any, performance: any, slaStatus: any, alerts: any, user: any, filters: any) {
    // Get team-specific data
    const teamMembers = await this.prisma.user.findMany({
      where: { department: user.department },
      select: { id: true, fullName: true, role: true }
    });
    
    const teamWorkload = await this.getTeamWorkload(user.id);
    
    return {
      kpis,
      performance: {
        ...performance,
        teamMembers,
        teamWorkload
      },
      slaStatus,
      alerts,
      role: 'CHEF_EQUIPE',
      permissions: ['VIEW_TEAM', 'ASSIGN_TASKS', 'VIEW_PERFORMANCE']
    };
  }
  
  private async getGestionnaireDashboard(kpis: any, performance: any, slaStatus: any, alerts: any, user: any, filters: any) {
    // Get personal workload and tasks
    const personalTasks = await this.prisma.bordereau.findMany({
      where: { assignedToUserId: user.id, statut: { in: ['ASSIGNE', 'EN_COURS'] } },
      include: { client: true },
      orderBy: { dateReception: 'asc' },
      take: 10
    });
    
    return {
      kpis,
      performance,
      slaStatus,
      alerts,
      personalTasks,
      role: 'GESTIONNAIRE',
      permissions: ['VIEW_PERSONAL', 'PROCESS_TASKS']
    };
  }
  
  private async getFinanceDashboard(kpis: any, performance: any, slaStatus: any, alerts: any, user: any, filters: any) {
    // Get financial specific data
    const virements = await this.prisma.virement.findMany({
      where: { confirmed: false },
      include: { bordereau: { include: { client: true } } },
      orderBy: { dateDepot: 'asc' },
      take: 20
    });
    
    const financialStats = await this.getFinancialStatistics();
    
    return {
      kpis,
      performance,
      slaStatus,
      alerts,
      virements,
      financialStats,
      role: 'FINANCE',
      permissions: ['VIEW_FINANCE', 'CONFIRM_VIREMENTS', 'EXPORT_FINANCE']
    };
  }
  
  private async getDepartmentStatistics() {
    const stats = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true }
    });
    
    return stats.map(s => ({
      department: this.mapStatusToDepartment(s.statut),
      status: s.statut,
      count: s._count.id
    }));
  }
  
  private async getClientStatistics() {
    return await this.prisma.client.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            bordereaux: true,
            reclamations: true
          }
        }
      },
      orderBy: {
        bordereaux: {
          _count: 'desc'
        }
      },
      take: 10
    });
  }
  
  private async getFinancialSummary() {
    const [totalAmount, confirmedAmount, pendingCount] = await Promise.all([
      this.prisma.bulletinSoin.aggregate({
        _sum: { totalPec: true }
      }),
      this.prisma.virement.aggregate({
        _sum: { montant: true },
        where: { confirmed: true }
      }),
      this.prisma.virement.count({
        where: { confirmed: false }
      })
    ]);
    
    return {
      totalAmount: totalAmount._sum.totalPec || 0,
      confirmedAmount: confirmedAmount._sum.montant || 0,
      pendingVirements: pendingCount
    };
  }
  
  private async getTeamWorkload(teamLeaderId: string) {
    return await this.prisma.bordereau.groupBy({
      by: ['assignedToUserId'],
      where: {
        teamId: teamLeaderId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      },
      _count: { id: true }
    });
  }
  
  private async getFinancialStatistics() {
    const [dailyVirements, monthlyVirements, avgAmount] = await Promise.all([
      this.prisma.virement.count({
        where: {
          dateDepot: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      this.prisma.virement.count({
        where: {
          dateDepot: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.virement.aggregate({
        _avg: { montant: true }
      })
    ]);
    
    return {
      dailyVirements,
      monthlyVirements,
      avgAmount: avgAmount._avg.montant || 0
    };
  }
  
  private mapStatusToDepartment(status: string): string {
    const mapping = {
      'EN_ATTENTE': 'Bureau d\'Ordre',
      'A_SCANNER': 'Bureau d\'Ordre',
      'SCAN_EN_COURS': 'Service SCAN',
      'SCANNE': 'Service SCAN',
      'A_AFFECTER': 'Chef d\'Équipe',
      'ASSIGNE': 'Gestionnaire',
      'EN_COURS': 'Gestionnaire',
      'TRAITE': 'Gestionnaire',
      'PRET_VIREMENT': 'Finance',
      'VIREMENT_EN_COURS': 'Finance',
      'VIREMENT_EXECUTE': 'Finance',
      'CLOTURE': 'Clôturé'
    };
    return mapping[status] || 'Inconnu';
  }
}