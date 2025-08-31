import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async listTemplates(): Promise<any[]> {
    console.log('📄 Loading templates from database...');
    
    // Get both Template and GecTemplate records
    const [templates, gecTemplates] = await Promise.all([
      this.prisma.template.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.gecTemplate.findMany({ 
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    // Convert Template records
    const enhancedTemplates = templates.map(template => ({
      ...template,
      category: 'NOTIFICATION',
      version: 1,
      isActive: true,
      type: this.getTemplateType(template.subject, template.body),
      updatedAt: template.updatedAt || template.createdAt
    }));
    
    // Convert GecTemplate records to match Template format
    const convertedGecTemplates = gecTemplates.map(gecTemplate => ({
      id: gecTemplate.id,
      name: gecTemplate.name,
      subject: `Template: ${gecTemplate.name}`,
      body: gecTemplate.content,
      variables: [],
      category: gecTemplate.category,
      version: 1,
      isActive: gecTemplate.isActive,
      type: gecTemplate.type,
      createdAt: gecTemplate.createdAt,
      updatedAt: gecTemplate.updatedAt
    }));
    
    // Combine both types
    const allTemplates = [...enhancedTemplates, ...convertedGecTemplates];
    
    console.log('📄 Total templates:', allTemplates.length, '(Template:', templates.length, '+ GecTemplate:', gecTemplates.length, ')');
    return allTemplates;
  }
  
  private getTemplateType(subject: string, body: string): string {
    const content = (subject + ' ' + body).toLowerCase();
    if (content.includes('règlement') || content.includes('reglement')) return 'REGLEMENT';
    if (content.includes('réclamation') || content.includes('reclamation')) return 'RECLAMATION';
    if (content.includes('relance')) return 'RELANCE';
    return 'AUTRE';
  }

  async getTemplate(id: string): Promise<Template> {
    const tpl = await this.prisma.template.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async createTemplate(template: any): Promise<Template> {
    console.log('📄 Creating template with data:', template);
    
    // Only use fields that exist in the database schema
    const templateData = {
      name: template.name,
      subject: template.subject,
      body: template.body,
      variables: template.variables || []
    };
    
    console.log('📄 Filtered template data:', templateData);
    return this.prisma.template.create({ data: templateData });
  }

  async updateTemplate(id: string, update: any): Promise<Template> {
    console.log('✏️ Updating template:', id, 'with data:', update);
    
    // Only use fields that exist in the database schema
    const updateData = {
      name: update.name,
      subject: update.subject,
      body: update.body,
      variables: update.variables || []
    };
    
    console.log('✏️ Filtered update data:', updateData);
    return this.prisma.template.update({ where: { id }, data: updateData });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.prisma.template.delete({ where: { id } });
  }

  renderTemplate(templateBody: string, variables: Record<string, string>): string {
    return templateBody.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '');
  }
}
