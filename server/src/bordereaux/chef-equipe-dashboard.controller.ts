import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/chef-equipe')
export class ChefEquipeDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('gestionnaire-assignments-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getGestionnaireAssignmentsDossiers(@Req() req) {
    console.log('🔍 [BACKEND] Getting gestionnaire assignments dossiers...');
    const accessFilter = this.buildAccessFilter(req.user);
    
    // Filter gestionnaires based on user role
    let gestionnaireFilter: any = { role: 'GESTIONNAIRE' };
    
    // If user is CHEF_EQUIPE, only show gestionnaires in their team
    if (req.user?.role === 'CHEF_EQUIPE') {
      gestionnaireFilter.teamLeaderId = req.user.id;
    }
    
    const gestionnaires = await this.prisma.user.findMany({
      where: gestionnaireFilter,
      select: {
        id: true,
        fullName: true
      }
    });

    const assignments = await Promise.all(
      gestionnaires.map(async (gestionnaire) => {
        const [assignedDocs, traitesDocs, enCoursDocs, retournesDocs] = await Promise.all([
          this.prisma.document.count({
            where: {
              assignedToUserId: gestionnaire.id,
              bordereau: { ...accessFilter, archived: false }
            }
          }),
          this.prisma.document.count({
            where: {
              assignedToUserId: gestionnaire.id,
              status: 'TRAITE',
              bordereau: { ...accessFilter, archived: false }
            }
          }),
          this.prisma.document.count({
            where: {
              assignedToUserId: gestionnaire.id,
              status: 'EN_COURS',
              bordereau: { ...accessFilter, archived: false }
            }
          }),
          this.prisma.document.count({
            where: {
              assignedToUserId: gestionnaire.id,
              status: 'RETOUR_ADMIN',
              bordereau: { ...accessFilter, archived: false }
            }
          })
        ]);

        const docsByType = await this.prisma.document.groupBy({
          by: ['type'],
          where: {
            assignedToUserId: gestionnaire.id,
            bordereau: { ...accessFilter, archived: false }
          },
          _count: { id: true }
        });

        const documentsByType = {};
        docsByType.forEach(group => {
          documentsByType[group.type] = group._count.id;
        });

        return {
          gestionnaire: gestionnaire.fullName,
          totalAssigned: assignedDocs,
          traites: traitesDocs,
          enCours: enCoursDocs,
          retournes: retournesDocs,
          documentsByType
        };
      })
    );

    console.log('🔍 [BACKEND] Returning assignments:', assignments.length, 'gestionnaires');
    return assignments;
  }

  @Get('dashboard-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDashboardDossiers(@Req() req) {
    console.log('📄 [BACKEND] Getting dashboard dossiers...');
    const accessFilter = this.buildAccessFilter(req.user);
    const documents = await this.prisma.document.findMany({
      where: {
        bordereau: { ...accessFilter, archived: false }
      },
      include: {
        bordereau: {
          include: {
            client: { select: { name: true } }
          }
        },
        assignedTo: { select: { fullName: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100
    });

    const dossiers = documents.map(doc => ({
      id: doc.id,
      reference: doc.name, // Use document name as reference
      nom: doc.name,
      client: doc.bordereau?.client?.name || 'N/A',
      type: this.mapDocumentType(doc.type),
      statut: this.mapDocumentStatus(doc.status || 'EN_COURS'),
      date: doc.uploadedAt.toLocaleDateString('fr-FR'),
      gestionnaire: doc.assignedTo?.fullName || 'Non assigné',
      completionPercentage: this.calculateCompletionPercentage(doc.status),
      dossierStates: this.getDocumentStates(doc.status)
    }));

    console.log('📄 [BACKEND] Returning dossiers:', dossiers.length, 'items');
    return dossiers;
  }

  private mapDocumentType(type: string): string {
    const mapping = {
      'BULLETIN_SOIN': 'Bulletin de soins',
      'COMPLEMENT_INFORMATION': 'Complément d\'information',
      'ADHESION': 'Adhésion',
      'RECLAMATION': 'Réclamation',
      'CONTRAT_AVENANT': 'Contrat/Avenant',
      'DEMANDE_RESILIATION': 'Demande de résiliation',
      'CONVENTION_TIERS_PAYANT': 'Convention tiers payant'
    };
    return mapping[type] || type;
  }

  private mapDocumentStatus(status: string | null): string {
    if (!status) return 'En cours';
    
    const mapping = {
      'UPLOADED': 'Téléchargé',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté',
      'RETOUR_ADMIN': 'Retourné'
    };
    return mapping[status] || status || 'En cours';
  }

  private calculateCompletionPercentage(status: string | null): number {
    if (status === 'TRAITE') return 100;
    if (status === 'EN_COURS') return 60;
    if (status === 'REJETE' || status === 'RETOUR_ADMIN') return 25;
    return 30; // UPLOADED or other statuses
  }

  private getDocumentStates(status: string | null): string[] {
    if (status === 'TRAITE') return ['Traité'];
    if (status === 'EN_COURS') return ['En cours'];
    if (status === 'REJETE' || status === 'RETOUR_ADMIN') return ['Retourné'];
    return ['Nouveau'];
  }

  @Get('dashboard-stats-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDashboardStatsDossiers(@Req() req) {
    console.log('📊 [BACKEND] Getting dashboard stats dossiers...');
    const accessFilter = this.buildAccessFilter(req.user);
    // Get document statistics grouped by type
    const docsByType = await this.prisma.document.groupBy({
      by: ['type'],
      where: {
        bordereau: { ...accessFilter, archived: false }
      },
      _count: { id: true }
    });

    // Get client breakdown and gestionnaire breakdown
    const docsWithDetails = await this.prisma.document.findMany({
      where: {
        bordereau: { ...accessFilter, archived: false }
      },
      include: {
        bordereau: {
          include: {
            client: { select: { name: true } }
          }
        },
        assignedTo: { select: { fullName: true } }
      }
    });

    const stats = {
      prestation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      adhesion: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      complement: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      resiliation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      reclamation: { total: 0, breakdown: {}, gestionnaireBreakdown: {} },
      avenant: { total: 0, breakdown: {}, gestionnaireBreakdown: {} }
    };

    // Map document types to stats categories
    const typeMapping = {
      'BULLETIN_SOIN': 'prestation',
      'ADHESION': 'adhesion',
      'COMPLEMENT_INFORMATION': 'complement',
      'DEMANDE_RESILIATION': 'resiliation',
      'RECLAMATION': 'reclamation',
      'CONTRAT_AVENANT': 'avenant',
      'CONVENTION_TIERS_PAYANT': 'avenant'
    };

    // Count by type
    docsByType.forEach(group => {
      const category = typeMapping[group.type] || 'prestation';
      stats[category].total = group._count.id;
    });

    // Add client and gestionnaire breakdown
    docsWithDetails.forEach(doc => {
      const category = typeMapping[doc.type] || 'prestation';
      const clientName = doc.bordereau?.client?.name || 'Inconnu';
      const gestionnaireName = doc.assignedTo?.fullName || 'Non assigné';
      
      // Client breakdown
      if (!stats[category].breakdown[clientName]) {
        stats[category].breakdown[clientName] = 0;
      }
      stats[category].breakdown[clientName]++;
      
      // Gestionnaire breakdown
      if (!stats[category].gestionnaireBreakdown[gestionnaireName]) {
        stats[category].gestionnaireBreakdown[gestionnaireName] = 0;
      }
      stats[category].gestionnaireBreakdown[gestionnaireName]++;
    });

    console.log('📊 [BACKEND] Returning stats:', stats);
    return stats;
  }

  @Get('dossier-pdf/:dossierId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDossierPDF(@Param('dossierId') dossierId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: dossierId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return {
      pdfUrl: document.path ? `/uploads/${document.path}` : null
    };
  }

  @Post('modify-dossier-status')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async modifyDossierStatus(@Body() body: { dossierId: string; newStatus: string }) {
    const { dossierId, newStatus } = body;
    
    const statusMapping = {
      'En cours': 'EN_COURS',
      'Traité': 'TRAITE',
      'Retourné': 'RETOUR_ADMIN'
    };

    const mappedStatus = statusMapping[newStatus] || newStatus;

    await this.prisma.document.update({
      where: { id: dossierId },
      data: { status: mappedStatus as any }
    });

    return { success: true };
  }

  private buildAccessFilter(user: any): any {
    if (user?.role === 'SUPER_ADMIN') {
      return {};
    }
    
    if (user?.role === 'CHEF_EQUIPE') {
      return {
        contract: {
          teamLeaderId: user.id
        }
      };
    }
    
    return {};
  }
}