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

  async listTemplates(): Promise<Template[]> {
    return this.prisma.template.findMany();
  }

  async getTemplate(id: string): Promise<Template> {
    const tpl = await this.prisma.template.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async createTemplate(template: Omit<Template, 'id'>): Promise<Template> {
    return this.prisma.template.create({ data: template });
  }

  async updateTemplate(id: string, update: Partial<Template>): Promise<Template> {
    return this.prisma.template.update({ where: { id }, data: update });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.prisma.template.delete({ where: { id } });
  }

  renderTemplate(templateBody: string, variables: Record<string, string>): string {
    return templateBody.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '');
  }
}
