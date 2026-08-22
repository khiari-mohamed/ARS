import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';
const AI_USERNAME = process.env.AI_USERNAME || 'admin';
const AI_PASSWORD = process.env.AI_PASSWORD || 'secret';

@Injectable()
export class DashboardAiService {
  constructor(private prisma: PrismaService) {}

  // Moved verbatim from DashboardService.buildUserFilters — needed here so
  // getAIAlerts / getAIWorkforceRecommendations can build the same role-based
  // `where` clause without depending on DashboardService internals.
  private buildUserFilters(user: any, filters: any = {}) {
    const where: any = {
      archived: false
    };

    if (user.role === 'GESTIONNAIRE') {
      where.assignedToUserId = user.id;
    } else if (user.role === 'GESTIONNAIRE_SENIOR') {
      where.OR = [
        { assignedToUserId: user.id },
        { contract: { teamLeaderId: user.id } }
      ];
    } else if (user.role === 'CHEF_EQUIPE') {
      where.OR = [
        { assignedToUserId: user.id },
        { contract: { teamLeaderId: user.id } }
      ];
    } else if (user.role === 'BO') {
      where.statut = { in: ['EN_ATTENTE', 'A_SCANNER'] };
    } else if (user.role === 'SCAN') {
      where.statut = { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] };
    }

    if (filters.fromDate || filters.toDate) {
      where.dateReception = {};
      if (filters.fromDate) where.dateReception.gte = new Date(filters.fromDate);
      if (filters.toDate) where.dateReception.lte = new Date(filters.toDate);
    }

    if (filters.departmentId && filters.departmentId !== 'all') {
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

  // Moved verbatim from DashboardService.getAIToken
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
            timeout: 300000
          });

          return tokenResponse.data.access_token;
        } catch (credError: any) {
          continue;
        }
      }
      throw new Error('All credentials failed');
    } catch (error: any) {
      console.error('🚫 Dashboard AI authentication failed:', error.message);
      throw new Error('AI authentication failed');
    }
  }

  // Moved verbatim from DashboardService.getPerformanceRecommendations
  async getPerformanceRecommendations(performanceData: any[]) {
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
        timeout: 300000
      });

      return response.data.reassignment || [];
    } catch (error: any) {
      console.warn('Performance recommendations unavailable:', error.message);
      return [];
    }
  }

  // Moved verbatim from DashboardService.getAIAlerts
  async getAIAlerts(where: any, user: any) {
    try {
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
        timeout: 300000
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

  // Convenience wrapper so the controller doesn't need to know about buildUserFilters.
  async getAIAlertsForUser(user: any, filters: any = {}) {
    const where = this.buildUserFilters(user, filters);
    return this.getAIAlerts(where, user);
  }

  // Moved verbatim from DashboardService.getAIWorkforceRecommendations
  async getAIWorkforceRecommendations(currentStaff: number, requiredStaff: number, currentWorkload: number): Promise<string[]> {
    try {
      const token = await this.getAIToken();
      const workloadData = await this.prisma.bordereau.groupBy({
        by: ['assignedToUserId'],
        where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } },
        _count: { id: true }
      });

      const response = await axios.post(`${AI_MICROSERVICE_URL}/recommendations`, {
        workload: workloadData.map(w => ({ teamId: w.assignedToUserId, _count: { id: w._count.id } }))
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 300000
      });

      const aiRecommendations = response.data.recommendations || [];
      return aiRecommendations.slice(0, 3).map((rec: any) =>
        rec.title || rec.recommendation || rec.description || 'Recommandation IA'
      );
    } catch (error) {
      const recommendations: string[] = [];
      if (requiredStaff > currentStaff) {
        recommendations.push(`Ajouter ${requiredStaff - currentStaff} gestionnaire(s) pour traiter la charge actuelle`);
      } else {
        recommendations.push('Effectif optimal pour la charge actuelle');
      }
      recommendations.push('Optimiser la répartition des tâches entre équipes');
      recommendations.push('Former les nouveaux gestionnaires sur les processus ARS');
      return recommendations;
    }
  }
}