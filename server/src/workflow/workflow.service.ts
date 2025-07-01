import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../ged/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowTask, WorkflowAssignment } from './interfaces/workflow.interface';
import { TASK_TYPES, WORKFLOW_PRIORITY, SLA_TIMEFRAMES } from './workflow.constants';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AssignTaskDto } from './dto/assign-task.dto';
import { WorkflowKpiDto } from './dto/workflow-kpi.dto';
import { WorkflowPriorityDto } from './dto/workflow-priority.dto';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private bordereauxService: BordereauxService,
    private alertsService: AlertsService,
    private analyticsService: AnalyticsService,
    private notificationService: NotificationService
  ) {}


    async getAssignmentHistory(assignmentId: string) {
    return this.prisma.workflowAssignmentHistory.findMany({
      where: { assignmentId },
      orderBy: { updatedAt: 'asc' }
    });
  }
  // Manual priority override for any task type
  async setTaskPriority(dto: WorkflowPriorityDto) {
    const { taskId, priority } = dto;
    let updated = false;
    // Bordereau
    const bord = await this.prisma.bordereau.updateMany({ where: { id: taskId }, data: { priority } });
    if (bord.count > 0) updated = true;
    // BulletinSoin
    const bs = await this.prisma.bulletinSoin.updateMany({ where: { id: taskId }, data: { priority } });
    if (bs.count > 0) updated = true;
    // Reclamation
    const rec = await this.prisma.reclamation.updateMany({ where: { id: taskId }, data: { priority } });
    if (rec.count > 0) updated = true;
    // Virement
    const vir = await this.prisma.virement.updateMany({ where: { id: taskId }, data: { priority } });
    if (vir.count > 0) updated = true;
    if (!updated) throw new Error('Task not found');
    return { success: true };
  }

  async getAllAssignments() {
    // Optionally include assignee name for display
    const assignments = await this.prisma.workflowAssignment.findMany({
      include: { user: true }
    });
    return assignments.map(a => ({
      ...a,
      assigneeName: a.user ? a.user.fullName : undefined
    }));
  }
  
  async getAssignmentById(id: string) {
    const assignment = await this.prisma.workflowAssignment.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!assignment) throw new Error('Assignment not found');
    return {
      ...assignment,
      assigneeName: assignment.user ? assignment.user.fullName : undefined
    };
  }

  async updateAssignment(id: string, data: any, updatedByUserId?: string) {
    // Fetch previous assignment for audit
    const prev = await this.prisma.workflowAssignment.findUnique({ where: { id } });
    const assignment = await this.prisma.workflowAssignment.update({
      where: { id },
      data,
      include: { user: true }
    });
    // Audit log
    await this.prisma.workflowAssignmentHistory.create({
      data: {
        assignmentId: id,
        updatedByUserId: updatedByUserId || null,
        updatedAt: new Date(),
        prevStatus: prev?.status,
        newStatus: assignment.status,
        prevNotes: prev?.notes,
        newNotes: assignment.notes
      }
    });
    // SLA check if completed
    if (assignment.status === 'COMPLETED') {
      // Find dueDate from task type
      let dueDate: Date | undefined;
      if (assignment.taskType === 'BORDEREAU_SCAN') {
        const bord = await this.prisma.bordereau.findUnique({ where: { id: assignment.taskId } });
        if (bord) dueDate = new Date(new Date(bord.dateReception).getTime() + SLA_TIMEFRAMES.SCAN * 60 * 60 * 1000);
      } else if (assignment.taskType === 'BS_VALIDATION') {
        const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: assignment.taskId } });
        if (bs) dueDate = new Date(new Date(bs.dateCreation).getTime() + SLA_TIMEFRAMES.VALIDATION * 60 * 60 * 1000);
      } else if (assignment.taskType === 'RECLAMATION') {
        const rec = await this.prisma.reclamation.findUnique({ where: { id: assignment.taskId } });
        if (rec) dueDate = new Date(new Date(rec.createdAt).getTime() + SLA_TIMEFRAMES.RECLAMATION * 60 * 60 * 1000);
      } else if (assignment.taskType === 'VIREMENT') {
        const vir = await this.prisma.virement.findUnique({ where: { id: assignment.taskId } });
        if (vir) dueDate = new Date(new Date(vir.dateDepot).getTime() + SLA_TIMEFRAMES.PAYMENT * 60 * 60 * 1000);
      }
      if (dueDate && assignment.completedAt) {
        const metSla = assignment.completedAt <= dueDate;
        await this.prisma.workflowAssignmentHistory.create({
          data: {
            assignmentId: id,
            updatedByUserId: updatedByUserId || null,
            updatedAt: new Date(),
            prevStatus: assignment.status,
            newStatus: assignment.status,
            slaMet: metSla
          }
        });
      }
    }
    return {
      ...assignment,
      assigneeName: assignment.user ? assignment.user.fullName : undefined
    };
  }

  async autoAssignTasks(): Promise<void> {
    const pendingTasks = await this.getPendingTasks();
    const availableUsers = await this.getAvailableUsers();
    let aiAssignments: Record<string, string> = {};
    try {
      // Call AI microservice for assignment recommendations
      const analyticsService = this.analyticsService as any;
      const aiResponse = await analyticsService.getPrioritiesAI(pendingTasks);
      if (aiResponse && Array.isArray(aiResponse.priorities)) {
        // aiResponse.priorities: [{ id: taskId, assigneeId }]
        aiAssignments = Object.fromEntries(
          aiResponse.priorities.map((p: any) => [p.id, p.assigneeId])
        );
      }
    } catch (err) {
      this.logger.warn('AI assignment failed, falling back to local logic: ' + err.message);
    }
    for (const task of pendingTasks) {
      let assigneeId = aiAssignments[task.id];
      if (!assigneeId) {
        // Fallback to local logic if AI did not provide an assignee
        const assignee = this.findBestAssignee(task, availableUsers);
        assigneeId = assignee?.id;
      }
      if (assigneeId) {
        await this.assignTask({
          taskId: task.id,
          taskType: task.type,
          assigneeId
        });
        this.logger.log(`Assigned task ${task.id} to ${assigneeId}`);
      }
    }
  }

  private async getPendingTasks(): Promise<WorkflowTask[]> {
    const [bordereaux, bsList, reclamations, virements] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } },
        include: { client: true, virement: true }
      }),
      this.prisma.bulletinSoin.findMany({
        where: { etat: { not: 'VALIDATED' } }
      }),
      this.prisma.reclamation.findMany({
        where: { status: { not: 'RESOLVED' } }
      }),
      this.prisma.virement.findMany({
        where: { confirmed: false },
        include: { bordereau: true }
      })
    ]);

    return [
      ...bordereaux.map(b => this.mapBordereauToTask(b)),
      ...bsList.map(bs => this.mapBSToTask(bs)),
      ...reclamations.map(r => this.mapReclamationToTask(r)),
      ...virements.map(v => this.mapVirementToTask(v))
    ].sort((a, b) => b.priority - a.priority);
  }

  private mapVirementToTask(v: any): WorkflowTask {
    // Use SLA_TIMEFRAMES.PAYMENT for virement SLA
    const now = new Date();
    const depositDate = new Date(v.dateDepot);
    const elapsedHours = (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60);
    let priority = WORKFLOW_PRIORITY.MEDIUM;
    if (elapsedHours > SLA_TIMEFRAMES.PAYMENT * 0.75) priority = WORKFLOW_PRIORITY.HIGH;
    if (elapsedHours > SLA_TIMEFRAMES.PAYMENT) priority = WORKFLOW_PRIORITY.CRITICAL;
    return {
      id: v.id,
      type: 'VIREMENT',
      reference: v.referenceBancaire,
      // TODO: Use correct Statut enum for status if needed
      status: v.confirmed ? 'COMPLETED' as any : 'PENDING' as any,
      priority,
      dueDate: new Date(depositDate.getTime() + SLA_TIMEFRAMES.PAYMENT * 60 * 60 * 1000),
      assignedTo: v.confirmedById,
      team: v.bordereau?.teamId,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt || v.createdAt,
    };
  }

  private mapBordereauToTask(bordereau: any): WorkflowTask {
    const now = new Date();
    const receptionDate = new Date(bordereau.dateReception);
    const elapsedHours = (now.getTime() - receptionDate.getTime()) / (1000 * 60 * 60);

    let priority = WORKFLOW_PRIORITY.MEDIUM;
    if (elapsedHours > SLA_TIMEFRAMES.SCAN * 0.75) priority = WORKFLOW_PRIORITY.HIGH;
    if (elapsedHours > SLA_TIMEFRAMES.SCAN) priority = WORKFLOW_PRIORITY.CRITICAL;

    return {
      id: bordereau.id,
      type: 'BORDEREAU_SCAN',
      reference: bordereau.reference,
      status: bordereau.statut,
      priority,
      dueDate: new Date(receptionDate.getTime() + SLA_TIMEFRAMES.SCAN * 60 * 60 * 1000),
      assignedTo: bordereau.currentHandlerId,
      team: bordereau.teamId,
      createdAt: bordereau.createdAt,
      updatedAt: bordereau.updatedAt
    };
  }

  private mapBSToTask(bs: any): WorkflowTask {
    return {
      id: bs.id,
      type: 'BS_VALIDATION',
      reference: bs.numBs,
      status: bs.etat,
      priority: WORKFLOW_PRIORITY.MEDIUM,
      dueDate: new Date(bs.dateCreation.getTime() + SLA_TIMEFRAMES.VALIDATION * 60 * 60 * 1000),
      assignedTo: bs.ownerId,
      team: undefined,
      createdAt: bs.createdAt,
      updatedAt: bs.updatedAt,
    };
  }

  private mapReclamationToTask(r: any): WorkflowTask {
    return {
      id: r.id,
      type: 'RECLAMATION',
      reference: r.type,
      status: r.status,
      priority: WORKFLOW_PRIORITY.HIGH,
      dueDate: new Date(r.createdAt.getTime() + SLA_TIMEFRAMES.RECLAMATION * 60 * 60 * 1000),
      assignedTo: r.assignedToId,
      team: undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private async getAvailableUsers() {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['SCAN', 'GESTIONNAIRE', 'CHEF_EQUIPE'] }
      },
      include: {
        bordereaux: {
          where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } }
        }
      }
    });

    return users.map(user => ({
      ...user,
      currentLoad: user.bordereaux.length,
      capacity: this.getUserCapacity(user.role)
    }));
  }

  private getUserCapacity(role: string): number {
    const capacities = {
      SCAN: 30,
      GESTIONNAIRE: 20,
      CHEF_EQUIPE: 10
    };
    return capacities[role] || 15;
  }

  private findBestAssignee(task: WorkflowTask, users: any[]) {
    const capableUsers = users.filter(u =>
      (task.type === 'BORDEREAU_SCAN' && u.role === 'SCAN') ||
      (task.type === 'BS_VALIDATION' && u.role === 'GESTIONNAIRE') ||
      (task.type === 'RECLAMATION' && ['GESTIONNAIRE', 'CHEF_EQUIPE'].includes(u.role)) ||
      (task.type === 'VIREMENT' && u.role === 'FINANCE')
    );

    return capableUsers
      .filter(u => u.currentLoad < u.capacity)
      .sort((a, b) => a.currentLoad - b.currentLoad)[0];
  }

  async assignTask(dto: AssignTaskDto): Promise<WorkflowAssignment> {
    let assignment;
    switch(dto.taskType) {
      case 'BORDEREAU_SCAN':
        await this.bordereauxService.assignBordereau({
          bordereauId: dto.taskId,
          assignedToUserId: dto.assigneeId
        });
        break;
      case 'BS_VALIDATION':
        // Implement BS validation assignment logic if needed
        break;
      case 'RECLAMATION':
        // Implement Reclamation assignment logic if needed
        break;
      case 'VIREMENT':
        // Assign virement to a finance user
        await this.prisma.virement.update({
          where: { id: dto.taskId },
          data: {
            confirmedById: dto.assigneeId,
            // Optionally set status/other fields
          }
        });
        break;
      default:
        throw new Error(`Unknown task type: ${dto.taskType}`);
    }

    assignment = await this.prisma.workflowAssignment.create({
      data: {
        taskId: dto.taskId,
        taskType: dto.taskType,
        assigneeId: dto.assigneeId,
        assignedAt: new Date(),
        status: 'PENDING'
      }
    });

    return assignment;
  }

  async getDailyPriorities(teamId?: string): Promise<WorkflowTask[]> {
    let where = {};
    if (teamId) {
      where = { teamId };
    }

    const tasks = await this.getPendingTasks();
    return tasks
      .filter(t => !teamId || t.team === teamId)
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }

  async monitorSlaCompliance(): Promise<void> {
    const tasks = await this.getPendingTasks();
    const now = new Date();

    for (const task of tasks) {
      if (now > task.dueDate) {
        // Escalation chain
        let escalationLevel = 0;
        let notifyUserIds: string[] = [];
        if (task.assignedTo) {
          const user = await this.prisma.user.findUnique({ where: { id: task.assignedTo } });
          if (user) {
            if (user.role === 'SCAN' || user.role === 'GESTIONNAIRE') {
              // Escalate to CHEF_EQUIPE (teamId logic removed, see TODO)
              // TODO: Add teamId to user model if you want to support team-based escalation
              // const chef = await this.prisma.user.findFirst({ where: { teamId: user.teamId, role: 'CHEF_EQUIPE' } });
              // if (chef) notifyUserIds.push(chef.id);
              escalationLevel = 1;
            } else if (user.role === 'CHEF_EQUIPE') {
              // Escalate to SUPER_ADMIN
              const superAdmin = await this.prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
              if (superAdmin) notifyUserIds.push(superAdmin.id);
              escalationLevel = 2;
            }
          }
        }
        const alertPayload: any = { type: 'SLA_BREACH', escalationLevel, notifyUserIds };
        if (task.type === 'BS_VALIDATION') alertPayload.bsId = task.id;
        if (task.type === 'BORDEREAU_SCAN') alertPayload.bordereauId = task.id;
        if (task.type === 'RECLAMATION') alertPayload.reclamationId = task.id;
        if (task.type === 'VIREMENT') alertPayload.virementId = task.id;
        await this.alertsService.triggerAlert(alertPayload);
        // Notification hook (email, websocket, etc.)
        if (notifyUserIds && notifyUserIds.length > 0) {
          for (const userId of notifyUserIds) {
            await this.notificationService.notify('sla_alert', {
              userId,
              message: `Alerte SLA : tâche en retard ou escaladée pour l'utilisateur ${userId}`,
              ...alertPayload
            });
          }
        }
        if (task.assignedTo) {
          const user = await this.prisma.user.findUnique({
            where: { id: task.assignedTo }
          });
          if (user && user.role !== 'CHEF_EQUIPE') {
            await this.autoAssignTasks();
          }
        }
      }
    }
  }

  async getWorkflowKpis(query: WorkflowKpiDto) {
    return this.analyticsService.getPerformance({
      teamId: query.teamId,
      fromDate: query.dateFrom ? query.dateFrom.toISOString() : undefined,
      toDate: query.dateTo ? query.dateTo.toISOString() : undefined,
    }, { role: 'CHEF_EQUIPE' } as any);
  }

  async visualizeWorkflow(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        documents: true,
        courriers: true,
        virement: true,
        traitementHistory: {
          orderBy: { createdAt: 'asc' },
          include: { user: true }
        }
      }
    });

    if (!bordereau) {
      throw new Error('Bordereau not found');
    }

    return {
      stages: [
        {
          name: 'Reception',
          status: 'COMPLETED',
          date: bordereau.dateReception
        },
        {
          name: 'Scan',
          status: bordereau.dateFinScan ? 'COMPLETED' :
                 bordereau.dateDebutScan ? 'IN_PROGRESS' : 'PENDING',
          date: bordereau.dateFinScan || bordereau.dateDebutScan
        },
        // Add other stages...
      ],
      history: bordereau.traitementHistory.map(h => ({
        action: h.action,
        user: h.user.fullName,
        date: h.createdAt,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus
      }))
    };
  }
}