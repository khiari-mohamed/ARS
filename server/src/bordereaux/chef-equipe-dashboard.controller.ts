import { Controller, Get, Post, Body, Param, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
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
              status: { in: ['RETOUR_ADMIN', 'REJETE'] },
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

        // Get who returned the documents
        let returnedBy: string | null = null;
        if (retournesDocs > 0) {
          const returnedDocs = await this.prisma.document.findMany({
            where: {
              assignedToUserId: gestionnaire.id,
              status: { in: ['RETOUR_ADMIN', 'REJETE'] },
              bordereau: { ...accessFilter, archived: false }
            },
            select: { id: true }
          });

          if (returnedDocs.length > 0) {
            const history = await this.prisma.documentAssignmentHistory.findFirst({
              where: {
                documentId: { in: returnedDocs.map(d => d.id) },
                action: 'RETURNED'
              },
              include: {
                assignedBy: { select: { fullName: true } }
              },
              orderBy: { createdAt: 'desc' }
            });

            returnedBy = history?.assignedBy?.fullName || gestionnaire.fullName;
          }
        }

        return {
          gestionnaire: gestionnaire.fullName,
          totalAssigned: assignedDocs,
          traites: traitesDocs,
          enCours: enCoursDocs,
          retournes: retournesDocs,
          returnedBy,
          documentsByType
        };
      })
    );

    console.log('🔍 [BACKEND] Returning assignments:', assignments.length, 'gestionnaires');
    return assignments;
  }

  @Get('dashboard-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
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
      'UPLOADED': 'Nouveau',
      'SCANNE': 'Scanné',
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async modifyDossierStatus(@Body() body: { dossierId: string; newStatus: string }) {
    const { dossierId, newStatus } = body;
    
    const documentStatusMapping = {
      'Nouveau': 'UPLOADED',
      'En cours': 'EN_COURS',
      'Traité': 'TRAITE',
      'Rejeté': 'REJETE',
      'Retourné': 'RETOUR_ADMIN'
    };

    const mappedStatus = documentStatusMapping[newStatus] || newStatus;

    await this.prisma.document.update({
      where: { id: dossierId },
      data: { status: mappedStatus as any }
    });

    return { success: true };
  }

  @Post('remove-document-from-bordereau')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async removeDocumentFromBordereau(@Body() body: { documentId: string }, @Req() req) {
    const document = await this.prisma.document.findUnique({
      where: { id: body.documentId },
      include: { bordereau: true }
    });

    if (!document || !document.bordereauId) {
      throw new Error('Document not found or not linked to bordereau');
    }

    await this.prisma.document.update({
      where: { id: body.documentId },
      data: { bordereauId: null, assignedToUserId: null }
    });

    return { success: true, message: 'Document retiré du bordereau' };
  }

  @Post('add-document-to-bordereau')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async addDocumentToBordereau(@Body() body: { documentId: string; bordereauId: string }, @Req() req) {
    const [document, bordereau] = await Promise.all([
      this.prisma.document.findUnique({ where: { id: body.documentId } }),
      this.prisma.bordereau.findUnique({ where: { id: body.bordereauId } })
    ]);

    if (!document) throw new Error('Document not found');
    if (!bordereau) throw new Error('Bordereau not found');

    await this.prisma.document.update({
      where: { id: body.documentId },
      data: { bordereauId: body.bordereauId }
    });

    return { success: true, message: 'Document ajouté au bordereau' };
  }

  @Post('upload-document-to-bordereau')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.GESTIONNAIRE_SENIOR, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Type de fichier non supporté'), false);
      }
    }
  }))
  async uploadDocumentToBordereau(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req
  ) {
    const bordereauId = body.bordereauId;
    if (!file) throw new BadRequestException('Aucun fichier uploadé');
    if (!bordereauId) throw new BadRequestException('ID bordereau requis');

    const bordereau = await this.prisma.bordereau.findUnique({ 
      where: { id: bordereauId } 
    });

    if (!bordereau) throw new BadRequestException('Bordereau introuvable');

    const document = await this.prisma.document.create({
      data: {
        name: file.originalname,
        path: file.filename,
        type: 'BULLETIN_SOIN',
        uploadedById: req.user.id,
        bordereauId: bordereauId,
        status: 'UPLOADED'
      }
    });

    return { success: true, message: 'Document uploadé et ajouté', documentId: document.id };
  }

  private buildAccessFilter(user: any): any {
    const baseFilter = { archived: false };
    
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'RESPONSABLE_DEPARTEMENT') {
      return baseFilter;
    }
    
    if (user?.role === 'CHEF_EQUIPE' || user?.role === 'GESTIONNAIRE_SENIOR') {
      return {
        ...baseFilter,
        contract: {
          teamLeaderId: user.id
        }
      };
    }
    
    return baseFilter;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/gestionnaire-senior')
export class GestionnaireSeniorDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard-stats')
  @Roles(UserRole.GESTIONNAIRE_SENIOR)
  async getDashboardStats(@Req() req) {
    const docsByType = await this.prisma.document.groupBy({
      by: ['type'],
      where: {
        bordereau: {
          archived: false,
          contract: { teamLeaderId: req.user.id }
        }
      },
      _count: { id: true }
    });

    const stats = {
      prestation: { total: 0, breakdown: {} },
      adhesion: { total: 0, breakdown: {} },
      complement: { total: 0, breakdown: {} },
      resiliation: { total: 0, breakdown: {} },
      reclamation: { total: 0, breakdown: {} },
      avenant: { total: 0, breakdown: {} }
    };

    const typeMapping = {
      'BULLETIN_SOIN': 'prestation',
      'ADHESION': 'adhesion',
      'COMPLEMENT_INFORMATION': 'complement',
      'DEMANDE_RESILIATION': 'resiliation',
      'RECLAMATION': 'reclamation',
      'CONTRAT_AVENANT': 'avenant'
    };

    docsByType.forEach(group => {
      const category = typeMapping[group.type] || 'prestation';
      stats[category].total = group._count.id;
    });

    return stats;
  }

  @Get('dashboard-dossiers')
  @Roles(UserRole.GESTIONNAIRE_SENIOR)
  async getDashboardDossiers(@Req() req) {
    console.log('\n\n==============================================');
    console.log('🚀🚀🚀 GESTIONNAIRE SENIOR ENDPOINT CALLED 🚀🚀🚀');
    console.log('🔍 User ID:', req.user.id);
    console.log('🔍 User Role:', req.user.role);
    console.log('==============================================\n');
    
    // First get documents (current behavior for backward compatibility)
    const documents = await this.prisma.document.findMany({
      where: {
        bordereau: {
          archived: false,
          contract: { teamLeaderId: req.user.id }
        }
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

    const result: any[] = [];
    
    // Add documents with explicit flags
    documents.forEach(doc => {
      result.push({
        id: doc.id,
        reference: doc.name,
        nom: doc.name,
        societe: doc.bordereau?.client?.name || 'N/A',
        client: doc.bordereau?.client?.name || 'N/A',
        type: this.mapDocType(doc.type),
        statut: this.mapDocStatus(doc.status),
        date: doc.uploadedAt.toISOString().split('T')[0],
        gestionnaire: doc.assignedTo?.fullName || 'Non assigné',
        bordereauReference: doc.bordereau?.reference || 'N/A',
        isDocument: true,  // EXPLICIT FLAG
        isBordereau: false  // EXPLICIT FLAG
      });
    });
    
    console.log('📄 Added', documents.length, 'documents with isDocument=true');
    
    // Now get bordereaux
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: { teamLeaderId: req.user.id }
      },
      include: {
        client: { select: { name: true } },
        documents: {
          include: {
            assignedTo: { select: { fullName: true } }
          }
        }
      },
      orderBy: { dateReception: 'desc' },
      take: 50
    });

    // Add bordereaux with document states
    bordereaux.forEach(b => {
      // Calculate completion and states from documents
      const totalDocs = b.documents.length;
      const traites = b.documents.filter(d => d.status === 'TRAITE').length;
      const enCours = b.documents.filter(d => d.status === 'EN_COURS').length;
      const completion = totalDocs > 0 ? Math.round((traites / totalDocs) * 100) : 0;
      
      // Build state array
      const states: string[] = [];
      if (traites > 0) states.push('Traité');
      if (enCours > 0) states.push('En cours');
      if (totalDocs - traites - enCours > 0) states.push('Nouveau');
      
      result.push({
        id: b.id,
        reference: b.reference,
        nom: `Bordereau ${b.reference}`,
        societe: b.client?.name || 'N/A',
        client: b.client?.name || 'N/A',
        type: 'Prestation',
        statut: this.mapStatus(b.statut),
        date: b.dateReception.toISOString().split('T')[0],
        completionPercentage: completion,
        dossierStates: states.length > 0 ? states : [this.mapStatus(b.statut)],
        priorite: 'Normale',
        isBordereau: true,
        isDocument: false
      });
    });
    
    console.log('\n==============================================');
    console.log('📦 Total Documents:', documents.length);
    console.log('📦 Total Bordereaux:', bordereaux.length);
    console.log('📦 Total Result Items:', result.length);
    console.log('📦 Bordereaux in result:', result.filter(r => r.isBordereau).length);
    console.log('📦 Documents in result:', result.filter(r => r.isDocument).length);
    console.log('==============================================\n');

    return result;
  }

  @Get('corbeille')
  @Roles(UserRole.GESTIONNAIRE_SENIOR)
  async getCorbeille(@Req() req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { stats: { traites: 0, enCours: 0, nonAffectes: 0 }, totalDocuments: 0 };
      }

      // Find clients managed by this senior (chargeCompteId)
      const clients = await this.prisma.client.findMany({
        where: { chargeCompteId: userId },
        select: { id: true, name: true }
      });
      
      const clientIds = clients.map(c => c.id);
      if (!clientIds.length) {
        return { stats: { traites: 0, enCours: 0, nonAffectes: 0 }, totalDocuments: 0 };
      }

      // Get documents for those clients, exclude archived bordereaux
      const docs = await this.prisma.document.findMany({
        where: {
          bordereau: { 
            clientId: { in: clientIds }, 
            archived: false 
          }
        },
        select: { id: true, status: true, assignedToUserId: true }
      });

      const totalDocuments = docs.length;
      const nonAffectes = docs.filter(d => !d.assignedToUserId).length;
      const traites = docs.filter(d => (d.status || '').toUpperCase() === 'TRAITE').length;
      
      // enCours: assigned but not TRAITE
      const enCours = docs.filter(d => {
        const s = (d.status || '').toUpperCase();
        if (s === 'TRAITE') return false;
        if (!d.assignedToUserId) return false;
        return true;
      }).length;

      return {
        stats: { traites, enCours, nonAffectes },
        totalDocuments,
        clients: clients.map(c => c.name || c.id)
      };
    } catch (error) {
      console.error('Error in getCorbeille (gestionnaire-senior):', error);
      return { stats: { traites: 0, enCours: 0, nonAffectes: 0 }, totalDocuments: 0 };
    }
  }

  private mapStatus(status: string): string {
    const mapping = {
      'EN_ATTENTE': 'Nouveau',
      'SCANNE': 'Nouveau',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté'
    };
    return mapping[status] || status;
  }

  private mapDocType(type: string): string {
    const mapping = {
      'BULLETIN_SOIN': 'Prestation',
      'ADHESION': 'Adhésion',
      'COMPLEMENT_INFORMATION': 'Complément',
      'RECLAMATION': 'Réclamation',
      'CONTRAT_AVENANT': 'Avenant',
      'DEMANDE_RESILIATION': 'Résiliation'
    };
    return mapping[type] || type;
  }

  private mapDocStatus(status: string | null): string {
    if (!status) return 'Nouveau';
    const mapping = {
      'UPLOADED': 'Nouveau',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté',
      'RETOUR_ADMIN': 'Retourné'
    };
    return mapping[status] || status;
  }
}