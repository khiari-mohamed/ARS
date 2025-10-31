import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

@Controller('bordereaux/chef-equipe/tableau-bord')
export class ChefEquipeTableauBordController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getTableauBordStats(@Req() req: any) {
    const accessFilter = this.buildAccessFilter(req.user);
    const [totalDossiers, clotures, enCours, nonAffectes] = await Promise.all([
      this.prisma.bordereau.count({ where: { ...accessFilter, archived: false } }),
      this.prisma.bordereau.count({ where: { ...accessFilter, statut: 'TRAITE', archived: false } }),
      this.prisma.bordereau.count({ where: { ...accessFilter, statut: { in: ['EN_COURS', 'ASSIGNE'] }, archived: false } }),
      this.prisma.bordereau.count({ where: { ...accessFilter, statut: { in: ['A_SCANNER', 'SCANNE', 'A_AFFECTER'] }, archived: false } })
    ]);

    return {
      totalDossiers,
      clotures,
      enCours,
      nonAffectes,
      progressBars: {
        clotures: totalDossiers > 0 ? Math.round((clotures / totalDossiers) * 100) : 0,
        enCours: totalDossiers > 0 ? Math.round((enCours / totalDossiers) * 100) : 0,
        nonAffectes: totalDossiers > 0 ? Math.round((nonAffectes / totalDossiers) * 100) : 0
      }
    };
  }

  @Get('types-detail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getTypesDetail(@Req() req: any) {
    const accessFilter = this.buildAccessFilter(req.user);
    
    let documentFilter: any = {
      bordereau: { ...accessFilter, archived: false }
    };
    
    // For gestionnaires, only show their assigned documents
    if (req.user?.role === 'GESTIONNAIRE') {
      documentFilter = {
        assignedToUserId: req.user.id,
        bordereau: { archived: false }
      };
    }
    
    const documents = await this.prisma.document.findMany({
      where: documentFilter,
      include: { 
        bordereau: { include: { client: true } },
        assignedTo: { select: { fullName: true } }
      }
    });

    const typeMapping = {
      'BULLETIN_SOIN': 'Prestation',
      'ADHESION': 'Adhésion', 
      'COMPLEMENT_INFORMATION': 'Complément Dossier',
      'CONTRAT_AVENANT': 'Avenant',
      'RECLAMATION': 'Réclamation'
    };

    const types = {};
    Object.values(typeMapping).forEach(type => {
      types[type] = { 
        total: 0, 
        clotures: 0, 
        enCours: 0, 
        nonAffectes: 0,
        clientBreakdown: {},
        gestionnaireBreakdown: {}
      };
    });

    documents.forEach(doc => {
      if (!doc.bordereau) return;
      const typeName = typeMapping[doc.type] || 'Prestation';
      const clientName = doc.bordereau.client?.name || 'Unknown';
      const gestionnaireName = doc.assignedTo?.fullName || 'Non assigné';
      
      types[typeName].total++;
      
      // Client breakdown
      if (!types[typeName].clientBreakdown[clientName]) {
        types[typeName].clientBreakdown[clientName] = 0;
      }
      types[typeName].clientBreakdown[clientName]++;
      
      // Gestionnaire breakdown
      if (!types[typeName].gestionnaireBreakdown[gestionnaireName]) {
        types[typeName].gestionnaireBreakdown[gestionnaireName] = 0;
      }
      types[typeName].gestionnaireBreakdown[gestionnaireName]++;
      
      if (doc.bordereau.statut === 'TRAITE') {
        types[typeName].clotures++;
      } else if (['EN_COURS', 'ASSIGNE'].includes(doc.bordereau.statut)) {
        types[typeName].enCours++;
      } else if (['A_SCANNER', 'SCANNE', 'A_AFFECTER'].includes(doc.bordereau.statut)) {
        types[typeName].nonAffectes++;
      }
    });

    return types;
  }

  @Get('derniers-dossiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDerniersDossiers(@Req() req: any) {
    const accessFilter = this.buildAccessFilter(req.user);
    
    // For gestionnaires, get ALL bordereaux from their chef d'équipe
    let bordereaux;
    if (req.user?.role === 'GESTIONNAIRE') {
      // Get gestionnaire's team leader
      const gestionnaire = await this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { teamLeaderId: true }
      });
      
      if (gestionnaire?.teamLeaderId) {
        // Get ALL bordereaux managed by their chef d'équipe
        bordereaux = await this.prisma.bordereau.findMany({
          where: { 
            archived: false,
            contract: {
              teamLeaderId: gestionnaire.teamLeaderId
            }
          },
          include: {
            client: { select: { id: true, name: true } },
            contract: { 
              select: { 
                id: true, 
                clientName: true,
                client: { select: { id: true, name: true } }
              } 
            },
            documents: {
              include: { assignedTo: { select: { id: true, fullName: true } } }
            },
            currentHandler: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        // Fallback: if no team leader, show only bordereaux with assigned documents
        bordereaux = await this.prisma.bordereau.findMany({
          where: { 
            archived: false,
            documents: {
              some: {
                assignedToUserId: req.user.id
              }
            }
          },
          include: {
            client: { select: { id: true, name: true } },
            contract: { 
              select: { 
                id: true, 
                clientName: true,
                client: { select: { id: true, name: true } }
              } 
            },
            documents: {
              include: { assignedTo: { select: { id: true, fullName: true } } }
            },
            currentHandler: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else {
      bordereaux = await this.prisma.bordereau.findMany({
        where: { ...accessFilter, archived: false },
        include: {
          client: { select: { id: true, name: true } },
          contract: { 
            select: { 
              id: true, 
              clientName: true,
              client: { select: { id: true, name: true } }
            } 
          },
          documents: {
            include: { assignedTo: { select: { id: true, fullName: true } } }
          },
          currentHandler: { select: { id: true, fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return bordereaux.map(bordereau => {
      const totalDocuments = bordereau.documents.length;
      const traitedDocuments = bordereau.documents.filter(doc => doc.status === 'TRAITE').length;
      const enCoursDocuments = bordereau.documents.filter(doc => doc.status === 'EN_COURS').length;
      const scanneDocuments = bordereau.documents.filter(doc => doc.status === 'SCANNE').length;
      const uploadedDocuments = bordereau.documents.filter(doc => doc.status === 'UPLOADED' || !doc.status).length;
      
      // Calculate completion percentage: only TRAITE counts, all others = 0%
      // TRAITE = 100%, all other statuses = 0%
      const completionPercentage = totalDocuments > 0 ? Math.round((traitedDocuments / totalDocuments) * 100) : 0;
      
      // Get document types (show document types like "Bulletin de Soin", "Adhésion", etc.)
      const documentTypes = [...new Set(bordereau.documents.map(doc => this.getDocumentTypeLabel(doc.type)))].join(', ');
      
      // Get document states with counts
      const states: string[] = [];
      if (traitedDocuments > 0) states.push(`Traité ${traitedDocuments}/${totalDocuments}`);
      if (enCoursDocuments > 0) states.push(`En cours ${enCoursDocuments}/${totalDocuments}`);
      if (scanneDocuments > 0) states.push(`Scanné ${scanneDocuments}/${totalDocuments}`);
      if (uploadedDocuments > 0) states.push(`Nouveau ${uploadedDocuments}/${totalDocuments}`);
      
      // For gestionnaires, show their name if they have documents in this bordereau
      let gestionnaireDisplay = bordereau.currentHandler?.fullName || 'Non assigné';
      if (req.user?.role === 'GESTIONNAIRE' && bordereau.documents.length > 0) {
        const assignedDoc = bordereau.documents.find(doc => doc.assignedTo?.id === req.user.id);
        if (assignedDoc) {
          gestionnaireDisplay = assignedDoc.assignedTo.fullName;
        }
      }
      
      return {
        id: bordereau.id,
        reference: bordereau.reference, // Use actual bordereau reference
        client: bordereau.contract?.client?.name || bordereau.client?.name || 'N/A',
        type: documentTypes || 'Aucun document', // Show document types
        statut: this.getStatutLabel(bordereau.statut),
        gestionnaire: gestionnaireDisplay,
        date: bordereau.dateReception.toLocaleDateString('fr-FR'),
        completionPercentage,
        dossierStates: states.length > 0 ? states : ['Nouveau']
      };
    });
  }

  @Get('dossiers-en-cours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDossiersEnCours(@Req() req: any, @Query('type') typeFilter?: string, @Query('statut') statutFilter?: string) {
    const accessFilter = this.buildAccessFilter(req.user);
    
    // Map status filter to database statuses
    const getStatutMapping = (statut?: string) => {
      if (!statut || statut === 'Tous') return ['EN_COURS', 'ASSIGNE', 'SCAN_EN_COURS', 'A_AFFECTER', 'SCANNE', 'A_SCANNER'];
      switch (statut) {
        case 'Nouveau': return ['EN_ATTENTE', 'UPLOADED', 'A_SCANNER'];
        case 'En cours': return ['EN_COURS', 'ASSIGNE', 'SCAN_EN_COURS', 'A_AFFECTER', 'SCANNE'];
        case 'Traité': return ['TRAITE'];
        case 'Retourné': return ['REJETE', 'RETOUR_ADMIN'];
        default: return ['EN_COURS', 'ASSIGNE', 'SCAN_EN_COURS', 'A_AFFECTER', 'SCANNE'];
      }
    };
    
    const statutValues = getStatutMapping(statutFilter);
    let bordereaux;
    
    // For gestionnaires, only get bordereaux where they have assigned documents
    if (req.user?.role === 'GESTIONNAIRE') {
      const typeMapping = {
        'Prestation': 'BULLETIN_SOIN',
        'Adhésion': 'ADHESION',
        'Complément Dossier': 'COMPLEMENT_INFORMATION',
        'Avenant': 'CONTRAT_AVENANT',
        'Réclamation': 'RECLAMATION'
      };
      
      const where: any = {
        archived: false,
        statut: { in: statutValues },
        documents: {
          some: {
            assignedToUserId: req.user.id,
            ...(typeFilter && typeFilter !== 'Tous types' ? { type: typeMapping[typeFilter] } : {})
          }
        }
      };
      
      bordereaux = await this.prisma.bordereau.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          contract: { 
            select: { 
              id: true, 
              clientName: true,
              client: { select: { id: true, name: true } }
            } 
          },
          documents: {
            where: { assignedToUserId: req.user.id },
            include: { assignedTo: { select: { id: true, fullName: true } } }
          },
          currentHandler: { select: { id: true, fullName: true } }
        },
        orderBy: { dateReception: 'asc' },
        take: 5
      });
    } else {
      const where: any = {
        ...accessFilter,
        statut: { in: statutValues },
        archived: false
      };

      // If type filter is applied, filter by document types within bordereaux
      if (typeFilter && typeFilter !== 'Tous types') {
        const typeMapping = {
          'Prestation': 'BULLETIN_SOIN',
          'Adhésion': 'ADHESION',
          'Complément Dossier': 'COMPLEMENT_INFORMATION',
          'Avenant': 'CONTRAT_AVENANT',
          'Réclamation': 'RECLAMATION'
        };
        
        bordereaux = await this.prisma.bordereau.findMany({
          where: {
            ...where,
            documents: {
              some: { type: typeMapping[typeFilter] }
            }
          },
          include: {
            client: { select: { id: true, name: true } },
            contract: { 
              select: { 
                id: true, 
                clientName: true,
                client: { select: { id: true, name: true } }
              } 
            },
            documents: {
              include: { assignedTo: { select: { id: true, fullName: true } } }
            },
            currentHandler: { select: { id: true, fullName: true } }
          },
          orderBy: { dateReception: 'asc' }
        });
      } else {
        bordereaux = await this.prisma.bordereau.findMany({
          where,
          include: {
            client: { select: { id: true, name: true } },
            contract: { 
              select: { 
                id: true, 
                clientName: true,
                client: { select: { id: true, name: true } }
              } 
            },
            documents: {
              include: { assignedTo: { select: { id: true, fullName: true } } }
            },
            currentHandler: { select: { id: true, fullName: true } }
          },
          orderBy: { dateReception: 'asc' }
        });
      }
    }

    return bordereaux.map(bordereau => {
      const joursEnCours = Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate completion percentage: only TRAITE counts, all others = 0%
      const totalDocuments = bordereau.documents.length;
      const traitedDocuments = bordereau.documents.filter(doc => doc.status === 'TRAITE').length;
      const enCoursDocuments = bordereau.documents.filter(doc => doc.status === 'EN_COURS').length;
      const scanneDocuments = bordereau.documents.filter(doc => doc.status === 'SCANNE').length;
      const uploadedDocuments = bordereau.documents.filter(doc => doc.status === 'UPLOADED' || !doc.status).length;
      
      const completionPercentage = totalDocuments > 0 ? Math.round((traitedDocuments / totalDocuments) * 100) : 0;
      
      // Get document types (show document types like "Prestation", "Adhésion", etc.)
      const documentTypes = [...new Set(bordereau.documents.map(doc => this.getDocumentTypeLabel(doc.type)))].join(', ');
      
      // Get document states with counts
      const states: string[] = [];
      if (traitedDocuments > 0) states.push(`Traité ${traitedDocuments}/${totalDocuments}`);
      if (enCoursDocuments > 0) states.push(`En cours ${enCoursDocuments}/${totalDocuments}`);
      if (scanneDocuments > 0) states.push(`Scanné ${scanneDocuments}/${totalDocuments}`);
      if (uploadedDocuments > 0) states.push(`Nouveau ${uploadedDocuments}/${totalDocuments}`);
      
      return {
        id: bordereau.id,
        reference: bordereau.reference, // Use actual bordereau reference
        client: bordereau.contract?.client?.name || bordereau.client?.name || 'N/A',
        type: documentTypes || 'Prestation', // Show document types instead of filenames
        statut: this.getStatutLabel(bordereau.statut),
        joursEnCours,
        priorite: this.calculatePriorite(bordereau),
        gestionnaire: bordereau.currentHandler?.fullName || 'Non assigné',
        completionPercentage,
        dossierStates: states.length > 0 ? states : ['Nouveau']
      };
    });
  }

  @Get('search')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async searchDossiers(@Query('type') searchType: string, @Query('query') query: string) {
    if (!query) return [];

    const where: any = { 
      bordereau: { archived: false }
    };
    
    switch (searchType) {
      case 'Ref. GSD':
        where.id = { contains: query, mode: 'insensitive' };
        break;
      case 'Client':
        where.bordereau = { 
          ...where.bordereau,
          client: { name: { contains: query, mode: 'insensitive' } }
        };
        break;
      case 'Type':
        where.type = { contains: query.toUpperCase(), mode: 'insensitive' };
        break;
      case 'Gestionnaire':
        where.assignedTo = { fullName: { contains: query, mode: 'insensitive' } };
        break;
      default:
        where.id = { contains: query, mode: 'insensitive' };
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      },
      take: 20
    });

    return documents.map(doc => ({
      id: doc.bordereau?.id || doc.id,
      reference: doc.bordereau?.reference || doc.id,
      client: doc.bordereau?.client?.name || 'N/A',
      type: doc.name || this.getDocumentTypeLabel(doc.type),
      statut: this.getDocumentStatusLabel(doc.status || undefined),
      gestionnaire: doc.assignedTo?.fullName || 'Non assigné',
      date: this.getRelativeTime(doc.uploadedAt),
      joursEnCours: Math.floor((new Date().getTime() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculateDocumentPriorite(doc)
    }));
  }

  @Post('change-document-type')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async changeDocumentType(@Body() body: { dossierId: string; newType: string }, @Req() req: any) {
    // Check if gestionnaire can modify this dossier
    if (req.user?.role === UserRole.GESTIONNAIRE) {
      const document = await this.prisma.document.findUnique({
        where: { id: body.dossierId }
      });
      
      if (!document || document.assignedToUserId !== req.user.id) {
        throw new Error('Accès refusé: Ce dossier ne vous est pas assigné');
      }
    }
    
    const typeMapping = {
      'Prestation': 'BULLETIN_SOIN',
      'Adhésion': 'ADHESION',
      'Complément Dossier': 'COMPLEMENT_INFORMATION',
      'Avenant': 'CONTRAT_AVENANT',
      'Réclamation': 'RECLAMATION'
    };

    const document = await this.prisma.document.findUnique({
      where: { id: body.dossierId }
    });

    if (!document) {
      throw new Error('Dossier non trouvé');
    }

    // Update document type
    await this.prisma.document.update({
      where: { id: body.dossierId },
      data: { type: typeMapping[body.newType] as any }
    });

    // Log the change
    await this.prisma.documentAssignmentHistory.create({
      data: {
        documentId: body.dossierId,
        assignedByUserId: req.user?.id,
        action: 'TYPE_CHANGED',
        reason: `Type changé vers: ${body.newType}`
      }
    });

    return { success: true, message: 'Type de dossier modifié avec succès' };
  }

  @Post('return-to-scan')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async returnToScan(@Body() body: { dossierId: string; reason: string }, @Req() req: any) {
    // First try to find as bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: body.dossierId },
      include: { documents: true }
    });

    if (bordereau) {
      // Set documentStatus to RETOURNER_AU_SCAN instead of changing statut
      await this.prisma.bordereau.update({
        where: { id: body.dossierId },
        data: { 
          documentStatus: 'RETOURNER_AU_SCAN',
          currentHandlerId: null
        }
      });

      // Update all documents in the bordereau
      await this.prisma.document.updateMany({
        where: { bordereauId: body.dossierId },
        data: { 
          status: 'REJETE',
          assignedToUserId: null
        }
      });

      // Log the return for each document (only if user ID exists)
      if (req.user?.id) {
        for (const doc of bordereau.documents) {
          try {
            await this.prisma.documentAssignmentHistory.create({
              data: {
                documentId: doc.id,
                assignedByUserId: req.user.id,
                action: 'RETURNED',
                reason: body.reason
              }
            });
          } catch (error) {
            console.log(`Failed to create history for document ${doc.id}:`, error.message);
          }
        }
      }
    } else {
      // Try as document
      const document = await this.prisma.document.findUnique({
        where: { id: body.dossierId }
      });
      
      if (!document) {
        throw new Error('Dossier non trouvé');
      }

      // Check if gestionnaire can modify this document
      if (req.user?.role === UserRole.GESTIONNAIRE && document.assignedToUserId !== req.user.id) {
        throw new Error('Accès refusé: Ce dossier ne vous est pas assigné');
      }
      
      await this.prisma.document.update({
        where: { id: body.dossierId },
        data: { 
          status: 'REJETE',
          assignedToUserId: null
        }
      });

      // Log the return (only if user ID exists)
      if (req.user?.id) {
        try {
          await this.prisma.documentAssignmentHistory.create({
            data: {
              documentId: body.dossierId,
              assignedByUserId: req.user.id,
              action: 'RETURNED',
              reason: body.reason
            }
          });
        } catch (error) {
          console.log(`Failed to create history for document ${body.dossierId}:`, error.message);
        }
      }
    }

    // Notify SCAN team
    const scanUsers = await this.prisma.user.findMany({
      where: { role: 'SCAN_TEAM', active: true }
    });

    for (const user of scanUsers) {
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'DOSSIER_RETURNED_TO_SCAN',
          title: 'Dossier retourné pour re-scan',
          message: `Dossier retourné par le chef d'équipe: ${body.reason}`,
          data: { dossierId: body.dossierId, reason: body.reason }
        }
      });
    }

    return { success: true };
  }

  @Get('dossier/:id')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDossierDetail(@Param('id') id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      }
    });

    if (!document) {
      throw new Error('Dossier non trouvé');
    }

    return {
      id: document.bordereau?.id || document.id,
      reference: document.bordereau?.reference || document.id,
      client: document.bordereau?.client?.name || 'N/A',
      dateReception: document.uploadedAt,
      statut: this.getDocumentStatusLabel(document.status || undefined),
      gestionnaire: document.assignedTo?.fullName || 'Non assigné',
      documents: [{
        id: document.id,
        type: this.getDocumentTypeLabel(document.type),
        fileName: document.name,
        filePath: document.path
      }],
      delaiReglement: 30,
      joursEnCours: Math.floor((new Date().getTime() - new Date(document.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculateDocumentPriorite(document)
    };
  }

  @Get('download/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async downloadDossier(@Param('bordereauId') bordereauId: string, @Res() res: Response) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { documents: true, client: true, currentHandler: true }
    });

    if (!bordereau) {
      throw new Error('Dossier non trouvé');
    }

    // Log the download action
    await this.prisma.actionLog.create({
      data: {
        bordereauId: bordereau.id,
        action: 'DOSSIER_DOWNLOADED',
        details: `Dossier téléchargé - ${bordereau.documents.length} documents`,
        timestamp: new Date()
      }
    });

    // Create ZIP file
    const archive = archiver('zip', { zlib: { level: 9 } });
    const fileName = `Dossier_${bordereau.reference}_${new Date().toISOString().split('T')[0]}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    archive.pipe(res);

    // Add bordereau summary as JSON
    const summary = {
      reference: bordereau.reference,
      client: bordereau.client?.name || 'N/A',
      dateReception: bordereau.dateReception,
      statut: this.getStatutLabel(bordereau.statut),
      gestionnaire: bordereau.currentHandler?.fullName || 'Non assigné',
      delaiReglement: bordereau.delaiReglement,
      joursEnCours: Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculatePriorite(bordereau),
      documents: bordereau.documents.map(doc => ({
        fileName: doc.name,
        type: this.getDocumentTypeLabel(doc.type),
        uploadedAt: doc.uploadedAt
      })),
      downloadedAt: new Date().toISOString(),
      downloadedBy: 'Chef d\'equipe'
    };
    
    archive.append(JSON.stringify(summary, null, 2), { name: 'dossier-summary.json' });

    // Add documents if they exist and are accessible
    for (const doc of bordereau.documents) {
      try {
        if (doc.path && doc.path !== `/placeholder/${bordereau.reference}`) {
          // Try to add real file if it exists
          const filePath = path.join(process.cwd(), 'uploads', doc.path);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: `documents/${doc.name}` });
          } else {
            // Add placeholder text file
            archive.append(`Document: ${doc.name}\nType: ${this.getDocumentTypeLabel(doc.type)}\nStatus: Fichier non disponible sur le serveur`, 
              { name: `documents/${doc.name}.txt` });
          }
        } else {
          // Add placeholder for documents without files
          archive.append(`Document: ${doc.name}\nType: ${this.getDocumentTypeLabel(doc.type)}\nStatus: Document de type placeholder`, 
            { name: `documents/${doc.name}.txt` });
        }
      } catch (error) {
        console.error(`Error adding document ${doc.name}:`, error);
        archive.append(`Erreur lors de l'ajout du document: ${doc.name}`, 
          { name: `documents/ERROR_${doc.name}.txt` });
      }
    }

    // If no documents, add info file
    if (bordereau.documents.length === 0) {
      archive.append('Aucun document attaché à ce bordereau.', { name: 'aucun-document.txt' });
    }

    archive.finalize();
  }

  private getDocumentTypeLabel(type?: string): string {
    const mapping: Record<string, string> = {
      'BULLETIN_SOIN': 'Prestation',
      'ADHESION': 'Adhésion',
      'COMPLEMENT_INFORMATION': 'Complément Dossier',
      'CONTRAT_AVENANT': 'Avenant',
      'RECLAMATION': 'Réclamation'
    };
    return mapping[type || ''] || 'Prestation';
  }

  private getStatutLabel(statut: string): string {
    const mapping = {
      'A_SCANNER': 'À scanner',
      'SCAN_EN_COURS': 'En cours de Scan',
      'SCANNE': 'Scan Finalisé',
      'EN_COURS': 'En cours de traitement',
      'TRAITE': 'Traité',
      'CLOTURE': 'Réglé'
    };
    return mapping[statut] || statut;
  }

  private calculatePriorite(bordereau: any): string {
    const joursEnCours = Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
    const delai = bordereau.delaiReglement || 30;
    
    if (joursEnCours > delai) return 'Très';
    if (joursEnCours > delai * 0.8) return 'Moyenne';
    return 'Normale';
  }

  @Post('modify-dossier-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async modifyDossierStatus(@Body() body: { dossierId: string; newStatus: string }, @Req() req: any) {
    const documentStatusMapping = {
      'Nouveau': 'UPLOADED',
      'En cours': 'EN_COURS',
      'Traité': 'TRAITE',
      'Rejeté': 'REJETE',
      'Retourné': 'RETOUR_ADMIN'
    };

    const bordereauxStatusMapping = {
      'Nouveau': 'EN_ATTENTE',
      'En cours': 'EN_COURS',
      'Traité': 'TRAITE'
    };

    // First try to find as document
    const document = await this.prisma.document.findUnique({
      where: { id: body.dossierId },
      include: { assignedTo: true, bordereau: { include: { client: true } } }
    });

    if (document) {
      // Check if gestionnaire can modify this document
      if (req.user?.role === 'GESTIONNAIRE') {
        if (document.assignedToUserId !== req.user.id) {
          return { success: false, message: 'Accès refusé: Ce document ne vous est pas assigné' };
        }
        
        // Check if gestionnaire already modified status once
        if (document.statusModifiedByGestionnaire) {
          return { success: false, message: 'Vous avez déjà modifié le statut de ce dossier une fois. Vous ne pouvez pas le modifier à nouveau.' };
        }
      }
      
      // Update document status and set flag if gestionnaire
      const updateData: any = { status: documentStatusMapping[body.newStatus] as any };
      if (req.user?.role === 'GESTIONNAIRE') {
        updateData.statusModifiedByGestionnaire = true;
      }
      
      await this.prisma.document.update({
        where: { id: body.dossierId },
        data: updateData
      });

      // If gestionnaire returns a document, create history and notify chef d'équipe
      if (req.user?.role === 'GESTIONNAIRE' && body.newStatus === 'Retourné') {
        // Create assignment history
        if (req.user?.id) {
          await this.prisma.documentAssignmentHistory.create({
            data: {
              documentId: body.dossierId,
              assignedByUserId: req.user.id,
              action: 'RETURNED',
              reason: `Retourné par ${req.user.fullName || 'Gestionnaire'}`
            }
          });
        }

        // Notify chef d'équipe
        const gestionnaire = await this.prisma.user.findUnique({
          where: { id: req.user.id },
          select: { teamLeaderId: true, fullName: true }
        });

        if (gestionnaire?.teamLeaderId) {
          await this.prisma.notification.create({
            data: {
              userId: gestionnaire.teamLeaderId,
              type: 'DOCUMENT_RETURNED',
              title: 'Document retourné par gestionnaire',
              message: `${gestionnaire.fullName} a retourné le document ${document.name} (${document.bordereau?.client?.name || 'N/A'})`,
              data: { 
                documentId: body.dossierId, 
                gestionnaireName: gestionnaire.fullName,
                documentName: document.name,
                clientName: document.bordereau?.client?.name
              }
            }
          });
        }
      }

      return { success: true, message: 'Statut modifié avec succès' };
    }

    // If not found as document, try as bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: body.dossierId }
    });

    if (bordereau) {
      // Gestionnaires cannot modify bordereau status directly
      if (req.user?.role === 'GESTIONNAIRE') {
        return { success: false, message: 'Accès refusé: Les gestionnaires ne peuvent modifier que les documents individuels' };
      }
      
      // Update bordereau status
      await this.prisma.bordereau.update({
        where: { id: body.dossierId },
        data: { statut: bordereauxStatusMapping[body.newStatus] as any }
      });
      return { success: true, message: 'Statut modifié avec succès' };
    }

    return { success: false, message: 'Document ou bordereau non trouvé' };
  }

  @Get('dossier-pdf/:dossierId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDossierPDF(@Param('dossierId') dossierId: string, @Req() req: any) {
    console.log(`🔍 Looking for document ID: ${dossierId}`);
    
    const document = await this.prisma.document.findUnique({
      where: { id: dossierId },
      include: {
        bordereau: { include: { client: true } }
      }
    });

    if (!document) {
      console.log(`❌ Document not found: ${dossierId}`);
      return { 
        success: false, 
        error: 'Document non trouvé',
        hasDocument: false
      };
    }
    
    console.log(`✅ Found document: ${document.name}, path: ${document.path}`);

    // Check if document has a valid file path
    if (!document.path || document.path.includes('placeholder')) {
      return { 
        success: false, 
        error: 'PDF non disponible pour ce dossier',
        hasDocument: false
      };
    }

    // Clean the path to remove leading slash and construct proper URL
    const cleanPath = document.path.startsWith('/') ? document.path.substring(1) : document.path;
    const pdfUrl = `/api/bordereaux/chef-equipe/tableau-bord/serve-pdf/${cleanPath}`;

    // Return PDF URL or path for viewing
    console.log(`📄 Returning PDF URL: ${pdfUrl}`);
    return {
      success: true,
      pdfUrl: pdfUrl,
      hasDocument: true,
      documentInfo: {
        name: document.name,
        type: this.getDocumentTypeLabel(document.type),
        uploadedAt: document.uploadedAt
      }
    };
  }

  @Get('test-static')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async testStatic() {
    return {
      message: 'Static file test',
      testUrl: '/uploads/test-avenant-005.pdf',
      timestamp: new Date().toISOString()
    };
  }

  @Get('serve-pdf/*')
  async servePDF(@Req() req: any, @Res() res: Response) {
    try {
      // Extract the file path from the URL
      let fullPath = req.params[0];
      if (!fullPath) {
        const urlParts = req.url.split('/serve-pdf/');
        fullPath = urlParts.length > 1 ? urlParts[1] : null;
      }
      
      if (!fullPath) {
        console.log('❌ No file path provided');
        return res.status(400).json({ error: 'Invalid file path' });
      }
      
      console.log(`📄 Attempting to serve file from path: ${fullPath}`);
      
      const filename = path.basename(fullPath);
      console.log(`📄 Extracted filename: ${filename}`);
      
      const foundPath = await this.findFileInUploads(filename);
      
      if (foundPath) {
        console.log(`✅ Found file at: ${foundPath}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');
        return res.sendFile(foundPath);
      } else {
        console.log(`❌ File not found: ${filename}`);
        return res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('❌ Error in servePDF:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async findFileInUploads(filename: string): Promise<string | null> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    const searchInDirectory = (dir: string): string | null => {
      if (!fs.existsSync(dir)) return null;
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isFile() && (item.name === filename || item.name.endsWith('_' + filename))) {
            return path.join(dir, item.name);
          }
        }
        
        for (const item of items) {
          if (item.isDirectory()) {
            const found = searchInDirectory(path.join(dir, item.name));
            if (found) return found;
          }
        }
      } catch (error) {
        console.log(`Error reading directory ${dir}:`, error.message);
      }
      
      return null;
    };
    
    return searchInDirectory(uploadsDir);
  }

  @Get('download-info/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDownloadInfo(@Param('bordereauId') bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { documents: true, client: true }
    });

    if (!bordereau) {
      throw new Error('Dossier non trouvé');
    }

    return {
      success: true,
      bordereauId: bordereau.id,
      reference: bordereau.reference,
      client: bordereau.client?.name || 'N/A',
      documents: bordereau.documents.map(doc => ({
        id: doc.id,
        fileName: doc.name,
        filePath: doc.path,
        type: this.getDocumentTypeLabel(doc.type)
      })),
      summary: {
        totalDocuments: bordereau.documents.length,
        estimatedSize: `${Math.max(1, bordereau.documents.length * 0.5)} MB`,
        createdAt: new Date().toISOString()
      }
    };
  }

  @Get('documents-individuels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getDocumentsIndividuels(@Req() req: any) {
    const accessFilter = this.buildAccessFilter(req.user);
    
    let documents;
    
    // For gestionnaires, show ALL documents from their chef d'équipe's bordereaux
    if (req.user?.role === 'GESTIONNAIRE') {
      // Get gestionnaire's team leader
      const gestionnaire = await this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { teamLeaderId: true }
      });
      
      if (gestionnaire?.teamLeaderId) {
        // Get ALL documents from bordereaux managed by their chef d'équipe
        documents = await this.prisma.document.findMany({
          where: {
            bordereau: {
              archived: false,
              contract: {
                teamLeaderId: gestionnaire.teamLeaderId
              }
            }
          },
          include: {
            bordereau: { include: { client: true } },
            assignedTo: true
          },
          orderBy: { uploadedAt: 'desc' }
        });
      } else {
        // Fallback: if no team leader, show only assigned documents
        documents = await this.prisma.document.findMany({
          where: {
            assignedToUserId: req.user.id,
            bordereau: { archived: false }
          },
          include: {
            bordereau: { include: { client: true } },
            assignedTo: true
          },
          orderBy: { uploadedAt: 'desc' }
        });
      }
    } else {
      // For other roles, show all documents based on access filter
      documents = await this.prisma.document.findMany({
        where: {
          bordereau: { ...accessFilter, archived: false }
        },
        include: {
          bordereau: { include: { client: true } },
          assignedTo: true
        },
        orderBy: { uploadedAt: 'desc' }
      });
    }

    return documents.map(doc => {
      // If document is assigned to a gestionnaire and status is SCANNE, show as En cours
      let displayStatus = this.getDocumentStatusLabel(doc.status || undefined);
      if (doc.assignedToUserId && doc.status === 'SCANNE') {
        displayStatus = 'En cours';
      }
      
      return {
        id: doc.id,
        reference: doc.name, // Show document name (like BS-5766831.pdf)
        bordereauReference: doc.bordereau?.reference || 'N/A', // Add bordereau reference
        client: doc.bordereau?.client?.name || 'N/A',
        type: this.getDocumentTypeLabel(doc.type), // Show actual document type
        statut: displayStatus,
        gestionnaire: doc.assignedTo?.fullName || 'Non assigné',
        date: this.getRelativeTime(doc.uploadedAt),
        completionPercentage: this.calculateDocumentCompletion(doc),
        dossierStates: this.getDocumentStates(doc)
      };
    });
  }

  @Get('gestionnaire-assignments-dossiers')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async getGestionnaireAssignmentsDossiers(@Req() req: any) {
    const accessFilter = this.buildAccessFilter(req.user);
    
    // Filter gestionnaires based on user role
    let gestionnaireFilter: any = { role: 'GESTIONNAIRE' };
    
    // If user is CHEF_EQUIPE, only show gestionnaires in their team
    if (req.user?.role === 'CHEF_EQUIPE') {
      gestionnaireFilter.teamLeaderId = req.user.id;
    }
    
    // If user is GESTIONNAIRE, only show themselves
    if (req.user?.role === 'GESTIONNAIRE') {
      gestionnaireFilter.id = req.user.id;
    }
    
    const gestionnaires = await this.prisma.user.findMany({
      where: gestionnaireFilter,
      select: {
        id: true,
        fullName: true,
        assignedDocuments: {
          include: {
            bordereau: { include: { client: true } }
          },
          where: {
            bordereau: { ...accessFilter, archived: false }
          }
        }
      }
    });

    const assignments = await Promise.all(
      gestionnaires.map(async (gestionnaire) => {
        const docsByType = {};
        gestionnaire.assignedDocuments.forEach(doc => {
          const type = this.getDocumentTypeLabel(doc.type);
          docsByType[type] = (docsByType[type] || 0) + 1;
        });

        const traites = gestionnaire.assignedDocuments.filter(doc => doc.status === 'TRAITE').length;
        const enCours = gestionnaire.assignedDocuments.filter(doc => doc.status === 'EN_COURS').length;
        const retournes = gestionnaire.assignedDocuments.filter(doc => doc.status === 'REJETE' || doc.status === 'RETOUR_ADMIN').length;

        // Get who returned the documents - find the most recent return action by this gestionnaire
        let returnedBy: string | null = null;
        if (retournes > 0) {
          // Find returned documents for this gestionnaire
          const returnedDocs = gestionnaire.assignedDocuments.filter(doc => 
            doc.status === 'REJETE' || doc.status === 'RETOUR_ADMIN'
          );
          
          if (returnedDocs.length > 0) {
            // Get the history for the first returned document
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
          totalAssigned: gestionnaire.assignedDocuments.length,
          traites,
          enCours,
          retournes,
          returnedBy,
          documentsByType: docsByType
        };
      })
    );

    return assignments;
  }

  @Get('export-dossiers-en-cours')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE, UserRole.RESPONSABLE_DEPARTEMENT)
  async exportDossiersEnCours(@Query('type') typeFilter?: string, @Res() res?: Response) {
    const where: any = {
      bordereau: { 
        statut: { in: ['EN_COURS', 'ASSIGNE'] },
        archived: false 
      }
    };

    if (typeFilter && typeFilter !== 'Tous types') {
      const typeMapping = {
        'Prestation': 'BULLETIN_SOIN',
        'Adhésion': 'ADHESION',
        'Complément Dossier': 'COMPLEMENT_INFORMATION',
        'Avenant': 'CONTRAT_AVENANT',
        'Réclamation': 'RECLAMATION'
      };
      where.type = typeMapping[typeFilter];
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      },
      orderBy: { uploadedAt: 'asc' }
    });

    // Prepare Excel data
    const excelData = documents.map(doc => ({
      'Référence Dossier': doc.bordereau?.reference || doc.id,
      'Client': doc.bordereau?.client?.name || 'N/A',
      'Type': this.getDocumentTypeLabel(doc.type),
      'Date Réception': new Date(doc.uploadedAt).toLocaleDateString('fr-FR'),
      'Jours en Cours': Math.floor((new Date().getTime() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)),
      'Priorité': this.calculateDocumentPriorite(doc),
      'Gestionnaire': doc.assignedTo?.fullName || 'Non assigné',
      'Statut': this.getDocumentStatusLabel(doc.status || undefined),
      'Délai Règlement': 30,
      'Date Export': new Date().toLocaleDateString('fr-FR')
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Référence Dossier
      { wch: 25 }, // Client
      { wch: 20 }, // Type
      { wch: 15 }, // Date Réception
      { wch: 15 }, // Jours en Cours
      { wch: 12 }, // Priorité
      { wch: 20 }, // Gestionnaire
      { wch: 15 }, // Statut
      { wch: 15 }, // Délai Règlement
      { wch: 15 }  // Date Export
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Dossiers En Cours');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Log export action (simplified logging)
    console.log(`Export Excel - ${documents.length} dossiers${typeFilter && typeFilter !== 'Tous types' ? ` (filtre: ${typeFilter})` : ''} at ${new Date().toISOString()}`);

    // Set response headers for Excel download
    const fileName = `Dossiers_En_Cours_${typeFilter && typeFilter !== 'Tous types' ? typeFilter.replace(' ', '_') + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
    
    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(excelBuffer);
    }

    return { success: true, fileName, totalRecords: documents.length };
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'juste maintenant';
    if (diffMins < 60) return `il y a ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 30) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return `il y a ${Math.floor(diffDays / 30)} mois`;
  }

  private getDocumentStatusLabel(status?: string): string {
    const mapping = {
      'UPLOADED': 'Nouveau',
      'SCANNE': 'Scanné',
      'ASSIGNE': 'Assigné',
      'EN_COURS': 'En cours',
      'TRAITE': 'Traité',
      'REJETE': 'Rejeté',
      'RETOUR_ADMIN': 'Retourné'
    };
    return mapping[status || 'UPLOADED'] || status || 'Nouveau';
  }

  private calculateDocumentCompletion(doc: any): number {
    if (doc.status === 'TRAITE') return 100;
    return 0; // All other statuses = 0%
  }

  private getDocumentStates(doc: any): string[] {
    const states: string[] = [];
    if (doc.status === 'TRAITE') states.push('Traité');
    if (doc.status === 'EN_COURS') states.push('En cours');
    if (doc.status === 'REJETE') states.push('Retourné');
    if (states.length === 0) states.push('Nouveau');
    return states;
  }

  private calculateDocumentPriorite(doc: any): string {
    const joursEnCours = Math.floor((new Date().getTime() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (joursEnCours > 7) return 'Élevée';
    if (joursEnCours > 3) return 'Moyenne';
    return 'Normale';
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
    
    if (user?.role === 'GESTIONNAIRE') {
      // For gestionnaires, filter is handled at document level, not bordereau level
      // Return empty filter here as we filter by assignedToUserId in specific queries
      return {};
    }
    
    return {};
  }
}