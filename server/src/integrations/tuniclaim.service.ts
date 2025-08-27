import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Statut } from '@prisma/client';
import { OutlookService } from './outlook.service';

@Injectable()
export class TuniclaimService {
  private readonly logger = new Logger(TuniclaimService.name);
  private readonly baseUrl = 'http://197.14.56.112:8083/api';
  private readonly timeout = 15000; // 15 seconds timeout
  
  public lastSync: string | null = null;
  public lastResult: { imported: number; errors: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private outlook: OutlookService,
  ) {}

  // Main sync method called by scheduler
  async syncBordereaux(): Promise<void> {
    try {
      await this.syncBs();
      this.logger.log('Scheduled sync completed successfully');
    } catch (error) {
      this.logger.error('Scheduled sync failed:', error.message);
    }
  }

  // Fetch BS list from MY TUNICLAIM API
  async fetchBsList(): Promise<any[]> {
    try {
      this.logger.log('Fetching BS list from MY TUNICLAIM...');
      const res = await axios.get(`${this.baseUrl}/bordereaux`, { 
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const data = Array.isArray(res.data) ? res.data : res.data?.bordereaux || [];
      this.logger.log(`Fetched ${data.length} bordereaux from MY TUNICLAIM`);
      return data;
    } catch (e) {
      const errorMsg = e.code === 'ECONNREFUSED' 
        ? 'MY TUNICLAIM API unavailable - connection refused'
        : e.code === 'ETIMEDOUT'
        ? 'MY TUNICLAIM API timeout'
        : `MY TUNICLAIM API error: ${e.message}`;
      
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Fetch BS details by external ID
  async fetchBsDetails(bsId: string): Promise<any> {
    try {
      this.logger.log(`Fetching BS details for ${bsId}`);
      const res = await axios.get(`${this.baseUrl}/bordereaux/${bsId}/bulletins`, { 
        timeout: this.timeout 
      });
      return res.data;
    } catch (e) {
      this.logger.error(`Failed to fetch BS details for ${bsId}: ${e.message}`);
      throw e;
    }
  }

  // Push status updates to MY TUNICLAIM
  async pushStatusUpdate(bordereauId: string, statusData: any): Promise<void> {
    try {
      this.logger.log(`Pushing status update for bordereau ${bordereauId}`);
      await axios.put(`${this.baseUrl}/bordereaux/${bordereauId}/status`, statusData, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      this.logger.log(`Status update pushed successfully for ${bordereauId}`);
    } catch (e) {
      this.logger.error(`Failed to push status update for ${bordereauId}: ${e.message}`);
      // Don't throw - status updates are not critical
    }
  }

  // Push payment status to MY TUNICLAIM
  async pushPaymentUpdate(bordereauId: string, paymentData: any): Promise<void> {
    try {
      this.logger.log(`Pushing payment update for bordereau ${bordereauId}`);
      await axios.put(`${this.baseUrl}/bordereaux/${bordereauId}/payment`, paymentData, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      this.logger.log(`Payment update pushed successfully for ${bordereauId}`);
    } catch (e) {
      this.logger.error(`Failed to push payment update for ${bordereauId}: ${e.message}`);
      // Don't throw - payment updates are not critical
    }
  }

  // Main sync method - imports BS from MY TUNICLAIM
  async syncBs(): Promise<{ imported: number; errors: number; error?: string }> {
    const startTime = new Date();
    let bsList: any[] = [];
    let imported = 0, errors = 0;
    let errorDetails: string[] = [];

    this.logger.log('Starting MY TUNICLAIM sync...');

    try {
      bsList = await this.fetchBsList();
    } catch (e) {
      const errorMsg = `MY TUNICLAIM fetch failed: ${e.message}`;
      this.logger.error(errorMsg);
      
      this.lastSync = new Date().toISOString();
      this.lastResult = { imported: 0, errors: 1 };
      
      await this.prisma.syncLog.create({
        data: {
          imported: 0,
          errors: 1,
          details: errorMsg,
        },
      });
      
      // Send email notification
      try {
        await this.sendErrorNotification('MY TUNICLAIM API Unavailable', errorMsg);
      } catch (emailError) {
        this.logger.warn('Failed to send error notification email:', emailError.message);
      }
      
      return { imported: 0, errors: 1, error: e.message };
    }
    // Process each bordereau from MY TUNICLAIM
    for (const extBordereau of bsList) {
      try {
        this.logger.log(`Processing bordereau: ${extBordereau.reference || 'NO_REF'}`);
        
        // Create/update bordereau
        const bordereauMapped = {
          reference: extBordereau.reference || `TUNICLAIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          clientId: await this.resolveClientId(extBordereau.client || {}),
          contractId: await this.resolveContractId(extBordereau.contract || {}),
          dateReception: extBordereau.dateReception ? new Date(extBordereau.dateReception) : new Date(),
          delaiReglement: extBordereau.delaiReglement || 5,
          statut: this.mapExternalStatus(extBordereau.statut) || Statut.EN_ATTENTE,
          nombreBS: extBordereau.nombreBS || extBordereau.bulletinsSoins?.length || 1,
          prestataireId: await this.resolvePrestataire(extBordereau.prestataire),
        };
        
        const bordereau = await this.prisma.bordereau.upsert({
          where: { reference: bordereauMapped.reference },
          update: {
            ...bordereauMapped,
            updatedAt: new Date(),
          },
          create: bordereauMapped,
        });

        // Create individual BS records
        let bsCount = 0;
        if (extBordereau.bulletinsSoins && Array.isArray(extBordereau.bulletinsSoins)) {
          for (const extBsItem of extBordereau.bulletinsSoins) {
            try {
              await this.createBulletinSoin(extBsItem, bordereau.id);
              bsCount++;
            } catch (bsError) {
              this.logger.error(`Failed to create BS ${extBsItem.numBs}: ${bsError.message}`);
              errorDetails.push(`BS ${extBsItem.numBs}: ${bsError.message}`);
            }
          }
        }
        
        this.logger.log(`Successfully imported bordereau ${bordereau.reference} with ${bsCount} BS`);
        imported++;
        
      } catch (e) {
        const ref = extBordereau.reference || 'UNKNOWN';
        const errorMsg = `Failed to import bordereau ${ref}: ${e.message}`;
        this.logger.error(errorMsg);
        errorDetails.push(errorMsg);
        errors++;
      }
    }
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    this.lastSync = endTime.toISOString();
    this.lastResult = { imported, errors };

    // Create detailed sync log
    const syncDetails = {
      duration: `${duration}ms`,
      totalBordereaux: bsList.length,
      imported,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : null, // Limit to 10 errors
    };

    await this.prisma.syncLog.create({
      data: {
        imported,
        errors,
        details: JSON.stringify(syncDetails),
      },
    });

    // Send notifications
    if (errors > 0) {
      try {
        await this.sendErrorNotification(
          'MY TUNICLAIM Sync Completed with Errors',
          `Sync completed: ${imported} imported, ${errors} errors. Duration: ${duration}ms`
        );
      } catch (emailError) {
        this.logger.warn('Failed to send sync notification:', emailError.message);
      }
    } else if (imported > 0) {
      this.logger.log(`MY TUNICLAIM sync completed successfully: ${imported} bordereaux imported in ${duration}ms`);
    }

    return { imported, errors };
  }

  // Get sync status and logs
  async getLastSyncLog() {
    return this.prisma.syncLog.findFirst({
      orderBy: { date: 'desc' },
    });
  }

  async getSyncLogs(limit = 20) {
    const logs = await this.prisma.syncLog.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });
    
    return logs.map(log => ({
      date: log.date.toISOString(),
      imported: log.imported,
      errors: log.errors,
      details: log.details,
    }));
  }

  // Get current sync status
  getSyncStatus() {
    return {
      lastSync: this.lastSync,
      lastResult: this.lastResult,
      isHealthy: this.lastResult ? this.lastResult.errors === 0 : null,
    };
  }

  // Helper methods
  private async getDefaultManagerId(): Promise<string> {
    const user = await this.prisma.user.findFirst({ 
      where: { role: { in: ['super_admin', 'SUPER_ADMIN', 'admin', 'ADMIN'] } } 
    });
    if (user) return user.id;
    
    const anyUser = await this.prisma.user.findFirst();
    if (anyUser) return anyUser.id;
    
    throw new Error('No user found to assign as manager');
  }

  private mapExternalStatus(externalStatus: string): Statut | null {
    const statusMap: Record<string, Statut> = {
      'EN_ATTENTE': Statut.EN_ATTENTE,
      'A_SCANNER': Statut.A_SCANNER,
      'SCAN_EN_COURS': Statut.SCAN_EN_COURS,
      'SCANNE': Statut.SCANNE,
      'ASSIGNE': Statut.ASSIGNE,
      'EN_COURS': Statut.EN_COURS,
      'TRAITE': Statut.TRAITE,
      'CLOTURE': Statut.CLOTURE,
    };
    
    return statusMap[externalStatus] || null;
  }

  private async resolvePrestataire(extPrestataire: any): Promise<string | null> {
    if (!extPrestataire?.name) return null;
    
    let prestataire = await this.prisma.prestataire.findFirst({
      where: { name: extPrestataire.name },
    });
    
    if (!prestataire) {
      prestataire = await this.prisma.prestataire.create({
        data: { name: extPrestataire.name },
      });
    }
    
    return prestataire.id;
  }

  private async sendErrorNotification(subject: string, message: string): Promise<void> {
    try {
      await this.outlook.sendMail(
        'admin@arstunisia.com',
        subject,
        `MY TUNICLAIM Sync Notification\n\n${message}\n\nTimestamp: ${new Date().toISOString()}`
      );
    } catch (error) {
      this.logger.error('Failed to send email notification:', error.message);
    }
  }

  private async resolveClientId(extClient: any): Promise<string> {
    if (!extClient?.name) {
      // Create default client for missing data
      const defaultClient = await this.prisma.client.findFirst({
        where: { name: 'MY TUNICLAIM - Client par défaut' },
      });
      
      if (defaultClient) return defaultClient.id;
      
      const created = await this.prisma.client.create({
        data: {
          name: 'MY TUNICLAIM - Client par défaut',
          reglementDelay: 5,
          reclamationDelay: 5,
        },
      });
      return created.id;
    }

    // Try to find existing client
    let client = await this.prisma.client.findFirst({
      where: { name: extClient.name },
    });
    
    if (!client) {
      // Create new client
      client = await this.prisma.client.create({
        data: {
          name: extClient.name,
          email: extClient.email || null,
          phone: extClient.phone || null,
          address: extClient.address || null,
          reglementDelay: extClient.reglementDelay || 5,
          reclamationDelay: extClient.reclamationDelay || 5,
        },
      });
      this.logger.log(`Created new client: ${client.name}`);
    }
    
    return client.id;
  }

  private async resolveContractId(extContract: any): Promise<string | null> {
    if (!extContract?.clientName && !extContract?.client?.name) {
      return null; // Contract is optional
    }

    const clientName = extContract.clientName || extContract.client?.name;
    
    // Try to find existing contract
    let contract = await this.prisma.contract.findFirst({
      where: { clientName },
    });
    
    if (!contract) {
      try {
        const assignedManagerId = await this.getDefaultManagerId();
        const clientId = await this.resolveClientId(extContract.client || { name: clientName });
        const now = new Date();
        const startDate = extContract?.startDate ? new Date(extContract.startDate) : now;
        const endDate = extContract?.endDate ? new Date(extContract.endDate) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        contract = await this.prisma.contract.create({
          data: {
            clientId,
            clientName,
            delaiReglement: extContract?.delaiReglement || 5,
            delaiReclamation: extContract?.delaiReclamation || 5,
            documentPath: extContract?.documentPath || '',
            assignedManagerId,
            startDate,
            endDate,
            signature: extContract?.signature || null,
          },
        });
        this.logger.log(`Created new contract for client: ${clientName}`);
      } catch (error) {
        this.logger.error(`Failed to create contract for ${clientName}: ${error.message}`);
        return null;
      }
    }
    
    return contract.id;
  }

  // Create individual BulletinSoin from MY TUNICLAIM data
  private async createBulletinSoin(extBsItem: any, bordereauId: string): Promise<void> {
    try {
      // Check if BS already exists
      const existingBs = await this.prisma.bulletinSoin.findFirst({
        where: {
          numBs: extBsItem.numBs,
          bordereauId,
        },
      });

      if (existingBs) {
        this.logger.log(`BS ${extBsItem.numBs} already exists, skipping...`);
        return;
      }

      const bsData = {
        bordereauId,
        numBs: extBsItem.numBs || `TUNICLAIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        etat: extBsItem.etat || 'IN_PROGRESS',
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
        totalPec: parseFloat(extBsItem.totalPec) || 0,
        dueDate: this.calculateDueDate(extBsItem.dateCreation, extBsItem.delaiReglement || 5),
        priority: extBsItem.priority || 1,
      };

      const bulletinSoin = await this.prisma.bulletinSoin.create({ data: bsData });

      // Create BS items if they exist
      if (extBsItem.items && Array.isArray(extBsItem.items)) {
        for (const item of extBsItem.items) {
          await this.prisma.bulletinSoinItem.create({
            data: {
              bulletinSoinId: bulletinSoin.id,
              nomProduit: item.nomProduit || '',
              quantite: parseInt(item.quantite) || 1,
              commentaire: item.commentaire || '',
              nomChapitre: item.nomChapitre || '',
              nomPrestataire: item.nomPrestataire || '',
              datePrestation: item.datePrestation ? new Date(item.datePrestation) : new Date(),
              typeHonoraire: item.typeHonoraire || 'FIXE',
              depense: parseFloat(item.depense) || 0,
              pec: parseFloat(item.pec) || 0,
              participationAdherent: parseFloat(item.participationAdherent) || 0,
              message: item.message || '',
              codeMessage: item.codeMessage || '',
              acuiteDroite: parseFloat(item.acuiteDroite) || 0,
              acuiteGauche: parseFloat(item.acuiteGauche) || 0,
              nombreCle: item.nombreCle || '',
              nbJourDepassement: parseInt(item.nbJourDepassement) || 0,
            },
          });
        }
      }

      this.logger.log(`Successfully created BS ${bulletinSoin.numBs} from MY TUNICLAIM`);
    } catch (error) {
      this.logger.error(`Failed to create BS ${extBsItem.numBs}: ${error.message}`);
      throw error;
    }
  }

  private calculateDueDate(dateCreation: string | Date, delaiReglement: number): Date {
    const baseDate = typeof dateCreation === 'string' ? new Date(dateCreation) : dateCreation;
    return new Date(baseDate.getTime() + delaiReglement * 24 * 60 * 60 * 1000);
  }
}
