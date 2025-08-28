import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GecTemplatesService {
  constructor(private prisma: PrismaService) {}

  private checkRole(user: any) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'GESTIONNAIRE'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
  }

  async getAllTemplates(user: any) {
    this.checkRole(user);
    
    try {
      const templates = await this.prisma.gecTemplate.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true }
          }
        }
      });
      
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        content: template.content,
        type: template.type,
        category: template.category,
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        createdBy: template.createdBy?.fullName,
        usageCount: template.usageCount || 0
      }));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async getTemplate(id: string, user: any) {
    this.checkRole(user);
    
    const template = await this.prisma.gecTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      type: template.type,
      category: template.category,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      createdBy: template.createdBy?.fullName,
      usageCount: template.usageCount || 0
    };
  }

  async createTemplate(templateData: any, user: any) {
    this.checkRole(user);
    
    const template = await this.prisma.gecTemplate.create({
      data: {
        name: templateData.name,
        content: templateData.content,
        type: templateData.type || 'EMAIL',
        category: templateData.category || 'General',
        isActive: templateData.isActive !== false,
        createdById: user.id,
        usageCount: 0
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      type: template.type,
      category: template.category,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      createdBy: template.createdBy?.fullName,
      usageCount: template.usageCount || 0
    };
  }

  async updateTemplate(id: string, templateData: any, user: any) {
    this.checkRole(user);
    
    const existingTemplate = await this.prisma.gecTemplate.findUnique({
      where: { id }
    });
    
    if (!existingTemplate) {
      throw new NotFoundException('Template not found');
    }
    
    const template = await this.prisma.gecTemplate.update({
      where: { id },
      data: {
        name: templateData.name,
        content: templateData.content,
        type: templateData.type,
        category: templateData.category,
        isActive: templateData.isActive,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      type: template.type,
      category: template.category,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      createdBy: template.createdBy?.fullName,
      usageCount: template.usageCount || 0
    };
  }

  async deleteTemplate(id: string, user: any) {
    this.checkRole(user);
    
    const existingTemplate = await this.prisma.gecTemplate.findUnique({
      where: { id }
    });
    
    if (!existingTemplate) {
      throw new NotFoundException('Template not found');
    }
    
    await this.prisma.gecTemplate.delete({
      where: { id }
    });
    
    return { success: true, message: 'Template deleted successfully' };
  }

  async duplicateTemplate(id: string, user: any) {
    this.checkRole(user);
    
    const originalTemplate = await this.prisma.gecTemplate.findUnique({
      where: { id }
    });
    
    if (!originalTemplate) {
      throw new NotFoundException('Template not found');
    }
    
    const duplicatedTemplate = await this.prisma.gecTemplate.create({
      data: {
        name: `${originalTemplate.name} (Copie)`,
        content: originalTemplate.content,
        type: originalTemplate.type,
        category: originalTemplate.category,
        isActive: originalTemplate.isActive,
        createdById: user.id,
        usageCount: 0
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });
    
    return {
      id: duplicatedTemplate.id,
      name: duplicatedTemplate.name,
      content: duplicatedTemplate.content,
      type: duplicatedTemplate.type,
      category: duplicatedTemplate.category,
      isActive: duplicatedTemplate.isActive,
      createdAt: duplicatedTemplate.createdAt.toISOString(),
      updatedAt: duplicatedTemplate.updatedAt.toISOString(),
      createdBy: duplicatedTemplate.createdBy?.fullName,
      usageCount: duplicatedTemplate.usageCount || 0
    };
  }
}