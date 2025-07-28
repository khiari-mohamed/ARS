import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTraitementDto } from './dto/assign-traitement.dto';
import { UpdateTraitementStatusDto } from './dto/update-traitement-status.dto';
import { SearchTraitementDto } from './dto/search-traitement.dto';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TraitementService {
  constructor(private prisma: PrismaService) {}

  private checkRole(user: any, action: 'view'|'assign'|'update'|'export' = 'view') {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.role === 'CHEF_EQUIPE' && ['view','assign','update'].includes(action)) return;
    if (user.role === 'GESTIONNAIRE' && ['view','update'].includes(action)) return;
    if (user.role === 'SCAN' && action === 'view') return;
    if (user.role === 'BO' && action === 'view') return;
    throw new ForbiddenException('Access denied');
  }

  // Corbeille globale (Chef d'équipe, Super Admin)
  async globalInbox(query: SearchTraitementDto, user: any) {
    this.checkRole(user, 'view');
    const where: any = {};
    if (query.statut) where.statut = query.statut;
    if (query.teamId) where.teamId = query.teamId;
    const take = query.take || 20;
    const skip = query.skip || 0;
    const orderBy = query.orderBy
      ? { [query.orderBy]: 'desc' as const }
      : { createdAt: 'desc' as const };
    return this.prisma.bordereau.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { currentHandler: true, team: true },
    });
  }

  // Corbeille personnelle (Gestionnaire)
  async personalInbox(user: any, query: SearchTraitementDto) {
    this.checkRole(user, 'view');
    const where: any = { currentHandlerId: user.id };
    if (query.statut) where.statut = query.statut;
    const take = query.take || 20;
    const skip = query.skip || 0;
    const orderBy = query.orderBy ? { [query.orderBy]: 'desc' as const } : { createdAt: 'desc' as const };
    return this.prisma.bordereau.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { currentHandler: true, team: true },
    });
  }

  // Affectation manuelle
  async assignTraitement(dto: AssignTraitementDto, user: any) {
    this.checkRole(user, 'assign');
    const bordereau = await this.prisma.bordereau.update({
      where: { id: dto.bordereauId },
      data: { currentHandlerId: dto.assignedToId, statut: 'ASSIGNE' },
    });
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId: dto.bordereauId,
        userId: user.id,
        action: 'ASSIGN',
        toStatus: 'ASSIGNE',
        assignedToId: dto.assignedToId,
      },
    });
    return bordereau;
  }

  // Mise à jour de statut
  async updateStatus(dto: UpdateTraitementStatusDto, user: any) {
    this.checkRole(user, 'update');
    const old = await this.prisma.bordereau.findUnique({ where: { id: dto.bordereauId } });
    if (!old) throw new NotFoundException('Bordereau not found');
    const bordereau = await this.prisma.bordereau.update({
      where: { id: dto.bordereauId },
      data: { statut: dto.statut as any }, // Cast to 'any' if Statut enum is not imported, or use 'as Statut' if imported
    });
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId: dto.bordereauId,
        userId: user.id,
        action: 'STATUS_UPDATE',
        fromStatus: old.statut,
        toStatus: dto.statut,
      },
    });
    return bordereau;
  }

  // Monitoring de traitement (KPI, performance)
  async kpi(user: any) {
    this.checkRole(user, 'view');
    // Nombre de BS traités, délai moyen, taux de conformité/rejet
    const total = await this.prisma.bordereau.count();
    const traite = await this.prisma.bordereau.count({ where: { statut: 'TRAITE' } });
    const enDifficulte = await this.prisma.bordereau.count({ where: { statut: 'EN_DIFFICULTE' } });
    const avgDelay = await this.prisma.bordereau.aggregate({ _avg: { delaiReglement: true } });
    return { total, traite, enDifficulte, avgDelay: avgDelay._avg.delaiReglement };
  }

  // AI stub: affectation intelligente, prédiction surcharge
  async aiRecommendations(user: any) {
    this.checkRole(user, 'view');
    // Example: recommend reallocation if >X en_difficulte
    const enDifficulte = await this.prisma.bordereau.count({ where: { statut: 'EN_DIFFICULTE' } });
    let recommendation = 'All OK';
    if (enDifficulte > 10) recommendation = 'Reallocate workload, team is overloaded';
    return { enDifficulte, recommendation };
  }

  // Export Excel
  async exportStats(user: any) {
    this.checkRole(user, 'export');
    const stats = await this.kpi(user);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Traitement Stats');
    sheet.columns = [
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Traités', key: 'traite', width: 10 },
      { header: 'En Difficulté', key: 'enDifficulte', width: 15 },
      { header: 'Délai Moyen', key: 'avgDelay', width: 15 },
    ];
    sheet.addRow(stats);
    const filePath = path.join('exports', `traitement_stats_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return { filePath };
  }

  // Export PDF (real)
  async exportStatsPdf(user: any) {
    this.checkRole(user, 'export');
    const stats = await this.kpi(user);
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join('exports', `traitement_stats_${Date.now()}.pdf`);
    if (!fs.existsSync('exports')) {
      fs.mkdirSync('exports', { recursive: true });
    }
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const ws = fs.createWriteStream(filePath);
    doc.pipe(ws);
    doc.fontSize(18).text('Traitement Stats', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total: ${stats.total}`);
    doc.text(`Traités: ${stats.traite}`);
    doc.text(`En Difficulté: ${stats.enDifficulte}`);
    doc.text(`Délai Moyen: ${stats.avgDelay}`);
    doc.end();
    await new Promise((resolve, reject) => {
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
    return { filePath };
  }

  // Historique de traitement
  async history(bordereauId: string, user: any) {
    this.checkRole(user, 'view');
    return this.prisma.traitementHistory.findMany({
      where: { bordereauId },
      orderBy: { createdAt: 'asc' },
      include: { user: true, assignedTo: true },
    });
  }

  // Export Historique Excel
  async exportHistoryExcel(bordereauId: string, user: any) {
    this.checkRole(user, 'export');
    const history = await this.history(bordereauId, user);
    const ExcelJS = require('exceljs');
    const path = require('path');
    const fs = require('fs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Historique');
    sheet.columns = [
      { header: 'Date', key: 'createdAt', width: 20 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Utilisateur', key: 'user', width: 20 },
      { header: 'Statut', key: 'toStatus', width: 20 },
      { header: 'Assigné à', key: 'assignedTo', width: 20 },
    ];
    for (const h of history) {
      sheet.addRow({
        createdAt: h.createdAt ? new Date(h.createdAt).toLocaleString() : '',
        action: h.action,
        user: h.user ? h.user.fullName || h.user.id : '',
        toStatus: h.toStatus,
        assignedTo: h.assignedTo ? h.assignedTo.fullName || h.assignedTo.id : '',
      });
    }
    if (!fs.existsSync('exports')) {
      fs.mkdirSync('exports', { recursive: true });
    }
    const filePath = path.join('exports', `traitement_history_${bordereauId}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return { filePath };
  }

  // Export Historique PDF
  async exportHistoryPdf(bordereauId: string, user: any) {
    this.checkRole(user, 'export');
    const history = await this.history(bordereauId, user);
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync('exports')) {
      fs.mkdirSync('exports', { recursive: true });
    }
    const filePath = path.join('exports', `traitement_history_${bordereauId}_${Date.now()}.pdf`);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const ws = fs.createWriteStream(filePath);
    doc.pipe(ws);
    doc.fontSize(18).text('Historique de Traitement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    for (const h of history) {
      doc.text(`Date: ${h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}`);
      doc.text(`Action: ${h.action}`);
      doc.text(`Utilisateur: ${h.user ? h.user.fullName || h.user.id : ''}`);
      doc.text(`Statut: ${h.toStatus}`);
      doc.text(`Assigné à: ${h.assignedTo ? h.assignedTo.fullName || h.assignedTo.id : ''}`);
      doc.moveDown(0.5);
    }
    doc.end();
    await new Promise((resolve, reject) => {
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
    return { filePath };
  }
}
