import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  documentTypes: string[];
  steps: WorkflowStep[];
  active: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'validation' | 'notification';
  assigneeType: 'user' | 'role' | 'group';
  assigneeId: string;
  required: boolean;
  timeLimit?: number;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

export interface WorkflowAction {
  type: 'email' | 'notification' | 'status_change' | 'assignment';
  parameters: any;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  documentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  steps: WorkflowStepInstance[];
}

export interface WorkflowStepInstance {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  assignedTo: string;
  startedAt?: Date;
  completedAt?: Date;
  comments?: string;
  decision?: 'approved' | 'rejected' | 'needs_revision';
}

@Injectable()
export class DocumentWorkflowService {
  private readonly logger = new Logger(DocumentWorkflowService.name);

  constructor(private prisma: PrismaService) {}

  // === WORKFLOW DEFINITIONS ===
  async getWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
    try {
      // Mock workflow definitions - in production would be stored in database
      return [
        {
          id: 'workflow_contract_approval',
          name: 'Approbation Contrat',
          description: 'Workflow d\'approbation pour les nouveaux contrats',
          documentTypes: ['CONTRACT'],
          steps: [
            {
              id: 'step_legal_review',
              name: 'Révision Juridique',
              type: 'review',
              assigneeType: 'role',
              assigneeId: 'LEGAL_TEAM',
              required: true,
              timeLimit: 48,
              conditions: [
                { field: 'amount', operator: '>', value: 10000 }
              ]
            },
            {
              id: 'step_manager_approval',
              name: 'Approbation Manager',
              type: 'approval',
              assigneeType: 'role',
              assigneeId: 'MANAGER',
              required: true,
              timeLimit: 24
            },
            {
              id: 'step_final_validation',
              name: 'Validation Finale',
              type: 'validation',
              assigneeType: 'role',
              assigneeId: 'DIRECTOR',
              required: true,
              timeLimit: 72
            }
          ],
          active: true
        },
        {
          id: 'workflow_document_review',
          name: 'Révision Document Standard',
          description: 'Workflow de révision pour les documents standards',
          documentTypes: ['BS', 'FACTURE', 'COURRIER'],
          steps: [
            {
              id: 'step_quality_check',
              name: 'Contrôle Qualité',
              type: 'validation',
              assigneeType: 'role',
              assigneeId: 'QUALITY_TEAM',
              required: true,
              timeLimit: 24
            },
            {
              id: 'step_supervisor_approval',
              name: 'Approbation Superviseur',
              type: 'approval',
              assigneeType: 'role',
              assigneeId: 'SUPERVISOR',
              required: false,
              timeLimit: 48
            }
          ],
          active: true
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get workflow definitions:', error);
      return [];
    }
  }

  async createWorkflowDefinition(definition: Omit<WorkflowDefinition, 'id'>): Promise<WorkflowDefinition> {
    try {
      const newDefinition = {
        id: `workflow_${Date.now()}`,
        ...definition
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WORKFLOW_DEFINITION_CREATED',
          details: newDefinition
        }
      });

      return newDefinition;
    } catch (error) {
      this.logger.error('Failed to create workflow definition:', error);
      throw error;
    }
  }

  // === WORKFLOW INSTANCES ===
  async startWorkflow(documentId: string, workflowId: string, userId: string): Promise<WorkflowInstance> {
    try {
      const workflow = await this.getWorkflowDefinition(workflowId);
      if (!workflow) {
        throw new Error('Workflow definition not found');
      }

      const instance: WorkflowInstance = {
        id: `instance_${Date.now()}`,
        workflowId,
        documentId,
        status: 'pending',
        currentStep: 0,
        startedAt: new Date(),
        steps: workflow.steps.map(step => ({
          stepId: step.id,
          status: 'pending',
          assignedTo: this.resolveAssignee(step)
        }))
      };

      // Start first step
      if (instance.steps.length > 0) {
        instance.status = 'in_progress';
        instance.steps[0].status = 'in_progress';
        instance.steps[0].startedAt = new Date();
        
        // Send notification to assignee
        await this.sendStepNotification(instance, 0);
      }

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_STARTED',
          details: {
            instanceId: instance.id,
            workflowId,
            documentId,
            timestamp: new Date().toISOString()
          }
        }
      });

      return instance;
    } catch (error) {
      this.logger.error('Failed to start workflow:', error);
      throw error;
    }
  }

  async completeWorkflowStep(
    instanceId: string, 
    stepId: string, 
    decision: 'approved' | 'rejected' | 'needs_revision',
    comments: string,
    userId: string
  ): Promise<WorkflowInstance> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      const stepIndex = instance.steps.findIndex(s => s.stepId === stepId);
      if (stepIndex === -1) {
        throw new Error('Workflow step not found');
      }

      const step = instance.steps[stepIndex];
      step.status = 'completed';
      step.completedAt = new Date();
      step.decision = decision;
      step.comments = comments;

      // Handle decision
      if (decision === 'rejected') {
        instance.status = 'failed';
        await this.sendWorkflowNotification(instance, 'rejected');
      } else if (decision === 'needs_revision') {
        // Send back to previous step or document owner
        await this.sendRevisionNotification(instance, comments);
      } else {
        // Move to next step
        const nextStepIndex = stepIndex + 1;
        if (nextStepIndex < instance.steps.length) {
          instance.currentStep = nextStepIndex;
          instance.steps[nextStepIndex].status = 'in_progress';
          instance.steps[nextStepIndex].startedAt = new Date();
          
          await this.sendStepNotification(instance, nextStepIndex);
        } else {
          // Workflow completed
          instance.status = 'completed';
          instance.completedAt = new Date();
          await this.sendWorkflowNotification(instance, 'completed');
        }
      }

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_STEP_COMPLETED',
          details: {
            instanceId,
            stepId,
            decision,
            comments,
            timestamp: new Date().toISOString()
          }
        }
      });

      return instance;
    } catch (error) {
      this.logger.error('Failed to complete workflow step:', error);
      throw error;
    }
  }

  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
    try {
      // Mock implementation - in production would query database
      return {
        id: instanceId,
        workflowId: 'workflow_contract_approval',
        documentId: 'doc_001',
        status: 'in_progress',
        currentStep: 1,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        steps: [
          {
            stepId: 'step_legal_review',
            status: 'completed',
            assignedTo: 'legal_team_001',
            startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            decision: 'approved',
            comments: 'Révision juridique terminée, aucun problème détecté'
          },
          {
            stepId: 'step_manager_approval',
            status: 'in_progress',
            assignedTo: 'manager_001',
            startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
          },
          {
            stepId: 'step_final_validation',
            status: 'pending',
            assignedTo: 'director_001'
          }
        ]
      };
    } catch (error) {
      this.logger.error('Failed to get workflow instance:', error);
      return null;
    }
  }

  async getUserWorkflowTasks(userId: string): Promise<any[]> {
    try {
      // Mock user workflow tasks
      return [
        {
          instanceId: 'instance_001',
          workflowName: 'Approbation Contrat',
          documentTitle: 'Contrat Assurance Santé - Client ABC',
          stepName: 'Approbation Manager',
          assignedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          timeLimit: 24,
          priority: 'high',
          status: 'in_progress'
        },
        {
          instanceId: 'instance_002',
          workflowName: 'Révision Document Standard',
          documentTitle: 'Bulletin de Soin - Janvier 2024',
          stepName: 'Contrôle Qualité',
          assignedAt: new Date(Date.now() - 30 * 60 * 1000),
          timeLimit: 24,
          priority: 'medium',
          status: 'in_progress'
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get user workflow tasks:', error);
      return [];
    }
  }

  // === DOCUMENT LIFECYCLE ===
  async getDocumentLifecycle(documentId: string): Promise<any> {
    try {
      return {
        documentId,
        currentStatus: 'approved',
        lifecycle: [
          {
            status: 'created',
            timestamp: new Date('2024-01-10T10:00:00Z'),
            user: 'Jean Dupont',
            comments: 'Document créé'
          },
          {
            status: 'under_review',
            timestamp: new Date('2024-01-10T14:00:00Z'),
            user: 'System',
            comments: 'Workflow de révision démarré'
          },
          {
            status: 'reviewed',
            timestamp: new Date('2024-01-11T09:00:00Z'),
            user: 'Marie Martin',
            comments: 'Révision terminée - Approuvé'
          },
          {
            status: 'approved',
            timestamp: new Date('2024-01-11T15:00:00Z'),
            user: 'Pierre Durand',
            comments: 'Document approuvé par le manager'
          }
        ],
        nextActions: [
          'Archiver le document',
          'Envoyer au client',
          'Créer une copie de sauvegarde'
        ]
      };
    } catch (error) {
      this.logger.error('Failed to get document lifecycle:', error);
      return null;
    }
  }

  async updateDocumentStatus(documentId: string, status: string, userId: string, comments?: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DOCUMENT_STATUS_UPDATED',
          details: {
            documentId,
            newStatus: status,
            comments,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to update document status:', error);
      throw error;
    }
  }

  // === HELPER METHODS ===
  private async getWorkflowDefinition(workflowId: string): Promise<WorkflowDefinition | null> {
    const definitions = await this.getWorkflowDefinitions();
    return definitions.find(d => d.id === workflowId) || null;
  }

  private resolveAssignee(step: WorkflowStep): string {
    // Mock assignee resolution - in production would resolve based on type
    switch (step.assigneeType) {
      case 'role':
        return `${step.assigneeId.toLowerCase()}_001`;
      case 'user':
        return step.assigneeId;
      case 'group':
        return `group_${step.assigneeId}_lead`;
      default:
        return 'system';
    }
  }

  private async sendStepNotification(instance: WorkflowInstance, stepIndex: number): Promise<void> {
    try {
      const step = instance.steps[stepIndex];
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WORKFLOW_STEP_NOTIFICATION_SENT',
          details: {
            instanceId: instance.id,
            stepId: step.stepId,
            assignedTo: step.assignedTo,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to send step notification:', error);
    }
  }

  private async sendWorkflowNotification(instance: WorkflowInstance, type: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'WORKFLOW_NOTIFICATION_SENT',
          details: {
            instanceId: instance.id,
            type,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to send workflow notification:', error);
    }
  }

  private async sendRevisionNotification(instance: WorkflowInstance, comments: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'REVISION_NOTIFICATION_SENT',
          details: {
            instanceId: instance.id,
            comments,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to send revision notification:', error);
    }
  }
}