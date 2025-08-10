import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: TemplateVariable[];
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata: any;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list';
  required: boolean;
  defaultValue?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  body: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface ABTestConfig {
  id: string;
  name: string;
  templateA: string;
  templateB: string;
  trafficSplit: number; // 0-100, percentage for template A
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'running' | 'completed' | 'paused';
  metrics: {
    openRate: boolean;
    clickRate: boolean;
    responseRate: boolean;
    conversionRate: boolean;
  };
}

export interface ABTestResult {
  testId: string;
  templateA: {
    sent: number;
    opened: number;
    clicked: number;
    responded: number;
    converted: number;
  };
  templateB: {
    sent: number;
    opened: number;
    clicked: number;
    responded: number;
    converted: number;
  };
  winner?: 'A' | 'B' | 'tie';
  confidence: number;
  significance: number;
}

@Injectable()
export class TemplateManagementService {
  private readonly logger = new Logger(TemplateManagementService.name);

  constructor(private prisma: PrismaService) {}

  // === TEMPLATE MANAGEMENT ===
  async getTemplates(filters?: any): Promise<EmailTemplate[]> {
    try {
      // Mock templates - in production would query database
      const mockTemplates: EmailTemplate[] = [
        {
          id: 'template_001',
          name: 'Accusé de Réception BS',
          subject: 'Accusé de réception - Bulletin de soin {{reference}}',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2e7d32;">Accusé de Réception</h2>
              <p>Bonjour {{clientName}},</p>
              <p>Nous accusons réception de votre bulletin de soin référence <strong>{{reference}}</strong>.</p>
              <p>Date de réception: {{receptionDate}}</p>
              <p>Votre dossier est en cours de traitement et vous recevrez une réponse sous {{delaiTraitement}} jours ouvrés.</p>
              <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Détails du bulletin:</h3>
                <ul>
                  <li>Référence: {{reference}}</li>
                  <li>Montant: {{montant}}€</li>
                  <li>Date de soin: {{dateSoin}}</li>
                </ul>
              </div>
              <p>Cordialement,<br>L'équipe ARS</p>
            </div>
          `,
          category: 'ACCUSE_RECEPTION',
          variables: [
            { name: 'clientName', type: 'text', required: true, description: 'Nom du client' },
            { name: 'reference', type: 'text', required: true, description: 'Référence du bulletin' },
            { name: 'receptionDate', type: 'date', required: true, description: 'Date de réception' },
            { name: 'delaiTraitement', type: 'number', required: true, defaultValue: 5, description: 'Délai de traitement en jours' },
            { name: 'montant', type: 'number', required: true, description: 'Montant du bulletin' },
            { name: 'dateSoin', type: 'date', required: true, description: 'Date du soin' }
          ],
          version: 2,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          tags: ['bs', 'accusé', 'réception'],
          metadata: { priority: 'high', autoSend: true }
        },
        {
          id: 'template_002',
          name: 'Demande de Pièces Complémentaires',
          subject: 'Demande de pièces complémentaires - Dossier {{reference}}',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f57c00;">Demande de Pièces Complémentaires</h2>
              <p>Bonjour {{clientName}},</p>
              <p>Nous avons bien reçu votre dossier référence <strong>{{reference}}</strong>.</p>
              <p>Afin de poursuivre le traitement de votre demande, nous avons besoin des pièces suivantes:</p>
              <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #f57c00;">
                <h3>Pièces manquantes:</h3>
                {{#each missingDocuments}}
                <p>• {{this}}</p>
                {{/each}}
              </div>
              <p>Vous pouvez nous transmettre ces documents:</p>
              <ul>
                <li>Par email à l'adresse: documents@ars.com</li>
                <li>Par courrier postal</li>
                <li>Via votre espace client en ligne</li>
              </ul>
              <p><strong>Délai:</strong> Merci de nous faire parvenir ces éléments sous {{delaiReponse}} jours.</p>
              <p>Cordialement,<br>L'équipe ARS</p>
            </div>
          `,
          category: 'DEMANDE_PIECES',
          variables: [
            { name: 'clientName', type: 'text', required: true, description: 'Nom du client' },
            { name: 'reference', type: 'text', required: true, description: 'Référence du dossier' },
            { name: 'missingDocuments', type: 'list', required: true, description: 'Liste des documents manquants' },
            { name: 'delaiReponse', type: 'number', required: true, defaultValue: 15, description: 'Délai de réponse en jours' }
          ],
          version: 1,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
          tags: ['demande', 'pièces', 'complémentaires'],
          metadata: { priority: 'medium', requiresResponse: true }
        }
      ];

      return mockTemplates.filter(template => {
        if (filters?.category && template.category !== filters.category) return false;
        if (filters?.isActive !== undefined && template.isActive !== filters.isActive) return false;
        if (filters?.search) {
          const search = filters.search.toLowerCase();
          return template.name.toLowerCase().includes(search) || 
                 template.subject.toLowerCase().includes(search) ||
                 template.tags.some(tag => tag.toLowerCase().includes(search));
        }
        return true;
      });
    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      return [];
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    try {
      const newTemplate: EmailTemplate = {
        id: `template_${Date.now()}`,
        ...template,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.prisma.auditLog.create({
        data: {
          userId: template.createdBy,
          action: 'TEMPLATE_CREATED',
          details: {
            templateId: newTemplate.id,
            name: newTemplate.name,
            category: newTemplate.category
          }
        }
      });

      return newTemplate;
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>, userId: string): Promise<EmailTemplate> {
    try {
      const existingTemplate = await this.getTemplate(templateId);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Create new version if content changed
      const contentChanged = updates.subject !== existingTemplate.subject || 
                           updates.body !== existingTemplate.body;

      const updatedTemplate: EmailTemplate = {
        ...existingTemplate,
        ...updates,
        version: contentChanged ? existingTemplate.version + 1 : existingTemplate.version,
        updatedAt: new Date()
      };

      if (contentChanged) {
        await this.createTemplateVersion(existingTemplate, userId, 'Content updated');
      }

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'TEMPLATE_UPDATED',
          details: {
            templateId,
            changes: Object.keys(updates),
            newVersion: updatedTemplate.version
          }
        }
      });

      return updatedTemplate;
    } catch (error) {
      this.logger.error('Failed to update template:', error);
      throw error;
    }
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const templates = await this.getTemplates();
      return templates.find(t => t.id === templateId) || null;
    } catch (error) {
      this.logger.error('Failed to get template:', error);
      return null;
    }
  }

  // === TEMPLATE VERSIONING ===
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    try {
      // Mock template versions
      const mockVersions: TemplateVersion[] = [
        {
          id: 'version_001',
          templateId,
          version: 2,
          subject: 'Accusé de réception - Bulletin de soin {{reference}}',
          body: 'Updated template body...',
          changes: 'Updated styling and added new variables',
          createdBy: 'admin',
          createdAt: new Date('2024-01-15'),
          isActive: true
        },
        {
          id: 'version_002',
          templateId,
          version: 1,
          subject: 'Accusé de réception - BS {{reference}}',
          body: 'Original template body...',
          changes: 'Initial version',
          createdBy: 'admin',
          createdAt: new Date('2024-01-01'),
          isActive: false
        }
      ];

      return mockVersions;
    } catch (error) {
      this.logger.error('Failed to get template versions:', error);
      return [];
    }
  }

  async createTemplateVersion(template: EmailTemplate, userId: string, changes: string): Promise<TemplateVersion> {
    try {
      const version: TemplateVersion = {
        id: `version_${Date.now()}`,
        templateId: template.id,
        version: template.version,
        subject: template.subject,
        body: template.body,
        changes,
        createdBy: userId,
        createdAt: new Date(),
        isActive: false
      };

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'TEMPLATE_VERSION_CREATED',
          details: {
            templateId: template.id,
            version: version.version,
            changes
          }
        }
      });

      return version;
    } catch (error) {
      this.logger.error('Failed to create template version:', error);
      throw error;
    }
  }

  async revertToVersion(templateId: string, versionId: string, userId: string): Promise<EmailTemplate> {
    try {
      const version = await this.getTemplateVersion(versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      const updates = {
        subject: version.subject,
        body: version.body
      };

      return this.updateTemplate(templateId, updates, userId);
    } catch (error) {
      this.logger.error('Failed to revert to version:', error);
      throw error;
    }
  }

  private async getTemplateVersion(versionId: string): Promise<TemplateVersion | null> {
    // Mock implementation
    return {
      id: versionId,
      templateId: 'template_001',
      version: 1,
      subject: 'Previous subject',
      body: 'Previous body',
      changes: 'Reverted version',
      createdBy: 'admin',
      createdAt: new Date(),
      isActive: false
    };
  }

  // === A/B TESTING ===
  async createABTest(config: Omit<ABTestConfig, 'id'>): Promise<ABTestConfig> {
    try {
      const abTest: ABTestConfig = {
        id: `abtest_${Date.now()}`,
        ...config
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'AB_TEST_CREATED',
          details: {
            testId: abTest.id,
            name: abTest.name,
            templateA: abTest.templateA,
            templateB: abTest.templateB
          }
        }
      });

      return abTest;
    } catch (error) {
      this.logger.error('Failed to create A/B test:', error);
      throw error;
    }
  }

  async getABTests(status?: string): Promise<ABTestConfig[]> {
    try {
      // Mock A/B tests
      const mockTests: ABTestConfig[] = [
        {
          id: 'abtest_001',
          name: 'Test Accusé Réception - Subject Line',
          templateA: 'template_001',
          templateB: 'template_001_variant',
          trafficSplit: 50,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'running',
          metrics: {
            openRate: true,
            clickRate: true,
            responseRate: false,
            conversionRate: false
          }
        },
        {
          id: 'abtest_002',
          name: 'Test Demande Pièces - CTA Button',
          templateA: 'template_002',
          templateB: 'template_002_variant',
          trafficSplit: 30,
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'completed',
          metrics: {
            openRate: true,
            clickRate: true,
            responseRate: true,
            conversionRate: true
          }
        }
      ];

      return status ? mockTests.filter(test => test.status === status) : mockTests;
    } catch (error) {
      this.logger.error('Failed to get A/B tests:', error);
      return [];
    }
  }

  async getABTestResults(testId: string): Promise<ABTestResult | null> {
    try {
      // Mock A/B test results
      const mockResult: ABTestResult = {
        testId,
        templateA: {
          sent: 1000,
          opened: 450,
          clicked: 89,
          responded: 23,
          converted: 12
        },
        templateB: {
          sent: 1000,
          opened: 520,
          clicked: 112,
          responded: 31,
          converted: 18
        },
        winner: 'B',
        confidence: 95.2,
        significance: 0.048
      };

      return mockResult;
    } catch (error) {
      this.logger.error('Failed to get A/B test results:', error);
      return null;
    }
  }

  async selectTemplateForABTest(testId: string, recipientId: string): Promise<string> {
    try {
      const test = await this.getABTest(testId);
      if (!test || test.status !== 'running') {
        throw new Error('A/B test not found or not running');
      }

      // Simple hash-based selection for consistent assignment
      const hash = this.hashString(recipientId + testId);
      const useTemplateA = (hash % 100) < test.trafficSplit;

      return useTemplateA ? test.templateA : test.templateB;
    } catch (error) {
      this.logger.error('Failed to select template for A/B test:', error);
      throw error;
    }
  }

  private async getABTest(testId: string): Promise<ABTestConfig | null> {
    const tests = await this.getABTests();
    return tests.find(test => test.id === testId) || null;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // === TEMPLATE RENDERING ===
  async renderTemplate(templateId: string, variables: { [key: string]: any }): Promise<{ subject: string; body: string }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate required variables
      const missingVariables = template.variables
        .filter(v => v.required && !variables.hasOwnProperty(v.name))
        .map(v => v.name);

      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }

      // Simple template rendering (in production would use a proper template engine)
      let renderedSubject = template.subject;
      let renderedBody = template.body;

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        renderedSubject = renderedSubject.replace(regex, String(value));
        renderedBody = renderedBody.replace(regex, String(value));
      });

      // Handle Handlebars-style loops (simplified)
      renderedBody = this.renderHandlebarsLoops(renderedBody, variables);

      return {
        subject: renderedSubject,
        body: renderedBody
      };
    } catch (error) {
      this.logger.error('Failed to render template:', error);
      throw error;
    }
  }

  private renderHandlebarsLoops(body: string, variables: { [key: string]: any }): string {
    // Simple implementation for {{#each array}} loops
    const eachRegex = /{{#each (\w+)}}(.*?){{\/each}}/gs;
    
    return body.replace(eachRegex, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        return content.replace(/{{this}}/g, String(item));
      }).join('');
    });
  }

  // === TEMPLATE ANALYTICS ===
  async getTemplateAnalytics(templateId: string, period = '30d'): Promise<any> {
    try {
      // Mock template analytics
      return {
        templateId,
        period,
        usage: {
          totalSent: Math.floor(Math.random() * 1000) + 100,
          avgOpenRate: Math.random() * 30 + 40, // 40-70%
          avgClickRate: Math.random() * 10 + 5,  // 5-15%
          avgResponseRate: Math.random() * 5 + 2 // 2-7%
        },
        trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sent: Math.floor(Math.random() * 50) + 10,
          opened: Math.floor(Math.random() * 30) + 5,
          clicked: Math.floor(Math.random() * 10) + 1
        })),
        topVariables: [
          { name: 'clientName', usage: 95 },
          { name: 'reference', usage: 100 },
          { name: 'montant', usage: 78 }
        ]
      };
    } catch (error) {
      this.logger.error('Failed to get template analytics:', error);
      return {
        templateId,
        period,
        usage: { totalSent: 0, avgOpenRate: 0, avgClickRate: 0, avgResponseRate: 0 },
        trends: [],
        topVariables: []
      };
    }
  }

  async getTemplateCategories(): Promise<{ category: string; count: number; description: string }[]> {
    try {
      return [
        { category: 'ACCUSE_RECEPTION', count: 5, description: 'Accusés de réception' },
        { category: 'DEMANDE_PIECES', count: 3, description: 'Demandes de pièces complémentaires' },
        { category: 'NOTIFICATION', count: 8, description: 'Notifications diverses' },
        { category: 'RELANCE', count: 4, description: 'Relances clients' },
        { category: 'REPONSE_RECLAMATION', count: 6, description: 'Réponses aux réclamations' }
      ];
    } catch (error) {
      this.logger.error('Failed to get template categories:', error);
      return [];
    }
  }
}