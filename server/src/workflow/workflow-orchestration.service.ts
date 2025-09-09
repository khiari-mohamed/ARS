import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamRoutingService } from './team-routing.service';
import { ComprehensiveNotificationService } from './comprehensive-notification.service';
import { TeamWorkloadConfigService } from './team-workload-config.service';

export interface WorkflowStep {
  service: 'BO' | 'SCAN' | 'SANTE' | 'FINANCE';
  action: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startTime?: Date;
  endTime?: Date;
  assignedTo?: string;
  notes?: string;
}

export interface WorkflowExecution {
  bordereauId: string;
  currentStep: number;
  steps: WorkflowStep[];
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
}

@Injectable()
export class WorkflowOrchestrationService {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(
    private prisma: PrismaService,
    private teamRouting: TeamRoutingService,
    private notifications: ComprehensiveNotificationService,
    private workloadConfig: TeamWorkloadConfigService
  ) {}

  // === WORKFLOW ORCHESTRATION ===

  async initializeWorkflow(bordereauId: string): Promise<WorkflowExecution> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true, contract: true }
    });

    if (!bordereau) {
      throw new Error('Bordereau not found');
    }

    // Define workflow steps based on bordereau type and client configuration
    const steps = await this.defineWorkflowSteps(bordereau);

    const execution: WorkflowExecution = {
      bordereauId,
      currentStep: 0,
      steps,
      status: 'ACTIVE',
      startTime: new Date()
    };

    // Store workflow execution state
    await this.saveWorkflowExecution(execution);

    // Start first step
    await this.executeNextStep(execution);

    return execution;
  }

  private async defineWorkflowSteps(bordereau: any): Promise<WorkflowStep[]> {
    const baseSteps: WorkflowStep[] = [
      {
        service: 'BO',
        action: 'INITIAL_ENTRY',
        status: 'COMPLETED', // Already done when bordereau is created
        startTime: bordereau.dateReceptionBO || bordereau.dateReception,
        endTime: bordereau.dateReceptionBO || bordereau.dateReception
      },
      {
        service: 'SCAN',
        action: 'DIGITIZATION',
        status: bordereau.statut === 'SCANNE' ? 'COMPLETED' : 'PENDING',
        startTime: bordereau.dateDebutScan,
        endTime: bordereau.dateFinScan
      },
      {
        service: 'SANTE',
        action: 'MEDICAL_PROCESSING',
        status: ['TRAITE', 'PRET_VIREMENT'].includes(bordereau.statut) ? 'COMPLETED' : 'PENDING'
      },
      {
        service: 'FINANCE',
        action: 'PAYMENT_PROCESSING',
        status: ['VIREMENT_EXECUTE', 'CLOTURE'].includes(bordereau.statut) ? 'COMPLETED' : 'PENDING'
      }
    ];

    // Add conditional steps based on client configuration
    if (bordereau.client.slaConfig?.requiresApproval) {
      baseSteps.splice(2, 0, {
        service: 'SANTE',
        action: 'APPROVAL_REQUIRED',
        status: 'PENDING'
      });
    }

    // Add reclamation handling if needed
    const hasReclamations = await this.prisma.reclamation.count({
      where: { bordereauId: bordereau.id, status: { not: 'CLOSED' } }
    });

    if (hasReclamations > 0) {
      baseSteps.push({
        service: 'SANTE',
        action: 'HANDLE_RECLAMATIONS',
        status: 'PENDING'
      });
    }

    return baseSteps;
  }

  async executeNextStep(execution: WorkflowExecution): Promise<void> {
    let currentStep = execution.steps[execution.currentStep];
    
    if (!currentStep || currentStep.status === 'COMPLETED') {
      // Move to next step
      execution.currentStep++;
      if (execution.currentStep >= execution.steps.length) {
        await this.completeWorkflow(execution);
        return;
      }
      currentStep = execution.steps[execution.currentStep];
    }

    if (!currentStep) return;

    try {
      currentStep.status = 'IN_PROGRESS';
      currentStep.startTime = new Date();

      switch (currentStep.service) {
        case 'SCAN':
          await this.executeScanStep(execution.bordereauId, currentStep);
          break;
        case 'SANTE':
          await this.executeSanteStep(execution.bordereauId, currentStep);
          break;
        case 'FINANCE':
          await this.executeFinanceStep(execution.bordereauId, currentStep);
          break;
      }

      await this.saveWorkflowExecution(execution);
    } catch (error) {
      currentStep.status = 'FAILED';
      currentStep.notes = error.message;
      execution.status = 'FAILED';
      
      await this.handleWorkflowFailure(execution, error);
      this.logger.error(`Workflow step failed: ${error.message}`);
    }
  }

  private async executeScanStep(bordereauId: string, step: WorkflowStep): Promise<void> {
    // Notify SCAN team
    await this.notifications.notifyBOToScan(bordereauId, 'SYSTEM');
    
    // Update bordereau status
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: 'A_SCANNER' }
    });

    step.status = 'COMPLETED';
    step.endTime = new Date();
  }

  private async executeSanteStep(bordereauId: string, step: WorkflowStep): Promise<void> {
    // Route to appropriate team
    const teamId = await this.teamRouting.routeToTeam(bordereauId);
    
    if (teamId) {
      step.assignedTo = teamId;
      await this.notifications.notifyScanToChef(bordereauId, teamId);
    }

    if (step.action === 'MEDICAL_PROCESSING') {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: 'A_AFFECTER', teamId }
      });
    }

    step.status = 'COMPLETED';
    step.endTime = new Date();
  }

  private async executeFinanceStep(bordereauId: string, step: WorkflowStep): Promise<void> {
    // Check if ordre de virement exists
    const ordreVirement = await this.prisma.ordreVirement.findFirst({
      where: { bordereauId }
    });

    if (ordreVirement) {
      await this.notifications.notifySanteToFinance(ordreVirement.id, 'SYSTEM');
    }

    step.status = 'COMPLETED';
    step.endTime = new Date();
  }

  private async completeWorkflow(execution: WorkflowExecution): Promise<void> {
    execution.status = 'COMPLETED';
    execution.endTime = new Date();
    execution.totalDuration = execution.endTime.getTime() - execution.startTime.getTime();

    await this.prisma.bordereau.update({
      where: { id: execution.bordereauId },
      data: { statut: 'CLOTURE', dateCloture: execution.endTime }
    });

    await this.saveWorkflowExecution(execution);
    
    this.logger.log(`Workflow completed for bordereau ${execution.bordereauId} in ${execution.totalDuration}ms`);
  }

  private async handleWorkflowFailure(execution: WorkflowExecution, error: any): Promise<void> {
    // Notify Super Admin of workflow failure
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', active: true }
    });

    for (const admin of superAdmins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'WORKFLOW_FAILURE',
          title: 'Échec du workflow',
          message: `Workflow failed for bordereau ${execution.bordereauId}: ${error.message}`,
          data: { bordereauId: execution.bordereauId, error: error.message }
        }
      });
    }

    await this.saveWorkflowExecution(execution);
  }

  // === WORKFLOW STATE MANAGEMENT ===

  private async saveWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    // Store in database or cache for persistence
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'WORKFLOW_STATE_UPDATE',
        details: {
          bordereauId: execution.bordereauId,
          currentStep: execution.currentStep,
          status: execution.status,
          steps: execution.steps
        }
      }
    });
  }

  async getWorkflowExecution(bordereauId: string): Promise<WorkflowExecution | null> {
    const latestLog = await this.prisma.auditLog.findFirst({
      where: {
        action: 'WORKFLOW_STATE_UPDATE',
        details: {
          path: ['bordereauId'],
          equals: bordereauId
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestLog) return null;

    return latestLog.details as any;
  }

  // === WORKFLOW MONITORING ===

  async getActiveWorkflows(): Promise<WorkflowExecution[]> {
    const activeBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: { not: 'CLOTURE' },
        archived: false
      }
    });

    const workflows: WorkflowExecution[] = [];
    for (const bordereau of activeBordereaux) {
      const execution = await this.getWorkflowExecution(bordereau.id);
      if (execution) {
        workflows.push(execution);
      }
    }

    return workflows;
  }

  async getWorkflowMetrics(): Promise<any> {
    const [totalWorkflows, activeWorkflows, completedWorkflows, failedWorkflows] = await Promise.all([
      this.prisma.auditLog.count({
        where: { action: 'WORKFLOW_STATE_UPDATE' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: { not: 'CLOTURE' },
          archived: false
        }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'CLOTURE' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'EN_DIFFICULTE' }
      })
    ]);

    return {
      totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      completionRate: totalWorkflows > 0 ? (completedWorkflows / totalWorkflows) * 100 : 0
    };
  }

  async getWorkflowBottlenecks(): Promise<any[]> {
    const activeWorkflows = await this.getActiveWorkflows();
    const bottlenecks = new Map<string, { count: number; avgDuration: number; workflows: string[] }>();

    activeWorkflows.forEach(workflow => {
      const currentStep = workflow.steps[workflow.currentStep];
      if (currentStep && currentStep.status === 'IN_PROGRESS') {
        const key = `${currentStep.service}_${currentStep.action}`;
        const duration = currentStep.startTime ? Date.now() - currentStep.startTime.getTime() : 0;
        
        if (!bottlenecks.has(key)) {
          bottlenecks.set(key, { count: 0, avgDuration: 0, workflows: [] });
        }
        
        const bottleneck = bottlenecks.get(key)!;
        bottleneck.count++;
        bottleneck.avgDuration = (bottleneck.avgDuration + duration) / bottleneck.count;
        bottleneck.workflows.push(workflow.bordereauId);
      }
    });

    return Array.from(bottlenecks.entries()).map(([step, data]) => ({
      step,
      ...data,
      avgDurationHours: data.avgDuration / (1000 * 60 * 60)
    })).sort((a, b) => b.count - a.count);
  }

  async optimizeWorkflowRouting(): Promise<{
    recommendations: string[];
    optimizations: any[];
    estimatedImprovement: number;
  }> {
    const bottlenecks = await this.getWorkflowBottlenecks();
    const workloadAnalytics = await this.workloadConfig.getWorkloadAnalytics();
    
    const recommendations: string[] = [];
    const optimizations: any[] = [];

    bottlenecks.forEach(bottleneck => {
      if (bottleneck.count > 10) {
        recommendations.push(`Goulot d'étranglement détecté: ${bottleneck.step} (${bottleneck.count} dossiers)`);
        
        if (bottleneck.avgDurationHours > 24) {
          recommendations.push(`Durée excessive pour ${bottleneck.step}: ${bottleneck.avgDurationHours.toFixed(1)}h en moyenne`);
        }
      }
    });

    const overloadedTeams = workloadAnalytics.filter(t => t.status === 'OVERLOADED');
    const underutilizedTeams = workloadAnalytics.filter(t => t.utilizationRate < 60);

    if (overloadedTeams.length > 0 && underutilizedTeams.length > 0) {
      optimizations.push({
        type: 'LOAD_BALANCING',
        from: overloadedTeams.map(t => t.teamName),
        to: underutilizedTeams.map(t => t.teamName),
        estimatedReduction: '20-30%'
      });
    }

    const scanBottlenecks = bottlenecks.filter(b => b.step.startsWith('SCAN'));
    if (scanBottlenecks.length > 0) {
      recommendations.push('Considérer l\'augmentation de la capacité de numérisation');
      optimizations.push({
        type: 'CAPACITY_INCREASE',
        service: 'SCAN',
        recommendation: 'Ajouter 1-2 opérateurs de numérisation'
      });
    }

    const estimatedImprovement = Math.min(
      recommendations.length * 10 + optimizations.length * 15,
      80
    );

    return {
      recommendations,
      optimizations,
      estimatedImprovement
    };
  }

  async pauseWorkflow(bordereauId: string, reason: string): Promise<void> {
    const execution = await this.getWorkflowExecution(bordereauId);
    if (!execution) return;

    execution.status = 'PAUSED';
    await this.saveWorkflowExecution(execution);

    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: 'MIS_EN_INSTANCE' }
    });

    this.logger.log(`Workflow paused for bordereau ${bordereauId}: ${reason}`);
  }

  async resumeWorkflow(bordereauId: string): Promise<void> {
    const execution = await this.getWorkflowExecution(bordereauId);
    if (!execution || execution.status !== 'PAUSED') return;

    execution.status = 'ACTIVE';
    await this.saveWorkflowExecution(execution);
    await this.executeNextStep(execution);

    this.logger.log(`Workflow resumed for bordereau ${bordereauId}`);
  }
}