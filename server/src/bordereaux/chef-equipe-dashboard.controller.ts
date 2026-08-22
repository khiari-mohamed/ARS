import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

// NOTE: GestionnaireSeniorDashboardController used to live in this file too.
// It duplicated routes already defined in bordereaux.controller.ts
// (bordereaux/gestionnaire-senior/*) with a thinner implementation, which is a
// silent route-shadowing risk. It has been removed — that feature area now
// lives solely in bordereaux.controller.ts. Remove GestionnaireSeniorDashboardController
// from this module's `controllers: []` array if it's still referenced there.

const CACHE_TTL_SECONDS = 30;
const CHEF_EQUIPE_CACHE_PREFIX = 'dashboard:chef-equipe:';
const LOCKED_BORDEREAU_STATUT = 'VIREMENT_EXECUTE';

const DOCUMENT_STATUS_MAPPING: Record<string, string> = {
  Nouveau: 'UPLOADED',
  'En cours': 'EN_COURS',
  Traité: 'TRAITE',
  Rejeté: 'REJETE',
  Retourné: 'RETOUR_ADMIN',
};

function validateAndMapDocumentStatus(newStatus: string): string {
  if (!Object.prototype.hasOwnProperty.call(DOCUMENT_STATUS_MAPPING, newStatus)) {
    throw new BadRequestException(`Statut invalide: "${newStatus}"`);
  }
  return DOCUMENT_STATUS_MAPPING[newStatus];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/chef-equipe')
export class ChefEquipeDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('gestionnaire-assignments-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getGestionnaireAssignmentsDossiers(@Req() req) {
    const cacheKey = `${CHEF_EQUIPE_CACHE_PREFIX}assignments:${req.user.role}:${req.user.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const accessFilter = this.buildAccessFilter(req.user);
    const bordereauWhere = { ...accessFilter, archived: false };

    let gestionnaireFilter: any = { role: 'GESTIONNAIRE' };
    if (req.user?.role === 'CHEF_EQUIPE') {
      gestionnaireFilter.teamLeaderId = req.user.id;
    }

    const gestionnaires = await this.prisma.user.findMany({
      where: gestionnaireFilter,
      select: { id: true, fullName: true },
    });

    if (gestionnaires.length === 0) {
      await this.redis.set(cacheKey, [], CACHE_TTL_SECONDS);
      return [];
    }

    const gestionnaireIds = gestionnaires.map((g) => g.id);

    const [statusCounts, typeCounts, returnedDocs] = await Promise.all([
      this.prisma.document.groupBy({
        by: ['assignedToUserId', 'status'],
        where: { assignedToUserId: { in: gestionnaireIds }, bordereau: bordereauWhere },
        _count: { id: true },
      }),
      this.prisma.document.groupBy({
        by: ['assignedToUserId', 'type'],
        where: { assignedToUserId: { in: gestionnaireIds }, bordereau: bordereauWhere },
        _count: { id: true },
      }),
      this.prisma.document.findMany({
        where: {
          assignedToUserId: { in: gestionnaireIds },
          status: { in: ['RETOUR_ADMIN', 'REJETE'] },
          bordereau: bordereauWhere,
        },
        select: { id: true, assignedToUserId: true },
      }),
    ]);

    const statusMap = new Map<string, Record<string, number>>();
    statusCounts.forEach((row) => {
      if (!row.assignedToUserId) return;
      const entry = statusMap.get(row.assignedToUserId) || {};
      entry[row.status ?? 'NULL'] = row._count.id;
      statusMap.set(row.assignedToUserId, entry);
    });

    const typeMap = new Map<string, Record<string, number>>();
    typeCounts.forEach((row) => {
      if (!row.assignedToUserId) return;
      const entry = typeMap.get(row.assignedToUserId) || {};
      entry[row.type] = row._count.id;
      typeMap.set(row.assignedToUserId, entry);
    });

    const docIdsByGestionnaire = new Map<string, string[]>();
    returnedDocs.forEach((d) => {
      if (!d.assignedToUserId) return;
      const arr = docIdsByGestionnaire.get(d.assignedToUserId) || [];
      arr.push(d.id);
      docIdsByGestionnaire.set(d.assignedToUserId, arr);
    });

    let sortedHistories: { documentId: string; assignedBy: { fullName: string } | null }[] = [];
    if (returnedDocs.length > 0) {
      sortedHistories = await this.prisma.documentAssignmentHistory.findMany({
        where: { documentId: { in: returnedDocs.map((d) => d.id) }, action: 'RETURNED' },
        select: { documentId: true, assignedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const resolveReturnedBy = (gestionnaireId: string, fallbackName: string): string | null => {
      const docIds = docIdsByGestionnaire.get(gestionnaireId);
      if (!docIds || docIds.length === 0) return null;
      const docIdSet = new Set(docIds);
      const match = sortedHistories.find((h) => docIdSet.has(h.documentId));
      return match?.assignedBy?.fullName || fallbackName;
    };

    const assignments = gestionnaires.map((gestionnaire) => {
      const statuses = statusMap.get(gestionnaire.id) || {};
      const totalAssigned = Object.values(statuses).reduce((sum, n) => sum + n, 0);
      const traites = statuses['TRAITE'] || 0;
      const enCours = statuses['EN_COURS'] || 0;
      const retournes = (statuses['RETOUR_ADMIN'] || 0) + (statuses['REJETE'] || 0);

      return {
        gestionnaire: gestionnaire.fullName,
        totalAssigned,
        traites,
        enCours,
        retournes,
        returnedBy: retournes > 0 ? resolveReturnedBy(gestionnaire.id, gestionnaire.fullName) : null,
        documentsByType: typeMap.get(gestionnaire.id) || {},
      };
    }).filter((assignment) => assignment.totalAssigned > 0);

    await this.redis.set(cacheKey, assignments, CACHE_TTL_SECONDS);
    return assignments;
  }

  @Get('dashboard-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDashboardDossiers(@Req() req) {
    const cacheKey = `${CHEF_EQUIPE_CACHE_PREFIX}dossiers:${req.user.role}:${req.user.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const accessFilter = this.buildAccessFilter(req.user);
    const documents = await this.prisma.document.findMany({
      where: { bordereau: { ...accessFilter, archived: false } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        uploadedAt: true,
        bordereau: { select: { statut: true, client: { select: { name: true } } } },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    });

    const dossiers = documents.map((doc) => ({
      id: doc.id,
      reference: doc.name,
      nom: doc.name,
      client: doc.bordereau?.client?.name || 'N/A',
      type: this.mapDocumentType(doc.type),
      statut: this.mapDocumentStatus(doc.status || 'EN_COURS'),
      date: doc.uploadedAt.toLocaleDateString('fr-FR'),
      gestionnaire: doc.assignedTo?.fullName || 'Non assigné',
      completionPercentage: this.calculateCompletionPercentage(doc.status),
      dossierStates: this.getDocumentStates(doc.status),
      bordereauStatutRaw: doc.bordereau?.statut,
    }));

    await this.redis.set(cacheKey, dossiers, CACHE_TTL_SECONDS);
    return dossiers;
  }

  private mapDocumentType(type: string): string {
    const mapping = {
      BULLETIN_SOIN: 'Bulletin de soins',
      COMPLEMENT_INFORMATION: "Complément d'information",
      ADHESION: 'Adhésion',
      RECLAMATION: 'Réclamation',
      CONTRAT_AVENANT: 'Contrat/Avenant',
      DEMANDE_RESILIATION: 'Demande de résiliation',
      CONVENTION_TIERS_PAYANT: 'Convention tiers payant',
    };
    return mapping[type] || type;
  }

  private mapDocumentStatus(status: string | null): string {
    if (!status) return 'En cours';
    const mapping = {
      UPLOADED: 'Nouveau',
      SCANNE: 'Scanné',
      EN_COURS: 'En cours',
      TRAITE: 'Traité',
      REJETE: 'Rejeté',
      RETOUR_ADMIN: 'Retourné',
    };
    return mapping[status] || status || 'En cours';
  }

  private calculateCompletionPercentage(status: string | null): number {
    if (status === 'TRAITE') return 100;
    if (status === 'EN_COURS') return 60;
    if (status === 'REJETE' || status === 'RETOUR_ADMIN') return 25;
    return 30;
  }

  private getDocumentStates(status: string | null): string[] {
    if (status === 'TRAITE') return ['Traité'];
    if (status === 'EN_COURS') return ['En cours'];
    if (status === 'REJETE' || status === 'RETOUR_ADMIN') return ['Retourné'];
    return ['Nouveau'];
  }

  @Get('dashboard-stats-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDashboardStatsDossiers(@Req() req) {
    const cacheKey = `${CHEF_EQUIPE_CACHE_PREFIX}stats:${req.user.role}:${req.user.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const accessFilter = this.buildAccessFilter(req.user);
    const docsWithDetails = await this.prisma.document.findMany({
      where: { bordereau: { ...accessFilter, archived: false } },
      select: {
        type: true,
        bordereau: { select: { client: { select: { name: true } } } },
        assignedTo: { select: { fullName: true } },
      },
    });

    const stats = {
      prestation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      adhesion: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      complement: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      reclamation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      avenant: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
    };

    const typeMapping = {
      BULLETIN_SOIN: 'prestation',
      ADHESION: 'adhesion',
      COMPLEMENT_INFORMATION: 'complement',
      DEMANDE_RESILIATION: 'resiliation',
      RECLAMATION: 'reclamation',
      CONTRAT_AVENANT: 'avenant',
      CONVENTION_TIERS_PAYANT: 'avenant',
    };

    docsWithDetails.forEach((doc) => {
      const category = typeMapping[doc.type] || 'prestation';
      const clientName = doc.bordereau?.client?.name || 'Inconnu';
      const gestionnaireName = doc.assignedTo?.fullName || 'Non assigné';

      stats[category].total++;
      stats[category].breakdown[clientName] = (stats[category].breakdown[clientName] || 0) + 1;
      stats[category].gestionnaireBreakdown[gestionnaireName] =
        (stats[category].gestionnaireBreakdown[gestionnaireName] || 0) + 1;
    });

    await this.redis.set(cacheKey, stats, CACHE_TTL_SECONDS);
    return stats;
  }

  @Get('dossier-pdf/:dossierId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDossierPDF(@Param('dossierId') dossierId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: dossierId },
      select: { path: true },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return { pdfUrl: document.path ? `/uploads/${document.path}` : null };
  }

  @Post('modify-dossier-status')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async modifyDossierStatus(@Body() body: { dossierId: string; newStatus: string }) {
    const { dossierId, newStatus } = body;

    const document = await this.prisma.document.findUnique({
      where: { id: dossierId },
      select: { id: true, bordereau: { select: { statut: true } } },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (document.bordereau?.statut === LOCKED_BORDEREAU_STATUT) {
      throw new BadRequestException('Action impossible: le virement a déjà été exécuté pour ce bordereau.');
    }

    const mappedStatus = validateAndMapDocumentStatus(newStatus);

    try {
      await this.prisma.document.update({
        where: { id: dossierId },
        data: { status: mappedStatus as any },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Document not found');
      }
      throw error;
    }

    await this.redis.invalidatePrefix(CHEF_EQUIPE_CACHE_PREFIX);
    return { success: true };
  }

  @Post('remove-document-from-bordereau')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async removeDocumentFromBordereau(@Body() body: { documentId: string }, @Req() req) {
    const document = await this.prisma.document.findUnique({
      where: { id: body.documentId },
      select: { id: true, bordereauId: true, bordereau: { select: { statut: true } } },
    });

    if (!document || !document.bordereauId) {
      throw new NotFoundException('Document not found or not linked to bordereau');
    }
    if (document.bordereau?.statut === LOCKED_BORDEREAU_STATUT) {
      throw new BadRequestException('Action impossible: le virement a déjà été exécuté pour ce bordereau.');
    }

    await this.prisma.document.update({
      where: { id: body.documentId },
      data: { bordereauId: null, assignedToUserId: null },
    });

    await this.redis.invalidatePrefix(CHEF_EQUIPE_CACHE_PREFIX);
    return { success: true, message: 'Document retiré du bordereau' };
  }

  @Post('add-document-to-bordereau')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async addDocumentToBordereau(@Body() body: { documentId: string; bordereauId: string }, @Req() req) {
    const [document, bordereau] = await Promise.all([
      this.prisma.document.findUnique({ where: { id: body.documentId }, select: { id: true } }),
      this.prisma.bordereau.findUnique({ where: { id: body.bordereauId }, select: { id: true, statut: true } }),
    ]);

    if (!document) throw new NotFoundException('Document not found');
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    if (bordereau.statut === LOCKED_BORDEREAU_STATUT) {
      throw new BadRequestException('Action impossible: le virement a déjà été exécuté pour ce bordereau.');
    }

    await this.prisma.document.update({
      where: { id: body.documentId },
      data: { bordereauId: body.bordereauId },
    });

    await this.redis.invalidatePrefix(CHEF_EQUIPE_CACHE_PREFIX);
    return { success: true, message: 'Document ajouté au bordereau' };
  }

  private buildAccessFilter(user: any): any {
    const baseFilter = { archived: false };
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'RESPONSABLE_DEPARTEMENT') {
      return baseFilter;
    }
    if (user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR') {
      return { ...baseFilter, contract: { teamLeaderId: user.id } };
    }
    return baseFilter;
  }
}