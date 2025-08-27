import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';
import { OutlookService } from './outlook.service';

@Injectable()
export class TuniclaimService {
  async syncBordereaux(): Promise<void> {
    await this.syncBs();
  }
  private readonly logger = new Logger(TuniclaimService.name);
  private readonly baseUrl = 'http://197.14.56.112:8083/api';

  constructor(
    private prisma: PrismaService,
    private outlook: OutlookService,
  ) {}

  public lastSync: string | null = null;
  public lastResult: { imported: number; errors: number } | null = null;

  // Fetch BS list from external API
  async fetchBsList(): Promise<any[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/bs`, { timeout: 10000 });
      return res.data;
    } catch (e) {
      this.logger.error('Tuniclaim fetch failed');
      this.logger.error(e.code === 'ECONNREFUSED' ? 'External API unavailable' : e.message);
      throw e;
    }
  }

  // Fetch BS details by external ID
  async fetchBsDetails(bsId: string): Promise<any> {
    try {
      const res = await axios.get(`${this.baseUrl}/bs/${bsId}`);
      return res.data;
    } catch (e) {
      this.logger.error(`Failed to fetch BS details for ${bsId}`, e);
      throw e;
    }
  }

  // Map and upsert BS into local DB with individual BS creation
  async syncBs(): Promise<{ imported: number; errors: number; error?: string }> {
    let bsList: any[] = [];
    let imported = 0, errors = 0;
    try {
      bsList = await this.fetchBsList();
    } catch (e) {
      this.logger.error('Tuniclaim fetch failed', e);
      this.lastSync = new Date().toISOString();
      this.lastResult = { imported: 0, errors: 1 };
      await this.prisma.syncLog.create({
        data: {
          imported: 0,
          errors: 1,
          details: 'External API unavailable: ' + (e.message || e.toString()),
        },
      });
      try {
        await this.outlook.sendMail(
          'admin@example.com',
          'Tuniclaim Sync Errors',
          `Tuniclaim API unavailable: ${e.message}`
        );
      } catch (emailError) {
        this.logger.warn('Failed to send error notification email', emailError.message);
      }
      return { imported: 0, errors: 1, error: e.message };
    }
    for (const extBs of bsList) {
      try {
        // Create/update bordereau
        const bordereauMapped = {
          reference: extBs.reference || 'EXT_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          clientId: await this.resolveClientId(extBs.client || {}),
          contractId: await this.resolveContractId(extBs.contract || {}),
          dateReception: extBs.dateReception ? new Date(extBs.dateReception) : new Date(),
          delaiReglement: extBs.delaiReglement || 5,
          statut: Statut.EN_ATTENTE,
          nombreBS: extBs.nombreBS || 1,
        };
        const bordereau = await this.prisma.bordereau.upsert({
          where: { reference: bordereauMapped.reference },
          update: bordereauMapped,
          create: bordereauMapped,
        });

        // Create individual BS records if they exist in external data
        if (extBs.bulletinsSoins && Array.isArray(extBs.bulletinsSoins)) {
          for (const extBsItem of extBs.bulletinsSoins) {
            await this.createBulletinSoin(extBsItem, bordereau.id);
          }
        }
        imported++;
      } catch (e) {
        this.logger.error(`Failed to import BS ${extBs.reference}: ${e.message}`);
        errors++;
      }
    }
    this.lastSync = new Date().toISOString();
    this.lastResult = { imported, errors };

    // Persist sync log
    await this.prisma.syncLog.create({
      data: {
        imported,
        errors,
        details: errors > 0 ? 'See logs or email for details' : null,
      },
    });

    // Email notification if errors
    if (errors > 0) {
      try {
        await this.outlook.sendMail(
          'admin@example.com',
          'Tuniclaim Sync Errors',
          `There were ${errors} errors during the last sync.`
        );
      } catch (emailError) {
        this.logger.warn('Failed to send sync error notification', emailError.message);
      }
    }

    return { imported, errors };
  }

  async getLastSyncLog() {
    return this.prisma.syncLog.findFirst({
      orderBy: { date: 'desc' },
    });
  }

  async getSyncLogs(limit = 20) {
    return this.prisma.syncLog.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  // Always return a valid user ID for assignedManagerId
  private async getDefaultManagerId(): Promise<string> {
    const user = await this.prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (user) return user.id;
    const anyUser = await this.prisma.user.findFirst();
    if (anyUser) return anyUser.id;
    throw new Error('No user found to assign as manager');
  }

  private async resolveClientId(extClient: any): Promise<string> {
    // Try to find by name or external ID, or create if not exists
    const client = await this.prisma.client.findFirst({
      where: { name: extClient?.name },
    });
    if (client) return client.id;
    // Optionally create new client
    const accountManagerId = await this.getDefaultManagerId();
    const data: any = {
      name: extClient?.name || 'EXT_' + Date.now(),
      reglementDelay: extClient?.reglementDelay || 5,
      reclamationDelay: extClient?.reclamationDelay || 5,
      accountManagerId,
    };
    const created = await this.prisma.client.create({ data });
    return created.id;
  }

 private async resolveContractId(extContract: any): Promise<string> {
  // Try to find by reference or client, or create if not exists
  const contract = await this.prisma.contract.findFirst({
    where: { clientName: extContract?.clientName },
  });
  if (contract) return contract.id;
  // Optionally create new contract
  const assignedManagerId = await this.getDefaultManagerId();
  const now = new Date();
  const startDate = extContract?.startDate ? new Date(extContract.startDate) : now;
  const endDate = extContract?.endDate ? new Date(extContract.endDate) : now;
  const created = await this.prisma.contract.create({
    data: {
      clientId: await this.resolveClientId(extContract?.client),
      clientName: extContract?.clientName || 'EXT_' + Date.now(),
      delaiReglement: extContract?.delaiReglement || 5,
      delaiReclamation: extContract?.delaiReclamation || 5,
      documentPath: '',
      assignedManagerId,
      startDate,
      endDate,
     signature: extContract?.signature || undefined,
    },
  });
  return created.id;
}

  // Create individual BulletinSoin from MY TUNICLAIM data
  private async createBulletinSoin(extBsItem: any, bordereauId: string): Promise<void> {
    try {
      const bsData = {
        bordereauId,
        numBs: extBsItem.numBs || 'EXT_' + Date.now(),
        etat: 'IN_PROGRESS',
        codeAssure: extBsItem.codeAssure || '',
        dateCreation: extBsItem.dateCreation ? new Date(extBsItem.dateCreation) : new Date(),
        dateMaladie: extBsItem.dateMaladie ? new Date(extBsItem.dateMaladie) : new Date(),
        lien: extBsItem.lien || '',
        nomAssure: extBsItem.nomAssure || '',
        nomBeneficiaire: extBsItem.nomBeneficiaire || '',
        nomBordereau: extBsItem.nomBordereau || '',
        nomPrestation: extBsItem.nomPrestation || '',
        nomSociete: extBsItem.nomSociete || '',
        observationGlobal: extBsItem.observationGlobal || '',
        totalPec: extBsItem.totalPec || 0,
        dueDate: this.calculateDueDate(extBsItem.dateCreation, extBsItem.delaiReglement || 5),
      };

      const bulletinSoin = await this.prisma.bulletinSoin.create({ data: bsData });

      // Create BS items if they exist
      if (extBsItem.items && Array.isArray(extBsItem.items)) {
        for (const item of extBsItem.items) {
          await this.prisma.bulletinSoinItem.create({
            data: {
              bulletinSoinId: bulletinSoin.id,
              nomProduit: item.nomProduit || '',
              quantite: item.quantite || 1,
              commentaire: item.commentaire || '',
              nomChapitre: item.nomChapitre || '',
              nomPrestataire: item.nomPrestataire || '',
              datePrestation: item.datePrestation ? new Date(item.datePrestation) : new Date(),
              typeHonoraire: item.typeHonoraire || 'FIXE',
              depense: item.depense || 0,
              pec: item.pec || 0,
              participationAdherent: item.participationAdherent || 0,
              message: item.message || '',
              codeMessage: item.codeMessage || '',
              acuiteDroite: item.acuiteDroite || 0,
              acuiteGauche: item.acuiteGauche || 0,
              nombreCle: item.nombreCle || '',
              nbJourDepassement: item.nbJourDepassement || 0,
            },
          });
        }
      }

      this.logger.log(`Created BS ${bulletinSoin.numBs} from MY TUNICLAIM`);
    } catch (error) {
      this.logger.error(`Failed to create BS from MY TUNICLAIM: ${error.message}`);
      throw error;
    }
  }

  private calculateDueDate(dateCreation: string | Date, delaiReglement: number): Date {
    const baseDate = typeof dateCreation === 'string' ? new Date(dateCreation) : dateCreation;
    return new Date(baseDate.getTime() + delaiReglement * 24 * 60 * 60 * 1000);
  }
}
