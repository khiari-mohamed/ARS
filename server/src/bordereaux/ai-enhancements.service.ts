import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class AIEnhancementsService {
  private readonly logger = new Logger(AIEnhancementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * AI Load Forecasting - Missing from current implementation
   */
  async getAILoadForecast(clientId?: string, days: number = 7): Promise<any> {
    try {
      // Get historical data for forecasting
      const historicalData = await this.prisma.bordereau.findMany({
        where: {
          ...(clientId && { clientId }),
          dateReception: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        },
        include: { client: true },
        orderBy: { dateReception: 'asc' }
      });

      if (historicalData.length < 14) {
        return { forecast: [], error: 'Insufficient historical data' };
      }

      // Call AI forecasting service
      const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL}/forecast_client_load`, {
        client_id: clientId,
        forecast_days: days
      }, {
        headers: { 'Authorization': `Bearer ${await this.getAIToken()}` },
        timeout: 15000
      });

      return {
        forecast: aiResponse.data.client_forecasts,
        staffing_recommendations: aiResponse.data.staffing_recommendations,
        capacity_analysis: aiResponse.data.capacity_analysis,
        ai_powered: true
      };
    } catch (error) {
      this.logger.error('AI load forecasting failed:', error.message);
      return { forecast: [], error: 'AI service unavailable' };
    }
  }

  /**
   * AI Performance Analytics with Root Cause Analysis
   */
  async getAIPerformanceAnalytics(filters: any = {}): Promise<any> {
    try {
      const agents = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        include: {
          bordereaux: {
            where: { 
              statut: { in: ['TRAITE', 'CLOTURE'] },
              ...(filters.dateStart && { dateReception: { gte: new Date(filters.dateStart) } })
            }
          }
        }
      });

      // Prepare performance data for AI analysis
      const performanceData = agents.map(agent => ({
        agent_id: agent.id,
        agent_name: agent.fullName,
        total_processed: agent.bordereaux.length,
        avg_processing_time: this.calculateAvgProcessingTime(agent.bordereaux),
        sla_compliance_rate: this.calculateSLACompliance(agent.bordereaux),
        complexity_handled: this.calculateComplexityScore(agent.bordereaux)
      }));

      // Call AI performance analysis
      const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL}/performance`, {
        users: performanceData,
        period: filters.period || 'current_month'
      }, {
        headers: { 'Authorization': `Bearer ${await this.getAIToken()}` },
        timeout: 15000
      });

      return {
        performance_analysis: aiResponse.data.performance,
        root_causes: await this.identifyRootCauses(performanceData),
        recommendations: await this.generatePerformanceRecommendations(performanceData),
        ai_powered: true
      };
    } catch (error) {
      this.logger.error('AI performance analytics failed:', error.message);
      return { error: 'AI service unavailable' };
    }
  }

  /**
   * AI Complaints Intelligence - Enhanced implementation
   */
  async getAIComplaintsIntelligence(): Promise<any> {
    try {
      const complaints = await this.prisma.reclamation.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: { client: true, bordereau: true }
      });

      if (complaints.length < 3) {
        return { insights: [], auto_replies: [] };
      }

      // Call AI complaints intelligence
      const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL}/complaints_intelligence`, {
        period_days: 30
      }, {
        headers: { 'Authorization': `Bearer ${await this.getAIToken()}` },
        timeout: 15000
      });

      return {
        insights: aiResponse.data.insights,
        auto_replies: aiResponse.data.auto_replies,
        correlations: aiResponse.data.correlations,
        performance_ranking: aiResponse.data.performance_ranking,
        ai_powered: true
      };
    } catch (error) {
      this.logger.error('AI complaints intelligence failed:', error.message);
      return { insights: [], auto_replies: [] };
    }
  }

  /**
   * AI Daily Priority Queues - Missing from current implementation
   */
  async generateDailyPriorityQueues(userId?: string): Promise<any> {
    try {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          ...(userId && { assignedToUserId: userId }),
          archived: false
        },
        include: { client: true, contract: true }
      });

      if (bordereaux.length === 0) {
        return { priority_queues: [] };
      }

      // Prepare data for AI prioritization
      const priorityData = bordereaux.map(b => {
        const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
        
        return {
          id: b.id,
          sla_urgency: Math.max(0, daysSinceReception - slaThreshold + 5),
          volume: b.nombreBS || 1,
          client_importance: b.client?.name?.includes('IMPORTANT') ? 3 : 1,
          deadline: new Date(new Date(b.dateReception).getTime() + slaThreshold * 24 * 60 * 60 * 1000).toISOString()
        };
      });

      // Call AI prioritization service
      const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL}/priorities`, priorityData, {
        params: { explain: true },
        headers: { 'Authorization': `Bearer ${await this.getAIToken()}` },
        timeout: 15000
      });

      const priorities = aiResponse.data.priorities || [];
      
      // Map results back to bordereaux
      const priorityQueues = priorities.map((p: any) => {
        const bordereau = bordereaux.find(b => b.id === p.id);
        return {
          bordereau_id: p.id,
          reference: bordereau?.reference,
          priority_score: p.priority_score,
          explanation: p.explanation,
          recommended_order: priorities.indexOf(p) + 1,
          estimated_completion: this.estimateCompletionTime(bordereau, p.priority_score)
        };
      });

      return {
        priority_queues: priorityQueues,
        generated_at: new Date().toISOString(),
        ai_powered: true
      };
    } catch (error) {
      this.logger.error('AI priority queue generation failed:', error.message);
      return { priority_queues: [] };
    }
  }

  /**
   * AI Capacity Planning - Enhanced implementation
   */
  async getAICapacityPlanning(forecastDays: number = 30): Promise<any> {
    try {
      // Get current workload and team data
      const currentWorkload = await this.prisma.bordereau.count({
        where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
      });

      const teams = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        include: {
          bordereaux: {
            where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
          }
        }
      });

      // Get forecast data
      const forecast = await this.getAILoadForecast(undefined, forecastDays);

      // Call AI capacity planning
      const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL}/predict_resources`, {
        current_workload: currentWorkload,
        teams: teams.map(t => ({
          id: t.id,
          name: t.fullName,
          current_load: t.bordereaux.length,
          capacity: 10 // Average capacity per gestionnaire
        })),
        forecast_data: forecast.forecast,
        planning_horizon: forecastDays
      }, {
        headers: { 'Authorization': `Bearer ${await this.getAIToken()}` },
        timeout: 15000
      });

      return {
        current_capacity: teams.length,
        required_capacity: aiResponse.data.required_managers,
        capacity_gap: Math.max(0, aiResponse.data.required_managers - teams.length),
        utilization_rate: currentWorkload / (teams.length * 10) * 100,
        recommendations: aiResponse.data.recommendations || [],
        forecast_accuracy: forecast.capacity_analysis?.accuracy || 0.85,
        ai_powered: true
      };
    } catch (error) {
      this.logger.error('AI capacity planning failed:', error.message);
      return { capacity_gap: 0, error: 'AI service unavailable' };
    }
  }

  // Helper methods
  private calculateAvgProcessingTime(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 0;
    
    const totalTime = bordereaux.reduce((sum, b) => {
      if (b.dateCloture) {
        const days = Math.floor((new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum;
    }, 0);
    
    return totalTime / bordereaux.length;
  }

  private calculateSLACompliance(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 1;
    
    const compliant = bordereaux.filter(b => {
      if (b.dateCloture) {
        const processingDays = Math.floor((new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        return processingDays <= b.delaiReglement;
      }
      return false;
    }).length;
    
    return compliant / bordereaux.length;
  }

  private calculateComplexityScore(bordereaux: any[]): number {
    if (bordereaux.length === 0) return 1;
    
    const avgBS = bordereaux.reduce((sum, b) => sum + (b.nombreBS || 1), 0) / bordereaux.length;
    return Math.min(5, Math.max(1, avgBS / 10));
  }

  private async identifyRootCauses(performanceData: any[]): Promise<any[]> {
    const rootCauses: any[] = [];
    
    // Identify low performers
    const avgPerformance = performanceData.reduce((sum, p) => sum + p.sla_compliance_rate, 0) / performanceData.length;
    const lowPerformers = performanceData.filter(p => p.sla_compliance_rate < avgPerformance * 0.8);
    
    if (lowPerformers.length > 0) {
      rootCauses.push({
        type: 'PERFORMANCE_ISSUE',
        description: `${lowPerformers.length} gestionnaires avec performance en dessous de la moyenne`,
        affected_agents: lowPerformers.map(p => p.agent_name),
        recommended_action: 'Formation ciblée sur les processus complexes'
      });
    }
    
    return rootCauses;
  }

  private async generatePerformanceRecommendations(performanceData: any[]): Promise<any[]> {
    const recommendations: any[] = [];
    
    // Workload balancing recommendations
    const workloads = performanceData.map(p => p.total_processed);
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    
    if (maxWorkload > minWorkload * 1.5) {
      recommendations.push({
        type: 'WORKLOAD_BALANCING',
        priority: 'HIGH',
        description: 'Déséquilibre de charge détecté entre gestionnaires',
        action: 'Redistribuer les dossiers pour équilibrer la charge'
      });
    }
    
    return recommendations;
  }

  private estimateCompletionTime(bordereau: any, priorityScore: number): string {
    const baseTime = 2; // Base processing time in days
    const urgencyFactor = priorityScore > 10 ? 0.5 : 1;
    const estimatedDays = Math.ceil(baseTime * urgencyFactor);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);
    
    return completionDate.toISOString();
  }

  private async getAIToken(): Promise<string> {
    try {
      const response = await axios.post(`${process.env.AI_MICROSERVICE_URL}/token`, 
        new URLSearchParams({
          grant_type: 'password',
          username: 'admin',
          password: 'secret'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000
        }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error('AI service authentication failed');
    }
  }
}