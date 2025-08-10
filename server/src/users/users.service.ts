import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: any) {
    // Ensure email is unique
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('A user with this email already exists.');
    }
    // Set default values
    const userData = {
      ...data,
      active: data.active ?? true,
      permissions: data.permissions || [],
      assignedClients: data.assignedClients || []
    };
    const user = await this.prisma.user.create({ data: userData });
    await this.logAction(user.id, 'USER_CREATE', { data: { ...userData, password: undefined } });
    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByRole(role: string) {
    return this.prisma.user.findMany({ where: { role } });
  }

  async update(id: string, data: any) {
    // Update lastLogin if this is a login update
    if (data.updateLastLogin) {
      data.lastLogin = new Date();
      delete data.updateLastLogin;
    }
    
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    await this.logAction(id, 'USER_UPDATE', { data: { ...data, password: undefined } });
    return user;
  }

  async delete(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    await this.logAction(id, 'USER_DELETE');
    return user;
  }

  async disableUser(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    await this.logAction(id, 'USER_DISABLE');
    return user;
  }

  async resetPassword(id: string, newPassword: string) {
    // Hash password here (bcrypt)
    const bcrypt = require('bcrypt');
    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    await this.logAction(id, 'USER_PASSWORD_RESET');
    return user;
  }

  async getAuditLogsForUser(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ...other imports and class code...

async logAction(userId: string, action: string, details?: any) {
  await this.prisma.auditLog.create({
    data: { userId, action, details, timestamp: new Date() }
  });
}

async getUserPerformanceStats(userId: string) {
  // Calculate performance statistics
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Mock performance data - replace with actual calculations
  return {
    processedDocuments: 150,
    slaCompliance: 92,
    avgProcessingTime: 2.5
  };
}

async performBulkAction(userIds: string[], action: string, data?: any) {
  const results: any[] = [];
  
  for (const userId of userIds) {
    try {
      switch (action) {
        case 'deactivate':
          await this.update(userId, { active: false });
          break;
        case 'changeDepartment':
          await this.update(userId, { department: data.department });
          break;
        case 'export':
          // Handle export logic
          break;
      }
      results.push({ userId, success: true });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }
  
  return results;
}
}