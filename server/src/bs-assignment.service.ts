import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export const BS_ASSIGNABLE_ROLES = ['CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] as const;
export type BsAssignableRole = typeof BS_ASSIGNABLE_ROLES[number];
export type AssignmentEntityType = 'BS' | 'BORDEREAU' | 'DOCUMENT';
export type AssignmentDocumentType =
  | 'BULLETIN_SOIN'
  | 'COMPLEMENT_INFORMATION'
  | 'ADHESION'
  | 'RECLAMATION'
  | 'CONTRAT_AVENANT'
  | 'DEMANDE_RESILIATION'
  | 'CONVENTION_TIERS_PAYANT';

const ACTIVE_ETATS = ['IN_PROGRESS', 'ASSIGNED'];

@Injectable()
export class BsAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getEligibleUsers(excludeUserId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: BS_ASSIGNABLE_ROLES as unknown as string[] },
        active: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        department: true,
        capacity: true,
        teamLeaderId: true,
        ownerBulletinSoins: {
          where: { etat: { in: ACTIVE_ETATS }, deletedAt: null },
          select: { id: true }
        }
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }]
    });

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      capacity: u.capacity,
      teamLeaderId: u.teamLeaderId,
      currentLoad: u.ownerBulletinSoins.length,
      utilizationRate: u.capacity > 0 ? Math.round((u.ownerBulletinSoins.length / u.capacity) * 100) : 0
    }));
  }

  async getDossiers(params: {
    entityType?: AssignmentEntityType;
    ownerId?: string;
    ownerRole?: string;
    documentType?: AssignmentDocumentType;
    etat?: string;
    search?: string;
    unassignedOnly?: string | boolean;
    page?: number;
    pageSize?: number;
  }) {
    if (params.entityType && params.entityType !== 'BS') {
      return this.getAssignmentRecords(params.entityType, params);
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 50));

    const where: any = { deletedAt: null };

    // Some installations store BS scans as Document rows instead of
    // BulletinSoin rows. Keep the normalized BS path when it has data, but
    // expose the actual BS documents when the normalized table is empty.
    const bulletinSoinCount = await this.prisma.bulletinSoin.count({ where });
    if (bulletinSoinCount === 0) {
      return this.getDocumentBasedBsDossiers(params);
    }

    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.etat) where.etat = params.etat;
    if (params.unassignedOnly === 'true' || params.unassignedOnly === true) where.ownerId = null;
    if (params.search) {
      where.OR = [
        { numBs: { contains: params.search, mode: 'insensitive' } },
        { codeAssure: { contains: params.search, mode: 'insensitive' } },
        { nomAssure: { contains: params.search, mode: 'insensitive' } },
        { nomSociete: { contains: params.search, mode: 'insensitive' } }
      ];
    }
    if (params.ownerRole) {
      where.owner = { role: params.ownerRole };
    }

    const [total, items] = await Promise.all([
      this.prisma.bulletinSoin.count({ where }),
      this.prisma.bulletinSoin.findMany({
        where,
        include: {
          owner: { select: { id: true, fullName: true, role: true } },
          bordereau: { select: { reference: true, client: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      total,
      page,
      pageSize,
      dossiers: items.map(bs => ({
        id: bs.id,
        numBs: bs.numBs,
        etat: bs.etat,
        codeAssure: bs.codeAssure,
        nomAssure: bs.nomAssure,
        nomSociete: bs.nomSociete,
        totalPec: bs.totalPec,
        montant: bs.montant,
        dateCreation: bs.dateCreation,
        createdAt: bs.createdAt,
        assignedAt: bs.assignedAt,
        bordereauReference: bs.bordereau?.reference || null,
        clientName: bs.bordereau?.client?.name || null,
        owner: bs.owner ? { id: bs.owner.id, fullName: bs.owner.fullName, role: bs.owner.role } : null
      }))
    };
  }

  async reassign(data: {
    entityType?: AssignmentEntityType;
    bulletinSoinIds: string[];
    targetUserId: string;
    performedByUserId: string;
    reason?: string;
  }) {
    if (data.entityType && data.entityType !== 'BS') {
      return this.reassignRecords(data.entityType, data.bulletinSoinIds, data.targetUserId, data.performedByUserId, data.reason);
    }

    if (!data.bulletinSoinIds?.length) {
      throw new BadRequestException('Aucun dossier sélectionné');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: data.targetUserId } });
    if (!targetUser) throw new NotFoundException('Utilisateur cible introuvable');
    if (!targetUser.active) throw new BadRequestException('Utilisateur cible inactif');
    if (!BS_ASSIGNABLE_ROLES.includes(targetUser.role as BsAssignableRole)) {
      throw new BadRequestException(
        `Le rôle ${targetUser.role} n'est pas éligible pour recevoir des dossiers BS. Rôles autorisés: ${BS_ASSIGNABLE_ROLES.join(', ')}`
      );
    }

    const performedBy = await this.prisma.user.findUnique({ where: { id: data.performedByUserId } });
    if (!performedBy) throw new NotFoundException('Utilisateur exécutant introuvable');

    const dossiers = await this.prisma.bulletinSoin.findMany({
      where: { id: { in: data.bulletinSoinIds }, deletedAt: null }
    });

    if (!dossiers.length) {
      return this.reassignRecords('DOCUMENT', data.bulletinSoinIds, data.targetUserId, data.performedByUserId, data.reason);
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const bs of dossiers) {
      try {
        const fromUserId = bs.ownerId;

        // IMPORTANT: only ownerId / assignedAt / assignedByUserId are touched.
        // `etat` (statut du BS) is intentionally NEVER modified here.
        await this.prisma.bulletinSoin.update({
          where: { id: bs.id },
          data: {
            ownerId: data.targetUserId,
            assignedAt: new Date(),
            assignedByUserId: data.performedByUserId
          }
        });

        await this.prisma.bulletinSoinAssignmentHistory.create({
          data: {
            bulletinSoinId: bs.id,
            assignedToUserId: data.targetUserId,
            assignedByUserId: data.performedByUserId,
            fromUserId: fromUserId || null,
            action: fromUserId ? 'REASSIGNED' : 'ASSIGNED',
            reason: data.reason || null,
            etatAtAssignment: bs.etat
          }
        });

        await this.prisma.bSLog.create({
          data: {
            userId: data.performedByUserId,
            bsId: bs.id,
            action: fromUserId ? 'REASSIGNED' : 'ASSIGNED'
          }
        });

        results.push({ id: bs.id, success: true });
      } catch (error: any) {
        results.push({ id: bs.id, success: false, error: error.message });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: data.performedByUserId,
        action: 'BS_REASSIGNMENT',
        details: {
          targetUserId: data.targetUserId,
          targetUserName: targetUser.fullName,
          targetUserRole: targetUser.role,
          count: results.filter(r => r.success).length,
          bulletinSoinIds: results.filter(r => r.success).map(r => r.id),
          reason: data.reason || null
        }
      }
    });

    return {
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async getHistory(bulletinSoinId: string) {
    return this.prisma.bulletinSoinAssignmentHistory.findMany({
      where: { bulletinSoinId },
      include: {
        assignedTo: { select: { fullName: true, role: true } },
        assignedBy: { select: { fullName: true, role: true } },
        fromUser: { select: { fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async getDocumentBasedBsDossiers(params: {
    ownerId?: string;
    ownerRole?: string;
    search?: string;
    unassignedOnly?: string | boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 50));
    const search = params.search?.trim();
    const where: any = { type: 'BULLETIN_SOIN' };

    if (params.ownerId) where.assignedToUserId = params.ownerId;
    if (params.unassignedOnly === 'true' || params.unassignedOnly === true) where.assignedToUserId = null;
    if (params.ownerRole) where.assignedTo = { role: params.ownerRole };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bordereau: { reference: { contains: search, mode: 'insensitive' } } },
        { bordereau: { client: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, fullName: true, role: true } },
          bordereau: { select: { reference: true, statut: true, client: { select: { name: true } } } }
        },
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      total,
      page,
      pageSize,
      dossiers: items.map(document => ({
        id: document.id,
        entityType: 'BS' as AssignmentEntityType,
        numBs: document.name,
        etat: document.status || document.bordereau?.statut || '—',
        codeAssure: '',
        nomAssure: document.name,
        nomSociete: document.bordereau?.client?.name || '',
        totalPec: 0,
        dateCreation: document.uploadedAt,
        createdAt: document.uploadedAt,
        assignedAt: document.assignedAt,
        bordereauReference: document.bordereau?.reference || null,
        clientName: document.bordereau?.client?.name || null,
        owner: document.assignedTo
      }))
    };
  }

  private async getAssignmentRecords(entityType: AssignmentEntityType, params: {
    ownerId?: string;
    ownerRole?: string;
    documentType?: AssignmentDocumentType;
    search?: string;
    unassignedOnly?: string | boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 50));
    const search = params.search?.trim();

    if (entityType === 'DOCUMENT') {
      const where: any = {};
      if (params.documentType) where.type = params.documentType;
      if (params.ownerId) where.assignedToUserId = params.ownerId;
      if (params.unassignedOnly === 'true' || params.unassignedOnly === true) where.assignedToUserId = null;
      if (params.ownerRole) where.assignedTo = { role: params.ownerRole };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { bordereau: { reference: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [total, items] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({
          where,
          include: {
            assignedTo: { select: { id: true, fullName: true, role: true } },
            bordereau: { select: { reference: true, statut: true } }
          },
          orderBy: { uploadedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      return {
        total, page, pageSize,
        dossiers: items.map(doc => ({
          id: doc.id,
          entityType,
          name: doc.name,
          type: doc.type,
          status: doc.status,
          etat: doc.status,
          reference: doc.bordereau?.reference || null,
          bordereauReference: doc.bordereau?.reference || null,
          owner: doc.assignedTo,
          assignedAt: doc.assignedAt
        }))
      };
    }

    const where: any = { archived: false };
    if (params.ownerId) where.assignedToUserId = params.ownerId;
    if (params.unassignedOnly === 'true' || params.unassignedOnly === true) where.assignedToUserId = null;
    if (params.ownerRole) where.User = { role: params.ownerRole };
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.bordereau.count({ where }),
      this.prisma.bordereau.findMany({
        where,
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const ownerIds = items.map(item => item.assignedToUserId).filter((id): id is string => Boolean(id));
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, fullName: true, role: true }
    });
    const ownerById = new Map(owners.map(owner => [owner.id, owner]));

    return {
      total, page, pageSize,
      dossiers: items.map(bordereau => ({
        id: bordereau.id,
        entityType,
        reference: bordereau.reference,
        bordereauReference: bordereau.reference,
        clientName: bordereau.client?.name || null,
        statut: bordereau.statut,
        etat: bordereau.statut,
        status: bordereau.statut,
        owner: bordereau.assignedToUserId ? ownerById.get(bordereau.assignedToUserId) || null : null
      }))
    };
  }

  private async reassignRecords(
    entityType: AssignmentEntityType,
    ids: string[],
    targetUserId: string,
    performedByUserId: string,
    reason?: string
  ) {
    if (!ids?.length) throw new BadRequestException('Aucun élément sélectionné');

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Utilisateur cible introuvable');
    if (!targetUser.active) throw new BadRequestException('Utilisateur cible inactif');
    if (!BS_ASSIGNABLE_ROLES.includes(targetUser.role as BsAssignableRole)) {
      throw new BadRequestException(`Le rôle ${targetUser.role} n'est pas éligible pour recevoir ces éléments`);
    }

    const performedBy = await this.prisma.user.findUnique({ where: { id: performedByUserId } });
    if (!performedBy) throw new NotFoundException('Utilisateur exécutant introuvable');

    const uniqueIds = [...new Set(ids)];
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const id of uniqueIds) {
      try {
        if (entityType === 'DOCUMENT') {
          const document = await this.prisma.document.findUnique({ where: { id } });
          if (!document) throw new NotFoundException('Document introuvable');

          await this.prisma.$transaction(async tx => {
            await tx.document.update({
              where: { id },
              data: {
                assignedToUserId: targetUserId,
                assignedAt: new Date(),
                assignedByUserId: performedByUserId
              }
            });
            await tx.documentAssignmentHistory.create({
              data: {
                documentId: id,
                assignedToUserId: targetUserId,
                assignedByUserId: performedByUserId,
                fromUserId: document.assignedToUserId,
                action: document.assignedToUserId ? 'REASSIGNED' : 'ASSIGNED',
                reason: reason || null
              }
            });
          });
        } else {
          const bordereau = await this.prisma.bordereau.findUnique({
            where: { id },
            select: { id: true, assignedToUserId: true, statut: true }
          });
          if (!bordereau) throw new NotFoundException('Bordereau introuvable');

          await this.prisma.$transaction(async tx => {
            await tx.bordereau.update({
              where: { id },
              data: {
                assignedToUserId: targetUserId,
                currentHandlerId: targetUserId
              }
            });

            const documents = await tx.document.findMany({
              where: { bordereauId: id },
              select: { id: true, assignedToUserId: true }
            });
            if (documents.length) {
              await tx.document.updateMany({
                where: { bordereauId: id },
                data: {
                  assignedToUserId: targetUserId,
                  assignedAt: new Date(),
                  assignedByUserId: performedByUserId
                }
              });
              await tx.documentAssignmentHistory.createMany({
                data: documents.map(document => ({
                  documentId: document.id,
                  assignedToUserId: targetUserId,
                  assignedByUserId: performedByUserId,
                  fromUserId: document.assignedToUserId,
                  action: document.assignedToUserId ? 'REASSIGNED' : 'ASSIGNED',
                  reason: reason || 'Réaffectation du bordereau'
                }))
              });
            }

            const bulletinSoins = await tx.bulletinSoin.findMany({
              where: { bordereauId: id, deletedAt: null },
              select: { id: true, ownerId: true, etat: true }
            });
            if (bulletinSoins.length) {
              await tx.bulletinSoin.updateMany({
                where: { bordereauId: id, deletedAt: null },
                data: {
                  ownerId: targetUserId,
                  assignedAt: new Date(),
                  assignedByUserId: performedByUserId
                }
              });
              await tx.bulletinSoinAssignmentHistory.createMany({
                data: bulletinSoins.map(bs => ({
                  bulletinSoinId: bs.id,
                  assignedToUserId: targetUserId,
                  assignedByUserId: performedByUserId,
                  fromUserId: bs.ownerId,
                  action: bs.ownerId ? 'REASSIGNED' : 'ASSIGNED',
                  reason: reason || 'Réaffectation du bordereau',
                  etatAtAssignment: bs.etat
                }))
              });
            }

            await tx.actionLog.create({
              data: {
                bordereauId: id,
                action: 'SUPER_ADMIN_REASSIGN_BORDEREAU',
                details: {
                  fromUserId: bordereau.assignedToUserId,
                  toUserId: targetUserId,
                  preservedStatut: bordereau.statut,
                  reason: reason || null
                }
              }
            });
          });
        }

        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: performedByUserId,
        action: `SUPER_ADMIN_REASSIGN_${entityType}`,
        details: {
          entityType,
          targetUserId,
          count: results.filter(result => result.success).length,
          ids: results.filter(result => result.success).map(result => result.id),
          reason: reason || null
        }
      }
    });

    return {
      assigned: results.filter(result => result.success).length,
      failed: results.filter(result => !result.success).length,
      results
    };
  }
}