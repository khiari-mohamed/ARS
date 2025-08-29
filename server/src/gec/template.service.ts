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
    const templates = await this.prisma.template.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Add mock fields for frontend compatibility
    const enhancedTemplates = templates.map(template => ({
      ...template,
      category: 'NOTIFICATION', // Mock category
      version: 1, // Mock version
      isActive: true, // Mock active status
      tags: [], // Mock tags
      updatedAt: template.updatedAt || template.createdAt
    }));
    
    console.log('📄 Enhanced templates:', enhancedTemplates.length);
    return enhancedTemplates;
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
