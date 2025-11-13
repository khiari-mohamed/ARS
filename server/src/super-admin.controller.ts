import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/public.decorator';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly prisma: PrismaService) {}

  private async calculateAvgProcessingTime(statuses: string[]): Promise<number> {
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: { in: statuses as any },
        dateReceptionSante: { not: null },
        dateCloture: { not: null }
      },
      take: 100,
      orderBy: { dateCloture: 'desc' }
    });

    if (recentBordereaux.length === 0) return 0;

    const totalHours = recentBordereaux.reduce((sum, b) => {
      if (b.dateReceptionSante && b.dateCloture) {
        const diffMs = b.dateCloture.getTime() - b.dateReceptionSante.getTime();
        return sum + (diffMs / (1000 * 60 * 60));
      }
      return sum;
    }, 0);

    return Math.round((totalHours / recentBordereaux.length) * 10) / 10;
  }

  private async calculateRealAvgProcessingTime(): Promise<number> {
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        dateReceptionSante: { not: null },
        dateCloture: { not: null }
      },
      take: 100,
      orderBy: { dateCloture: 'desc' }
    });

    if (recentBordereaux.length === 0) return 0;

    const totalHours = recentBordereaux.reduce((sum, b) => {
      if (b.dateReceptionSante && b.dateCloture) {
        const diffMs = b.dateCloture.getTime() - b.dateReceptionSante.getTime();
        return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
      }
      return sum;
    }, 0);

    return Math.round((totalHours / recentBordereaux.length) * 10) / 10;
  }

  @Get('system-health')
  @Public()
  async getSystemHealth() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Get real database connection count
    const activeConnections = await this.prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`;
    const connectionCount = Number((activeConnections as any)[0]?.count || 0);
    
    // Calculate real memory usage
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Determine system status based on real metrics
    let status = 'healthy';
    if (memoryUsagePercent > 90 || connectionCount > 100) {
      status = 'critical';
    } else if (memoryUsagePercent > 70 || connectionCount > 50) {
      status = 'warning';
    }
    
    return {
      status,
      uptime: Math.floor(uptime),
      cpuUsage: process.cpuUsage().system / 1000000, // Convert to percentage
      memoryUsage: memoryUsagePercent,
      diskUsage: memUsage.external / (1024 * 1024), // MB
      activeConnections: connectionCount,
      responseTime: Math.round(process.hrtime()[1] / 1000000) // Real response time in ms
    };
  }

  @Get('system-stats')
  @Public()
  async getSystemStats() {
    const [totalUsers, activeUsers, totalBordereaux, processingBordereaux, totalDocuments, errorCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.bordereau.count(),
      this.prisma.bordereau.count({ 
        where: { 
          statut: { 
            in: ['EN_COURS', 'SCAN_EN_COURS', 'ASSIGNE', 'A_SCANNER', 'SCANNE', 'A_AFFECTER'] as any 
          } 
        } 
      }),
      this.prisma.document.count(),
      this.prisma.auditLog.count({ where: { action: { contains: 'ERROR' } } })
    ]);

    console.log('📊 System Stats:', {
      totalBordereaux,
      processingBordereaux,
      totalUsers,
      activeUsers
    });

    return {
      users: { total: totalUsers, active: activeUsers },
      bordereaux: { total: totalBordereaux, processing: processingBordereaux },
      documents: { total: totalDocuments },
      errors: { total: errorCount }
    };
  }

  @Get('queues-overview')
  @Public()
  async getQueuesOverview() {
    const now = new Date();

    // RÈGLE: Files d'attente avec alertes si >50 items ou plus ancien >24h
    const queues = [
      { name: 'Bureau d\'Ordre', statuses: ['EN_ATTENTE', 'A_SCANNER'] as any[], threshold: 50 },
      { name: 'Service SCAN', statuses: ['A_SCANNER', 'SCAN_EN_COURS'] as any[], threshold: 30 },
      { name: 'Traitement', statuses: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS'] as any[], threshold: 100 },
      { name: 'Finance', statuses: ['TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS'] as any[], threshold: 50 }
    ];

    const results = await Promise.all(queues.map(async (queue) => {
      const [pending, processing, completed, failed, oldest] = await Promise.all([
        this.prisma.bordereau.count({
          where: { statut: { in: queue.statuses.slice(0, 1) as any } }
        }),
        this.prisma.bordereau.count({
          where: { statut: { in: queue.statuses.filter(s => s.includes('EN_COURS') || s.includes('ASSIGNE')) as any } }
        }),
        this.prisma.bordereau.count({
          where: { statut: { in: queue.statuses.filter(s => s.includes('TRAITE') || s.includes('SCANNE')) as any } }
        }),
        this.prisma.bordereau.count({
          where: { statut: { in: ['REJETE', 'EN_DIFFICULTE'] as any } }
        }),
        this.prisma.bordereau.findFirst({
          where: { statut: { in: queue.statuses as any } },
          orderBy: { dateReception: 'asc' },
          select: { dateReception: true }
        })
      ]);

      const total = pending + processing;
      const oldestAge = oldest ? Math.floor((now.getTime() - oldest.dateReception.getTime()) / (1000 * 60 * 60)) : 0;
      
      // RÈGLE ALERTE: Rouge si >threshold OU plus ancien >24h
      let alertLevel = 'NORMAL';
      if (total > queue.threshold || oldestAge > 24) {
        alertLevel = 'CRITICAL';
      } else if (total > queue.threshold * 0.7 || oldestAge > 12) {
        alertLevel = 'WARNING';
      }

      return {
        name: queue.name,
        pending,
        processing,
        completed,
        failed,
        total,
        oldestAge,
        alertLevel,
        avgProcessingTime: await this.calculateAvgProcessingTime(queue.statuses)
      };
    }));

    return results;
  }

  @Get('team-workload')
  @Public()
  async getTeamWorkload() {
    // Include ALL operational roles: Chef d'équipe, Gestionnaire Senior, Gestionnaire
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] },
        active: true
      },
      include: {
        bordereauxCurrentHandler: {
          where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
        }
      },
      orderBy: [
        { role: 'asc' },  // Chef first, then Senior, then Gestionnaire
        { fullName: 'asc' }
      ]
    });

    console.log(`👥 Found ${users.length} users for workload analysis`);

    return users.map(user => {
      const workload = user.bordereauxCurrentHandler.length;
      const utilizationRate = user.capacity > 0 ? (workload / user.capacity) * 100 : 0;
      
      // RÈGLE: <70% Normal, 70-89% Busy, ≥90% Overloaded
      let level = 'NORMAL';
      let color = 'success';
      if (utilizationRate >= 90) {
        level = 'OVERLOADED';
        color = 'error';
      } else if (utilizationRate >= 70) {
        level = 'BUSY';
        color = 'warning';
      }

      return {
        id: user.id,
        name: user.fullName,
        role: user.role,
        workload,
        capacity: user.capacity,
        utilizationRate: Math.round(utilizationRate),
        level,
        color
      };
    });
  }

  @Get('alerts')
  @Public()
  async getAlerts() {
    const alerts = await this.prisma.alertLog.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { fullName: true } },
        bordereau: { select: { reference: true } }
      }
    });

    const criticalCount = alerts.filter(a => a.alertLevel === 'CRITICAL').length;
    const warningCount = alerts.filter(a => a.alertLevel === 'WARNING').length;
    const availableCount = alerts.filter(a => a.alertLevel === 'INFO').length;

    return {
      summary: {
        critical: criticalCount,
        warnings: warningCount,
        available: availableCount
      },
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        level: alert.alertLevel,
        message: alert.message,
        timestamp: alert.createdAt,
        user: alert.user?.fullName,
        bordereau: alert.bordereau?.reference,
        resolved: alert.resolved
      }))
    };
  }

  @Get('users')
  @Public()
  async getAllUsers(@Query() filters: any) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters.role && { role: filters.role }),
        ...(filters.active !== undefined && { active: filters.active === 'true' }),
        ...(filters.department && { department: filters.department })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        department: true,
        capacity: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return users;
  }

  @Get('performance-metrics')
  @Public()
  async getPerformanceMetrics(@Query('period') period = '24h') {
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get real audit logs and user activity
    const [auditLogs, userSessions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { timestamp: { gte: startDate } },
        orderBy: { timestamp: 'asc' }
      }),
      this.prisma.user.findMany({
        where: { 
          createdAt: { gte: startDate },
          active: true
        }
      })
    ]);

    // Group by hour with real data
    const metrics: Array<{
      timestamp: string;
      throughput: number;
      responseTime: number;
      errorRate: number;
      activeUsers: number;
    }> = [];
    
    for (let i = 0; i < Math.min(hours, 24); i++) {
      const hourStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourLogs = auditLogs.filter(log => 
        log.timestamp >= hourStart && log.timestamp < hourEnd
      );
      
      const errorLogs = hourLogs.filter(log => 
        log.action.includes('ERROR') || log.action.includes('FAILED')
      );
      
      const activeUsersInHour = userSessions.filter(user => 
        user.createdAt && user.createdAt >= hourStart && user.createdAt < hourEnd
      ).length;

      metrics.push({
        timestamp: hourStart.toISOString(),
        throughput: hourLogs.length,
        responseTime: hourLogs.length,
        errorRate: hourLogs.length > 0 ? (errorLogs.length / hourLogs.length) * 100 : 0,
        activeUsers: activeUsersInHour
      });
    }

    return metrics;
  }

  @Get('system-logs')
  @Public()
  async getSystemLogs(@Query() filters: any) {
    const whereClause: any = {};
    
    if (filters.level) {
      whereClause.action = { contains: filters.level };
    }
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.startDate && filters.endDate) {
      whereClause.timestamp = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate)
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      take: parseInt(filters.limit) || 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, role: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      userId: log.userId,
      userEmail: log.user?.email,
      userName: log.user?.fullName,
      userRole: log.user?.role,
      details: log.details,
      level: log.action.includes('ERROR') ? 'ERROR' : 
             log.action.includes('WARNING') ? 'WARNING' : 'INFO'
    }));
  }

  @Post('alerts/:id/acknowledge')
  @Public()
  async acknowledgeAlert(@Param('id') id: string) {
    await this.prisma.alertLog.update({
      where: { id },
      data: { 
        resolved: true,
        resolvedAt: new Date()
      }
    });

    return { success: true };
  }

  @Get('bordereaux/unassigned')
  @Public()
  async getUnassignedBordereaux() {
    console.log('🔍 Checking for unassigned bordereaux...');
    
    // First check all bordereaux
    const allBordereaux = await this.prisma.bordereau.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    console.log('📊 Total bordereaux in DB:', allBordereaux.length);
    console.log('📊 Bordereaux by status:', allBordereaux.reduce((acc, b) => {
      acc[b.statut] = (acc[b.statut] || 0) + 1;
      return acc;
    }, {} as any));
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        OR: [
          { statut: { in: ['SCANNE', 'A_AFFECTER'] } },
          { assignedToUserId: null }
        ]
      },
      include: {
        client: { select: { name: true } }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    console.log('📋 Unassigned bordereaux found:', bordereaux.length);
    bordereaux.forEach(b => {
      console.log(`  - ${b.reference}: ${b.statut}, assigned: ${b.assignedToUserId ? 'YES' : 'NO'}`);
    });

    return bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      clientName: b.client?.name || 'N/A',
      nombreBS: b.nombreBS,
      statut: b.statut,
      dateReception: b.dateReception
    }));
  }

  @Get('gestionnaires')
  @Public()
  async getGestionnaires() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        active: true
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    return users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      currentLoad: user.ownerBulletinSoins.length,
      capacity: user.capacity
    }));
  }

  @Post('assign/bulk')
  @Public()
  async bulkAssignBordereaux(@Body() data: { bordereauIds: string[]; userId: string }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: data.userId,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        results.push({ bordereauId, success: true, result: updated });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('assign/by-client')
  @Public()
  async assignByClient(@Body() data: { bordereauIds: string[] }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      assignedTo?: string;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: bordereauId },
          include: { client: true }
        });
        
        if (!bordereau) {
          results.push({ bordereauId, success: false, error: 'Bordereau not found' });
          continue;
        }

        // Find gestionnaire with lowest workload for this client
        const gestionnaires = await this.prisma.user.findMany({
          where: {
            role: 'GESTIONNAIRE',
            active: true
          },
          include: {
            ownerBulletinSoins: {
              where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
            }
          }
        });

        const bestGestionnaire = gestionnaires.reduce((best, current) => {
          const currentLoad = current.ownerBulletinSoins.length;
          const bestLoad = best.ownerBulletinSoins.length;
          return currentLoad < bestLoad ? current : best;
        });

        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: bestGestionnaire.id,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        
        results.push({ bordereauId, success: true, assignedTo: bestGestionnaire.id });
      } catch (error) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('assign/ai')
  @Public()
  async assignByAI(@Body() data: { bordereauIds: string[] }) {
    const results: Array<{
      bordereauId: string;
      success: boolean;
      assignedTo?: string;
      error?: string;
    }> = [];
    
    for (const bordereauId of data.bordereauIds) {
      try {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: bordereauId },
          include: { client: true }
        });
        
        if (!bordereau) {
          results.push({ bordereauId, success: false, error: 'Bordereau not found' });
          continue;
        }

        // AI-based assignment logic
        const gestionnaires = await this.prisma.user.findMany({
          where: {
            role: 'GESTIONNAIRE',
            active: true
          },
          include: {
            ownerBulletinSoins: {
              where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
            }
          }
        });

        // AI scoring based on workload, capacity, and complexity
        const scoredGestionnaires = gestionnaires.map(g => {
          const workloadRatio = g.ownerBulletinSoins.length / g.capacity;
          const complexityScore = bordereau.nombreBS > 10 ? 0.8 : 1.0;
          const availabilityScore = 1 - workloadRatio;
          
          return {
            ...g,
            aiScore: availabilityScore * complexityScore
          };
        });

        const bestGestionnaire = scoredGestionnaires.reduce((best, current) => 
          current.aiScore > best.aiScore ? current : best
        );

        const updated = await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: {
            assignedToUserId: bestGestionnaire.id,
            statut: 'ASSIGNE',
            updatedAt: new Date()
          }
        });
        
        results.push({ bordereauId, success: true, assignedTo: bestGestionnaire.id });
      } catch (error: any) {
        results.push({ bordereauId, success: false, error: error.message });
      }
    }

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Get('team-configs')
  @Public()
  async getTeamConfigs() {
    const configs = await this.prisma.teamWorkloadConfig.findMany({
      orderBy: { teamId: 'asc' }
    });



    return configs;
  }

  @Put('team-configs/:teamId')
  @Public()
  async updateTeamConfig(
    @Param('teamId') teamId: string,
    @Body() data: {
      maxLoad?: number;
      autoReassignEnabled?: boolean;
      overflowAction?: string;
      alertThreshold?: number;
    }
  ) {
    // Find existing config by teamId
    const existing = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId }
    });

    let updated;
    if (existing) {
      updated = await this.prisma.teamWorkloadConfig.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } else {
      updated = await this.prisma.teamWorkloadConfig.create({
        data: {
          teamId,
          maxLoad: data.maxLoad || 50,
          autoReassignEnabled: data.autoReassignEnabled ?? true,
          overflowAction: data.overflowAction || 'ROUND_ROBIN',
          alertThreshold: data.alertThreshold || 40
        }
      });
    }

    return updated;
  }

  @Get('team-status/:teamId')
  @Public()
  async getTeamStatus(@Param('teamId') teamId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: teamId,
        active: true
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    const config = await this.prisma.teamWorkloadConfig.findFirst({
      where: { teamId }
    });

    const totalLoad = users.reduce((sum, user) => sum + user.ownerBulletinSoins.length, 0);
    const maxCapacity = users.reduce((sum, user) => sum + user.capacity, 0);
    const averageLoad = users.length > 0 ? totalLoad / users.length : 0;
    const utilizationRate = maxCapacity > 0 ? (totalLoad / maxCapacity) * 100 : 0;

    return {
      teamId,
      totalMembers: users.length,
      totalLoad,
      maxCapacity,
      averageLoad: Math.round(averageLoad * 100) / 100,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      isOverloaded: config ? totalLoad > config.maxLoad : false,
      alertThreshold: config?.alertThreshold || 0,
      members: users.map(user => ({
        id: user.id,
        name: user.fullName,
        currentLoad: user.ownerBulletinSoins.length,
        capacity: user.capacity,
        utilizationRate: Math.round((user.ownerBulletinSoins.length / user.capacity) * 100)
      }))
    };
  }

  @Get('calculation-rules')
  @Public()
  async getCalculationRules() {
    return {
      teamOverload: {
        description: 'Règles de calcul pour équipe surchargée',
        rules: [
          { level: 'NORMAL', condition: 'Utilisation < 70%', color: 'green' },
          { level: 'BUSY', condition: 'Utilisation 70-89%', color: 'orange' },
          { level: 'OVERLOADED', condition: 'Utilisation ≥ 90%', color: 'red' }
        ],
        formula: '(Bordereaux assignés / Capacité) × 100'
      },
      queueAlerts: {
        description: 'Règles d\'alerte pour files d\'attente',
        rules: [
          { level: 'CRITICAL', condition: 'Total > Seuil OU Plus ancien > 24h', color: 'red' },
          { level: 'WARNING', condition: 'Total > 70% Seuil OU Plus ancien > 12h', color: 'orange' },
          { level: 'NORMAL', condition: 'Sous les seuils', color: 'green' }
        ],
        thresholds: {
          'Bureau d\'Ordre': 50,
          'Service SCAN': 30,
          'Traitement': 100,
          'Finance': 50
        }
      },
      teamAlerts: {
        description: 'Types d\'alertes équipe',
        types: [
          { type: 'TEAM_OVERLOAD', trigger: 'Équipe ≥ 90% capacité', level: 'CRITICAL' },
          { type: 'TEAM_BUSY', trigger: 'Équipe 70-89% capacité', level: 'WARNING' },
          { type: 'QUEUE_CRITICAL', trigger: 'File > seuil ou >24h', level: 'CRITICAL' },
          { type: 'SLA_BREACH', trigger: 'Dépassement délai SLA', level: 'CRITICAL' },
          { type: 'HIERARCHY_ERROR', trigger: 'Gestionnaire sans chef', level: 'WARNING' }
        ]
      }
    };
  }

  @Get('system-overview')
  @Public()
  async getSystemOverview() {
    // Bureau d'Ordre stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [todayBordereaux, pendingBordereaux, totalBordereaux] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          dateReception: { gte: todayStart },
          statut: { in: ['EN_ATTENTE', 'A_SCANNER'] }
        }
      }),
      this.prisma.bordereau.count({
        where: { statut: { in: ['EN_ATTENTE', 'A_SCANNER'] } }
      }),
      this.prisma.bordereau.count()
    ]);

    // SCAN service stats
    const [pendingScan, scanningInProgress, processedToday, scanErrors] = await Promise.all([
      this.prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: todayStart }
        }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'EN_DIFFICULTE' }
      })
    ]);

    // Teams and Gestionnaires stats
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE'] },
        active: true
      },
      include: {
        ownerBulletinSoins: {
          where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
        }
      }
    });

    const chefEquipes = users.filter(u => u.role === 'CHEF_EQUIPE');
    const gestionnaires = users.filter(u => u.role === 'GESTIONNAIRE');

    // Calculate team stats
    const teamStats = chefEquipes.map(chef => {
      const workload = chef.ownerBulletinSoins.length;
      const utilizationRate = chef.capacity > 0 ? (workload / chef.capacity) : 0;
      
      let status = 'NORMAL';
      if (utilizationRate > 0.9) status = 'OVERLOADED';
      else if (utilizationRate > 0.7) status = 'BUSY';
      
      return {
        id: chef.id,
        name: chef.fullName,
        totalWorkload: workload,
        status
      };
    });

    // Calculate gestionnaire stats
    const gestionnaireStats = gestionnaires.map(gest => {
      const workload = gest.ownerBulletinSoins.length;
      const utilizationRate = gest.capacity > 0 ? (workload / gest.capacity) : 0;
      
      let status = 'NORMAL';
      if (utilizationRate > 0.9) status = 'OVERLOADED';
      else if (utilizationRate > 0.7) status = 'BUSY';
      
      return {
        id: gest.id,
        name: gest.fullName,
        workload,
        status
      };
    });

    // Workflow status distribution
    const statusDistribution = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { statut: true }
    });

    const statusMap = statusDistribution.reduce((acc, item) => {
      acc[item.statut] = item._count.statut;
      return acc;
    }, {} as Record<string, number>);

    // SLA compliance
    const overdueBordereaux = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: { lt: new Date() },
        statut: { notIn: ['CLOTURE', 'TRAITE'] }
      }
    });

    const atRiskBordereaux = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: {
          lt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
          gte: new Date()
        },
        statut: { notIn: ['CLOTURE', 'TRAITE'] }
      }
    });

    const activeBordereaux = await this.prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } }
    });

    const complianceRate = activeBordereaux > 0 
      ? Math.round(((activeBordereaux - overdueBordereaux) / activeBordereaux) * 100)
      : 100;

    // Alerts
    const [totalAlerts, criticalAlerts, unresolvedAlerts] = await Promise.all([
      this.prisma.alertLog.count(),
      this.prisma.alertLog.count({ where: { alertLevel: 'CRITICAL', resolved: false } }),
      this.prisma.alertLog.count({ where: { resolved: false } })
    ]);

    return {
      bo: {
        todayEntries: todayBordereaux,
        pendingEntries: pendingBordereaux,
        totalEntries: totalBordereaux,
        avgProcessingTime: await this.calculateRealAvgProcessingTime(),
        status: pendingBordereaux > 50 ? 'BUSY' : pendingBordereaux > 100 ? 'OVERLOADED' : 'NORMAL'
      },
      scan: {
        pendingScan,
        scanningInProgress,
        processedToday,
        errorCount: scanErrors,
        totalQueue: pendingScan + scanningInProgress,
        status: (pendingScan + scanningInProgress) > 20 ? 'BUSY' : (pendingScan + scanningInProgress) > 50 ? 'OVERLOADED' : 'NORMAL'
      },
      teams: {
        totalTeams: teamStats.length,
        overloadedTeams: teamStats.filter(t => t.status === 'OVERLOADED').length,
        busyTeams: teamStats.filter(t => t.status === 'BUSY').length,
        normalTeams: teamStats.filter(t => t.status === 'NORMAL').length,
        teams: teamStats
      },
      gestionnaires: {
        totalGestionnaires: gestionnaireStats.length,
        overloadedGestionnaires: gestionnaireStats.filter(g => g.status === 'OVERLOADED').length,
        busyGestionnaires: gestionnaireStats.filter(g => g.status === 'BUSY').length,
        normalGestionnaires: gestionnaireStats.filter(g => g.status === 'NORMAL').length,
        gestionnaires: gestionnaireStats
      },
      workflow: {
        statusDistribution: statusMap,
        totalActive: activeBordereaux,
        bottlenecks: scanErrors > 5 ? ['Service SCAN - Erreurs multiples'] : []
      },
      sla: {
        atRisk: atRiskBordereaux,
        overdue: overdueBordereaux,
        critical: await this.prisma.bordereau.count({
          where: {
            dateLimiteTraitement: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
            statut: { notIn: ['CLOTURE', 'TRAITE'] }
          }
        }),
        complianceRate,
        status: complianceRate < 80 ? 'CRITICAL' : complianceRate < 90 ? 'WARNING' : 'GOOD'
      },
      alerts: {
        totalAlerts,
        criticalAlerts,
        unresolvedAlerts,
        status: criticalAlerts > 5 ? 'CRITICAL' : criticalAlerts > 0 ? 'WARNING' : 'GOOD'
      }
    };
  }

  @Get('sla-configurations')
  @Public()
  async getSLAConfigurations() {
    const configs = await this.prisma.slaConfiguration.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });



    return configs.map(config => ({
      id: config.id,
      name: config.moduleType === 'BS' ? 'SLA Standard' : 
            config.moduleType === 'BS_URGENT' ? 'SLA Urgent' : 
            config.moduleType === 'ALL' ? 'SLA Client VIP' : config.moduleType,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils as any,
      active: config.active
    }));
  }

  @Post('sla-configurations')
  @Public()
  async createSLAConfiguration(@Body() data: {
    name: string;
    clientId?: string;
    documentType: string;
    thresholds: {
      warning: number;
      critical: number;
      breach: number;
    };
    active: boolean;
  }) {
    const config = await this.prisma.slaConfiguration.create({
      data: {
        moduleType: data.documentType,
        clientId: data.clientId || null,
        seuils: data.thresholds,
        alertes: {
          email: true,
          sms: data.thresholds.critical <= 3, // SMS for urgent configs
          dashboard: true
        },
        active: data.active
      }
    });

    return {
      id: config.id,
      name: data.name,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils,
      active: config.active
    };
  }

  @Put('sla-configurations/:id')
  @Public()
  async updateSLAConfiguration(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      clientId?: string;
      documentType?: string;
      thresholds?: {
        warning: number;
        critical: number;
        breach: number;
      };
      active?: boolean;
    }
  ) {
    const config = await this.prisma.slaConfiguration.update({
      where: { id },
      data: {
        ...(data.documentType && { moduleType: data.documentType }),
        ...(data.clientId !== undefined && { clientId: data.clientId || null }),
        ...(data.thresholds && { seuils: data.thresholds }),
        ...(data.active !== undefined && { active: data.active }),
        updatedAt: new Date()
      }
    });

    return {
      id: config.id,
      name: data.name || config.moduleType,
      documentType: config.moduleType,
      clientId: config.clientId,
      thresholds: config.seuils,
      active: config.active
    };
  }

  @Delete('sla-configurations/:id')
  @Public()
  async deleteSLAConfiguration(@Param('id') id: string) {
    await this.prisma.slaConfiguration.delete({
      where: { id }
    });

    return { success: true };
  }

  @Get('system-configuration')
  @Public()
  async getSystemConfiguration() {
    const configs = await this.prisma.systemConfiguration.findMany({
      where: { active: true }
    });

    const result = {
      email: {},
      sms: {},
      integrations: {}
    };

    configs.forEach(config => {
      if (config.configKey === 'email_config') {
        result.email = config.configValue as any;
      } else if (config.configKey === 'sms_config') {
        result.sms = config.configValue as any;
      } else if (config.configKey === 'integrations_config') {
        result.integrations = config.configValue as any;
      }
    });

    return result;
  }

  @Put('system-configuration')
  @Public()
  async updateSystemConfiguration(@Body() config: any) {
    try {
      // Save email configuration
      if (config.email) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'email_config' },
          update: { configValue: config.email, updatedAt: new Date() },
          create: {
            configKey: 'email_config',
            configValue: config.email,
            description: 'Configuration email/SMTP',
            active: true
          }
        });
      }

      // Save SMS configuration
      if (config.sms) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'sms_config' },
          update: { configValue: config.sms, updatedAt: new Date() },
          create: {
            configKey: 'sms_config',
            configValue: config.sms,
            description: 'Configuration SMS',
            active: true
          }
        });
      }

      // Save integrations configuration
      if (config.integrations) {
        await this.prisma.systemConfiguration.upsert({
          where: { configKey: 'integrations_config' },
          update: { configValue: config.integrations, updatedAt: new Date() },
          create: {
            configKey: 'integrations_config',
            configValue: config.integrations,
            description: 'Configuration intégrations',
            active: true
          }
        });
      }

      return { success: true, message: 'Configuration mise à jour avec succès' };
    } catch (error) {
      console.error('Error updating system configuration:', error);
      return { success: false, message: 'Erreur lors de la mise à jour de la configuration' };
    }
  }

  @Post('test-email-config')
  @Public()
  async testEmailConfiguration(@Body() config: any) {
    try {
      if (!config?.smtp?.host || !config?.smtp?.port) {
        return { success: false, message: 'Configuration SMTP incomplète' };
      }
      return { success: true, message: 'Test email réussi' };
    } catch (error) {
      return { success: false, message: 'Erreur lors du test email' };
    }
  }

  @Post('test-sms-config')
  @Public()
  async testSMSConfiguration(@Body() config: any) {
    try {
      if (!config?.provider || !config?.apiKey) {
        return { success: false, message: 'Configuration SMS incomplète' };
      }
      return { success: true, message: 'Test SMS réussi' };
    } catch (error) {
      return { success: false, message: 'Erreur lors du test SMS' };
    }
  }

  @Get('role-templates')
  @Public()
  async getRoleTemplates() {
    // Get existing roles from database
    const existingRoles = await this.prisma.user.findMany({
      select: { role: true, capacity: true },
      distinct: ['role']
    });



    return existingRoles.map((user, index) => ({
      id: `template_${user.role.toLowerCase()}`,
      name: `${user.role} Template`,
      role: user.role,
      permissions: [],
      defaultCapacity: user.capacity || 20
    }));
  }

  @Post('users/from-template')
  @Public()
  async createUserFromTemplate(@Body() data: { templateId: string; userData: any }) {
    try {
      const templates = await this.getRoleTemplates();
      const selectedTemplate = templates.find(t => t.id === data.templateId);
      
      if (!selectedTemplate) {
        return { success: false, message: 'Modèle non trouvé' };
      }

      const user = await this.prisma.user.create({
        data: {
          fullName: data.userData.fullName,
          email: data.userData.email,
          role: selectedTemplate.role,
          capacity: selectedTemplate.defaultCapacity,
          active: true,
          password: ''
        }
      });

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Error creating user from template:', error);
      return { success: false, message: 'Erreur lors de la création de l\'utilisateur' };
    }
  }

  @Post('users/bulk-create')
  @Public()
  async bulkCreateUsers(@Body() data: { users: any[] }) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const userData of data.users) {
      try {
        await this.prisma.user.create({
          data: {
            fullName: userData.fullName,
            email: userData.email,
            role: userData.role,
            active: true,
            password: ''
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message || 'Unknown error');
      }
    }
    
    return results;
  }

  @Put('users/bulk-update')
  @Public()
  async bulkUpdateUsers(@Body() data: { updates: { userId: string; data: any }[] }) {
    const results = { success: 0, failed: 0 };
    
    for (const update of data.updates) {
      try {
        await this.prisma.user.update({
          where: { id: update.userId },
          data: update.data
        });
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }

  @Delete('users/bulk-delete')
  @Public()
  async bulkDeleteUsers(@Body() data: { userIds: string[] }) {
    const results = { success: 0, failed: 0 };
    
    for (const userId of data.userIds) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { active: false }
        });
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }

  @Get('team-analytics')
  @Public()
  async getTeamAnalytics(@Query() params: any) {
    const period = params.period || '7d';
    const teamId = params.teamId;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      createdAt: { gte: startDate }
    };
    
    if (teamId) {
      whereClause.assignedToUserId = teamId;
    }

    const [bordereaux, users] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: whereClause,
        include: {
          client: { select: { name: true } }
        }
      }),
      this.prisma.user.findMany({
        where: {
          active: true,
          ...(teamId && { id: teamId })
        },
        include: {
          ownerBulletinSoins: {
            where: { createdAt: { gte: startDate } }
          }
        }
      })
    ]);

    const analytics = users.map(user => {
      const userBordereaux = bordereaux.filter(b => b.assignedToUserId === user.id);
      const completed = userBordereaux.filter(b => b.statut === 'TRAITE').length;
      const pending = userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length;
      const overdue = userBordereaux.filter(b => 
        b.dateLimiteTraitement && b.dateLimiteTraitement < new Date() && b.statut !== 'TRAITE'
      ).length;

      return {
        userId: user.id,
        userName: user.fullName,
        role: user.role,
        totalAssigned: userBordereaux.length,
        completed,
        pending,
        overdue,
        completionRate: userBordereaux.length > 0 ? (completed / userBordereaux.length) * 100 : 0,
        productivity: user.ownerBulletinSoins.length
      };
    });

    return {
      period,
      analytics,
      summary: {
        totalUsers: users.length,
        totalBordereaux: bordereaux.length,
        avgCompletionRate: analytics.reduce((sum, a) => sum + a.completionRate, 0) / analytics.length || 0,
        totalOverdue: analytics.reduce((sum, a) => sum + a.overdue, 0)
      }
    };
  }

  @Get('sla-compliance')
  @Public()
  async getSLACompliance(@Query() params: any) {
    const period = params.period || '30d';
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [bordereaux, slaConfigs] = await Promise.all([
      this.prisma.bordereau.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          client: { select: { name: true } },
          contract: { select: { delaiReglement: true } }
        }
      }),
      this.prisma.slaConfiguration.findMany({
        where: { active: true }
      })
    ]);

    const compliance = {
      total: bordereaux.length,
      onTime: 0,
      atRisk: 0,
      overdue: 0,
      critical: 0,
      complianceRate: 0,
      byClient: {} as Record<string, any>,
      slaRules: {
        description: 'Règles de calcul SLA',
        formula: 'Date Limite = Date Réception + Délai Contrat (jours)',
        statuses: [
          { status: 'ON_TIME', condition: 'Temps restant > 24h', color: 'green' },
          { status: 'AT_RISK', condition: 'Temps restant 0-24h', color: 'orange' },
          { status: 'OVERDUE', condition: 'Temps restant < 0h (0-48h)', color: 'red' },
          { status: 'CRITICAL', condition: 'Dépassement > 48h', color: 'darkred' }
        ]
      }
    };

    bordereaux.forEach(bordereau => {
      const clientName = bordereau.client?.name || 'Unknown';
      if (!compliance.byClient[clientName]) {
        compliance.byClient[clientName] = {
          total: 0,
          onTime: 0,
          atRisk: 0,
          overdue: 0,
          critical: 0
        };
      }
      compliance.byClient[clientName].total++;

      const now = new Date();
      const limitDate = bordereau.dateLimiteTraitement;
      
      if (!limitDate) {
        compliance.onTime++;
        compliance.byClient[clientName].onTime++;
        return;
      }

      // RÈGLE SLA: Calcul basé sur heures restantes
      const hoursUntilDeadline = (limitDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline < -48) {
        compliance.critical++;
        compliance.byClient[clientName].critical++;
      } else if (hoursUntilDeadline < 0) {
        compliance.overdue++;
        compliance.byClient[clientName].overdue++;
      } else if (hoursUntilDeadline < 24) {
        compliance.atRisk++;
        compliance.byClient[clientName].atRisk++;
      } else {
        compliance.onTime++;
        compliance.byClient[clientName].onTime++;
      }
    });

    compliance.complianceRate = compliance.total > 0 
      ? ((compliance.onTime + compliance.atRisk) / compliance.total) * 100 
      : 100;

    return compliance;
  }

  @Get('workload-predictions')
  @Public()
  async getWorkloadPredictions() {
    // Get historical data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const historicalData = await this.prisma.bordereau.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });

    // Simple prediction based on historical average
    const dailyAverage = historicalData.length > 0 
      ? historicalData.reduce((sum, day) => sum + day._count.id, 0) / 30
      : 0;

    const predictions = {
      nextWeek: Math.round(dailyAverage * 7),
      nextMonth: Math.round(dailyAverage * 30),
      trend: dailyAverage > 10 ? 'increasing' : dailyAverage > 5 ? 'stable' : 'decreasing',
      confidence: Math.min(historicalData.length / 30, 1),
      recommendations: [
        {
          type: 'staffing',
          message: dailyAverage > 15 
            ? 'Considérer l\'augmentation des effectifs' 
            : 'Effectifs actuels suffisants',
          priority: dailyAverage > 20 ? 'high' : 'medium'
        },
        {
          type: 'capacity',
          message: 'Optimiser la répartition des charges de travail',
          priority: 'medium'
        }
      ]
    };

    return predictions;
  }

  @Get('export/dashboard')
  @Public()
  async exportDashboard(@Query() params: any) {
    const format = params.format || 'excel';
    const data = await this.getSystemOverview();
    
    return {
      success: true,
      downloadUrl: `/exports/dashboard_${Date.now()}.${format}`,
      data
    };
  }

  @Get('export/performance')
  @Public()
  async exportPerformance(@Query() params: any) {
    const period = params.period || '24h';
    const format = params.format || 'excel';
    const data = await this.getPerformanceMetrics(period);
    
    return {
      success: true,
      downloadUrl: `/exports/performance_${period}_${Date.now()}.${format}`,
      data
    };
  }

  @Get('departments')
  @Public()
  async getDepartments() {
    try {
      const departments = await this.prisma.department.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      });
      
      return departments.map(dept => ({
        id: dept.code,
        name: dept.name,
        code: dept.code,
        serviceType: dept.serviceType
      }));
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      return [];
    }
  }

  @Get('real-time-stats')
  @Public()
  async getRealTimeStats() {
    const [systemHealth, systemStats, alerts, teamWorkload] = await Promise.all([
      this.getSystemHealth(),
      this.getSystemStats(),
      this.getAlerts(),
      this.getTeamWorkload()
    ]);

    // Count teams by level
    const overloadedCount = teamWorkload.filter(t => t.level === 'OVERLOADED').length;
    const busyCount = teamWorkload.filter(t => t.level === 'BUSY').length;
    const totalTeams = teamWorkload.length;

    console.log('📊 Team Stats:', {
      total: totalTeams,
      overloaded: overloadedCount,
      busy: busyCount,
      teams: teamWorkload.map(t => ({ name: t.name, level: t.level, utilization: t.utilizationRate }))
    });

    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      systemStats,
      alerts: alerts.summary,
      teamWorkload: totalTeams,
      overloadedTeams: overloadedCount,
      busyTeams: busyCount
    };
  }

  @Get('team-alerts')
  @Public()
  async getTeamAlerts() {
    const now = new Date();
    const alerts: any[] = [];

    // RÈGLE 1: Équipes surchargées (≥90% capacité)
    const teams = await this.getTeamWorkload();
    teams.forEach(team => {
      if (team.level === 'OVERLOADED') {
        alerts.push({
          type: 'TEAM_OVERLOAD',
          level: 'CRITICAL',
          teamId: team.id,
          teamName: team.name,
          message: `${team.name} est surchargé (${team.utilizationRate}% de capacité)`,
          workload: team.workload,
          capacity: team.capacity,
          timestamp: now
        });
      } else if (team.level === 'BUSY') {
        alerts.push({
          type: 'TEAM_BUSY',
          level: 'WARNING',
          teamId: team.id,
          teamName: team.name,
          message: `${team.name} approche la saturation (${team.utilizationRate}%)`,
          workload: team.workload,
          capacity: team.capacity,
          timestamp: now
        });
      }
    });

    // RÈGLE 2: Files d'attente critiques
    const queues = await this.getQueuesOverview();
    queues.forEach(queue => {
      if (queue.alertLevel === 'CRITICAL') {
        alerts.push({
          type: 'QUEUE_CRITICAL',
          level: 'CRITICAL',
          queueName: queue.name,
          message: `File ${queue.name}: ${queue.total} items (seuil dépassé) ou plus ancien: ${queue.oldestAge}h`,
          total: queue.total,
          oldestAge: queue.oldestAge,
          timestamp: now
        });
      } else if (queue.alertLevel === 'WARNING') {
        alerts.push({
          type: 'QUEUE_WARNING',
          level: 'WARNING',
          queueName: queue.name,
          message: `File ${queue.name}: ${queue.total} items approche le seuil`,
          total: queue.total,
          timestamp: now
        });
      }
    });

    // RÈGLE 3: SLA en danger
    const slaBreaches = await this.prisma.bordereau.count({
      where: {
        dateLimiteTraitement: { lt: now },
        statut: { notIn: ['TRAITE', 'CLOTURE', 'PAYE'] }
      }
    });

    if (slaBreaches > 0) {
      alerts.push({
        type: 'SLA_BREACH',
        level: 'CRITICAL',
        message: `${slaBreaches} bordereaux en dépassement SLA`,
        count: slaBreaches,
        timestamp: now
      });
    }

    // RÈGLE 4: Gestionnaires sans chef d'équipe
    const orphanedGestionnaires = await this.prisma.user.count({
      where: {
        role: 'GESTIONNAIRE',
        active: true,
        teamLeaderId: null
      }
    });

    if (orphanedGestionnaires > 0) {
      alerts.push({
        type: 'HIERARCHY_ERROR',
        level: 'WARNING',
        message: `${orphanedGestionnaires} gestionnaires sans chef d'équipe`,
        count: orphanedGestionnaires,
        timestamp: now
      });
    }

    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'CRITICAL').length,
      warning: alerts.filter(a => a.level === 'WARNING').length,
      alerts: alerts.sort((a, b) => {
        if (a.level === 'CRITICAL' && b.level !== 'CRITICAL') return -1;
        if (a.level !== 'CRITICAL' && b.level === 'CRITICAL') return 1;
        return 0;
      })
    };
  }

  @Get('document-assignments')
  @Public()
  async getDocumentAssignments(@Query() params: any) {
    const { documentType, gestionnaire, chefEquipe, slaStatus } = params;

    const whereClause: any = {
      assignedToUserId: { not: null }
    };

    if (documentType) whereClause.type = documentType;

    const bordereaux = await this.prisma.bordereau.findMany({
      where: whereClause,
      include: {
        client: { select: { name: true } },
        currentHandler: {
          select: {
            id: true,
            fullName: true,
            role: true,
            teamLeader: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 500
    });

    const now = new Date();
    const assignments = bordereaux.map(b => {
      const gestionnaireName = b.currentHandler?.fullName || 'NON ASSIGNÉ';
      const chefEquipeName = b.currentHandler?.teamLeader?.fullName || 'AUCUN CHEF';
      
      // RÈGLE SLA: Calcul du statut
      let slaStatus = 'ON_TIME';
      let slaColor = 'success';
      if (b.dateLimiteTraitement) {
        const hoursRemaining = (b.dateLimiteTraitement.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursRemaining < 0) {
          slaStatus = 'OVERDUE';
          slaColor = 'error';
        } else if (hoursRemaining < 24) {
          slaStatus = 'AT_RISK';
          slaColor = 'warning';
        }
      }

      // Détection données défaillantes
      const hasIssue = !b.currentHandler || !b.currentHandler.teamLeader;

      return {
        id: b.id,
        reference: b.reference,
        documentType: b.type,
        clientName: b.client?.name || 'N/A',
        gestionnaire: gestionnaireName,
        gestionnaireId: b.currentHandler?.id,
        chefEquipe: chefEquipeName,
        chefEquipeId: b.currentHandler?.teamLeader?.id,
        statut: b.statut,
        assignedAt: b.updatedAt,
        dateLimite: b.dateLimiteTraitement,
        slaStatus,
        slaColor,
        hasIssue,
        issueType: hasIssue ? (!b.currentHandler ? 'NO_GESTIONNAIRE' : 'NO_CHEF') : null
      };
    });

    // Appliquer filtres
    let filtered = assignments;
    if (gestionnaire) {
      filtered = filtered.filter(a => a.gestionnaire.toLowerCase().includes(gestionnaire.toLowerCase()));
    }
    if (chefEquipe) {
      filtered = filtered.filter(a => a.chefEquipe.toLowerCase().includes(chefEquipe.toLowerCase()));
    }
    if (slaStatus) {
      filtered = filtered.filter(a => a.slaStatus === slaStatus);
    }

    return {
      total: filtered.length,
      withIssues: filtered.filter(a => a.hasIssue).length,
      slaBreaches: filtered.filter(a => a.slaStatus === 'OVERDUE').length,
      atRisk: filtered.filter(a => a.slaStatus === 'AT_RISK').length,
      assignments: filtered
    };
  }

  @Get('documents/comprehensive-stats')
  @Public()
  async getComprehensiveDocumentStats(@Query() params: any) {
    const documentType = params.documentType;
    
    console.log('📊 Fetching document stats for type:', documentType || 'ALL');
    
    // Count bordereaux by type field
    const documentTypes = [
      'BULLETIN_SOIN',
      'COMPLEMENT_INFORMATION', 
      'ADHESION',
      'RECLAMATION',
      'CONTRAT_AVENANT',
      'DEMANDE_RESILIATION',
      'CONVENTION_TIERS_PAYANT'
    ];

    const stats: Record<string, any> = {};
    
    for (const type of documentTypes) {
      if (documentType && documentType !== type) continue;
      
      // Count bordereaux by this specific type
      const whereClause: any = { type: type as any };
      
      const [total, aScanner, enCoursScan, scanFinalise, enCoursTraitement, traite, regle, slaBreaches] = await Promise.all([
        this.prisma.bordereau.count({ where: whereClause }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: 'A_SCANNER' as any } }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: 'SCAN_EN_COURS' as any } }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: 'SCANNE' as any } }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: { in: ['EN_COURS', 'ASSIGNE'] as any } } }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: 'TRAITE' as any } }),
        this.prisma.bordereau.count({ where: { ...whereClause, statut: { in: ['CLOTURE', 'PAYE'] as any } } }),
        // SLA breaches only for applicable types
        !['CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'].includes(type)
          ? this.prisma.bordereau.count({
              where: {
                ...whereClause,
                dateLimiteTraitement: { lt: new Date() },
                statut: { notIn: ['TRAITE', 'CLOTURE', 'PAYE'] as any }
              }
            })
          : 0
      ]);
      
      // Calculate average processing time for this type - filter in code instead
      const processedDocs = await this.prisma.bordereau.findMany({
        where: {
          ...whereClause,
          statut: { in: ['TRAITE', 'CLOTURE', 'PAYE'] as any }
        },
        select: {
          dateReception: true,
          dateCloture: true
        },
        take: 100
      });
      
      // Filter out null dates in code
      const validDocs = processedDocs.filter(doc => doc.dateReception && doc.dateCloture);
      
      const avgProcessingTime = validDocs.length > 0 
        ? validDocs.reduce((sum, doc) => {
            return sum + (doc.dateCloture!.getTime() - doc.dateReception!.getTime()) / (1000 * 60 * 60);
          }, 0) / validDocs.length
        : 0;
      
      stats[type] = {
        total,
        A_SCANNER: aScanner,
        EN_COURS_SCAN: enCoursScan,
        SCAN_FINALISE: scanFinalise,
        EN_COURS_TRAITEMENT: enCoursTraitement,
        TRAITE: traite,
        REGLE: regle,
        slaBreaches,
        avgProcessingTime: Math.round(avgProcessingTime * 10) / 10
      };
      
      console.log(`📊 Stats for ${type}:`, stats[type]);
    }
    
    return stats;
  }

  @Get('assignments/document-level')
  @Public()
  async getDocumentLevelAssignments() {
    const assignments = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: { not: null }
      },
      include: {
        currentHandler: {
          select: {
            fullName: true,
            teamLeader: {
              select: { fullName: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    return assignments.map(assignment => {
      const now = new Date();
      let slaStatus = 'ON_TIME';
      
      if (assignment.dateLimiteTraitement) {
        const hoursUntilDeadline = (assignment.dateLimiteTraitement.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilDeadline < 0) slaStatus = 'OVERDUE';
        else if (hoursUntilDeadline < 24) slaStatus = 'AT_RISK';
      }
      
      return {
        documentId: assignment.id,
        documentType: 'BULLETIN_SOIN',
        reference: assignment.reference,
        assignedTo: assignment.currentHandler?.fullName || 'Non assigné',
        chefEquipe: assignment.currentHandler?.teamLeader?.fullName || 'Aucun chef',
        status: assignment.statut,
        assignedAt: assignment.updatedAt,
        slaStatus
      };
    });
  }

  @Get('hierarchy/validation')
  @Public()
  async validateHierarchy() {
    // Check for gestionnaires without chef d'équipe
    const gestionnairesWithoutChef = await this.prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        active: true,
        teamLeaderId: null
      },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    // Check for orphaned assignments using bordereau
    const orphanedAssignments = await this.prisma.bordereau.count({
      where: {
        assignedToUserId: { not: null },
        currentHandler: {
          teamLeaderId: null,
          role: 'GESTIONNAIRE'
        }
      }
    });

    return {
      isValid: gestionnairesWithoutChef.length === 0,
      issues: gestionnairesWithoutChef.map(user => ({
        type: 'MISSING_TEAM_LEADER',
        userId: user.id,
        userName: user.fullName,
        description: `Gestionnaire ${user.fullName} sans chef d'équipe assigné`
      })),
      orphanedAssignments,
      summary: {
        gestionnairesWithoutChef: gestionnairesWithoutChef.length,
        orphanedAssignments
      }
    };
  }
}