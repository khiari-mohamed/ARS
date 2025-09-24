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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/chef-equipe/tableau-bord')
export class ChefEquipeTableauBordController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getTableauBordStats() {
    const [totalDossiers, clotures, enCours, nonAffectes] = await Promise.all([
      this.prisma.bordereau.count({ where: { archived: false } }),
      this.prisma.bordereau.count({ where: { statut: 'TRAITE', archived: false } }),
      this.prisma.bordereau.count({ where: { statut: { in: ['EN_COURS', 'ASSIGNE'] }, archived: false } }),
      this.prisma.bordereau.count({ where: { statut: { in: ['A_SCANNER', 'SCANNE', 'A_AFFECTER'] }, archived: false } })
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getTypesDetail() {
    const documents = await this.prisma.document.findMany({
      where: { bordereau: { archived: false } },
      include: { bordereau: true }
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
      types[type] = { total: 0, clotures: 0, enCours: 0, nonAffectes: 0 };
    });

    documents.forEach(doc => {
      if (!doc.bordereau) return;
      const typeName = typeMapping[doc.type] || 'Prestation';
      types[typeName].total++;
      
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
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDerniersDossiers() {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { archived: false },
      include: {
        client: true,
        documents: { take: 1 },
        currentHandler: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      client: b.client?.name || 'N/A',
      type: this.getDocumentTypeLabel(b.documents[0]?.type),
      statut: this.getStatutLabel(b.statut),
      gestionnaire: b.currentHandler?.fullName || 'Non assigné',
      date: this.getRelativeTime(b.createdAt),
      joursEnCours: Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculatePriorite(b)
    }));
  }

  @Get('dossiers-en-cours')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDossiersEnCours(@Query('type') typeFilter?: string) {
    const where: any = {
      statut: { in: ['EN_COURS', 'ASSIGNE'] },
      archived: false
    };

    if (typeFilter && typeFilter !== 'Tous types') {
      const typeMapping = {
        'Prestation': 'BULLETIN_SOIN',
        'Adhésion': 'ADHESION',
        'Complément Dossier': 'COMPLEMENT_INFORMATION',
        'Avenant': 'CONTRAT_AVENANT',
        'Réclamation': 'RECLAMATION'
      };
      where.documents = {
        some: { type: typeMapping[typeFilter] }
      };
    }

    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        client: true,
        documents: { take: 1 },
        currentHandler: true
      },
      orderBy: { dateReception: 'asc' },
      take: 50
    });

    return bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      client: b.client?.name || 'N/A',
      type: this.getDocumentTypeLabel(b.documents[0]?.type),
      joursEnCours: Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculatePriorite(b),
      gestionnaire: b.currentHandler?.fullName || 'Non assigné'
    }));
  }

  @Get('search')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async searchDossiers(@Query('type') searchType: string, @Query('query') query: string) {
    if (!query) return [];

    const where: any = { archived: false };
    
    switch (searchType) {
      case 'Ref. GSD':
        where.reference = { contains: query, mode: 'insensitive' };
        break;
      case 'Client':
        where.client = { name: { contains: query, mode: 'insensitive' } };
        break;
      case 'Type':
        where.documents = { some: { type: { contains: query.toUpperCase(), mode: 'insensitive' } } };
        break;
      case 'Gestionnaire':
        where.currentHandler = { fullName: { contains: query, mode: 'insensitive' } };
        break;
      default:
        where.reference = { contains: query, mode: 'insensitive' };
    }

    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        client: true,
        documents: { take: 1 },
        currentHandler: true
      },
      take: 20
    });

    return bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      client: b.client?.name || 'N/A',
      type: this.getDocumentTypeLabel(b.documents[0]?.type),
      statut: this.getStatutLabel(b.statut),
      gestionnaire: b.currentHandler?.fullName || 'Non assigné',
      date: this.getRelativeTime(b.createdAt),
      joursEnCours: Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculatePriorite(b)
    }));
  }

  @Post('change-document-type')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async changeDocumentType(@Body() body: { bordereauId: string; newType: string }, @Req() req: any) {
    // Check if gestionnaire can modify this dossier
    if (req.user?.role === UserRole.GESTIONNAIRE) {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: body.bordereauId }
      });
      
      if (!bordereau || (bordereau.currentHandlerId !== req.user.id && bordereau.assignedToUserId !== req.user.id)) {
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

    // Check if bordereau has documents
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: body.bordereauId },
      include: { documents: true }
    });

    if (!bordereau) {
      throw new Error('Bordereau non trouvé');
    }

    if (bordereau.documents.length > 0) {
      // Update existing documents
      await this.prisma.document.updateMany({
        where: { bordereauId: body.bordereauId },
        data: { type: typeMapping[body.newType] as any }
      });
    } else {
      // Create a placeholder document if none exist
      await this.prisma.document.create({
        data: {
          bordereauId: body.bordereauId,
          type: typeMapping[body.newType] as any,
          name: `Document-${bordereau.reference}`,
          path: `/placeholder/${bordereau.reference}`,
          uploadedAt: new Date(),
          uploadedById: req.user?.id || null,
          priority: 1,
          status: null
        }
      });
    }

    // Log the change
    await this.prisma.actionLog.create({
      data: {
        bordereauId: body.bordereauId,
        action: 'DOCUMENT_TYPE_CHANGED',
        details: `Type changé vers: ${body.newType}`,
        timestamp: new Date()
      }
    });

    return { success: true, message: 'Type de document modifié avec succès' };
  }

  @Post('return-to-scan')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async returnToScan(@Body() body: { bordereauId: string; reason: string }, @Req() req: any) {
    // Check if gestionnaire can modify this dossier
    if (req.user?.role === UserRole.GESTIONNAIRE) {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: body.bordereauId }
      });
      
      if (!bordereau || (bordereau.currentHandlerId !== req.user.id && bordereau.assignedToUserId !== req.user.id)) {
        throw new Error('Accès refusé: Ce dossier ne vous est pas assigné');
      }
    }
    await this.prisma.bordereau.update({
      where: { id: body.bordereauId },
      data: { 
        statut: 'A_SCANNER',
        assignedToUserId: null,
        currentHandlerId: null
      }
    });

    // Notify SCAN team
    const scanUsers = await this.prisma.user.findMany({
      where: { role: 'SCAN', active: true }
    });

    for (const user of scanUsers) {
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'BORDEREAU_RETURNED_TO_SCAN',
          title: 'Bordereau retourné pour re-scan',
          message: `Bordereau retourné par le chef d'équipe: ${body.reason}`,
          data: { bordereauId: body.bordereauId, reason: body.reason }
        }
      });
    }

    return { success: true };
  }

  @Get('dossier/:id')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async getDossierDetail(@Param('id') id: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id },
      include: {
        client: true,
        documents: true,
        currentHandler: true
      }
    });

    if (!bordereau) {
      throw new Error('Dossier non trouvé');
    }

    return {
      id: bordereau.id,
      reference: bordereau.reference,
      client: bordereau.client?.name || 'N/A',
      dateReception: bordereau.dateReception,
      statut: this.getStatutLabel(bordereau.statut),
      gestionnaire: bordereau.currentHandler?.fullName || 'Non assigné',
      documents: bordereau.documents.map(doc => ({
        id: doc.id,
        type: this.getDocumentTypeLabel(doc.type),
        fileName: doc.name,
        filePath: doc.path
      })),
      delaiReglement: bordereau.delaiReglement,
      joursEnCours: Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      priorite: this.calculatePriorite(bordereau)
    };
  }

  @Get('download/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
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

  @Get('download-info/:bordereauId')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
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

  @Get('export-dossiers-en-cours')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.SUPER_ADMIN, UserRole.GESTIONNAIRE)
  async exportDossiersEnCours(@Query('type') typeFilter?: string, @Res() res?: Response) {
    const where: any = {
      statut: { in: ['EN_COURS', 'ASSIGNE'] },
      archived: false
    };

    if (typeFilter && typeFilter !== 'Tous types') {
      const typeMapping = {
        'Prestation': 'BULLETIN_SOIN',
        'Adhésion': 'ADHESION',
        'Complément Dossier': 'COMPLEMENT_INFORMATION',
        'Avenant': 'CONTRAT_AVENANT',
        'Réclamation': 'RECLAMATION'
      };
      where.documents = {
        some: { type: typeMapping[typeFilter] }
      };
    }

    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        client: true,
        documents: { take: 1 },
        currentHandler: true
      },
      orderBy: { dateReception: 'asc' }
    });

    // Prepare Excel data
    const excelData = bordereaux.map(b => ({
      'Référence Dossier': b.reference,
      'Client': b.client?.name || 'N/A',
      'Type': this.getDocumentTypeLabel(b.documents[0]?.type),
      'Date Réception': new Date(b.dateReception).toLocaleDateString('fr-FR'),
      'Jours en Cours': Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)),
      'Priorité': this.calculatePriorite(b),
      'Gestionnaire': b.currentHandler?.fullName || 'Non assigné',
      'Statut': this.getStatutLabel(b.statut),
      'Délai Règlement': b.delaiReglement || 30,
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
    console.log(`Export Excel - ${bordereaux.length} dossiers${typeFilter && typeFilter !== 'Tous types' ? ` (filtre: ${typeFilter})` : ''} at ${new Date().toISOString()}`);

    // Set response headers for Excel download
    const fileName = `Dossiers_En_Cours_${typeFilter && typeFilter !== 'Tous types' ? typeFilter.replace(' ', '_') + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
    
    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(excelBuffer);
    }

    return { success: true, fileName, totalRecords: bordereaux.length };
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
}