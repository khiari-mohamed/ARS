import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logBordereauEvent(bordereauId: string, action: string, userId?: string, details?: any) {
    await this.prisma.bordereauAuditLog.create({
      data: {
        bordereauId,
        action,
        userId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  }

  async getBordereauHistory(bordereauId: string) {
    return this.prisma.bordereauAuditLog.findMany({
      where: { bordereauId },
      orderBy: { createdAt: 'asc' },
    });
  }
}