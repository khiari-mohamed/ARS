import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; password: string; fullName: string; role: string }) {
    // Ensure email is unique
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('A user with this email already exists.');
    }
    // Ensure role is valid (reuse assertValidRole if needed)
    // Password should already be hashed by controller or AuthService
    const user = await this.prisma.user.create({ data });
    await this.logAction(user.id, 'USER_CREATE', { data: { ...data, password: undefined } });
    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async update(id: string, data: Partial<{ email: string; password: string; fullName: string; role: string }>) {
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
}