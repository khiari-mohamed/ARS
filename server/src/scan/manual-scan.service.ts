import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from '../workflow/workflow-notifications.service';

export interface ManualScanDto {
  bordereauId: string;
  files: Express.Multer.File[];
  userId: string;
  notes?: string;
  fileTypes?: string[];
}

@Injectable()
export class ManualScanService {
  private readonly logger = new Logger(ManualScanService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async getScannableQueue(userId: string) {
    // Get bordereaux ready for scanning (A_SCANNER status)
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        statut: 'A_SCANNER',
        archived: false
      },
      include: {
        client: { select: { name: true } },
        contract: { 
          select: { 
            delaiReglement: true,
            delaiReclamation: true 
          } 
        },
        documents: {
          select: { 
            id: true, 
            name: true, 
            type: true, 
            status: true 
          }
        }
      },
      orderBy: { dateReception: 'asc' }
    });

    return bordereaux.map(bordereau => ({
      id: bordereau.id,
      reference: bordereau.reference,
      clientName: bordereau.client?.name || 'Unknown',
      dateReception: bordereau.dateReception,
      nombreBS: bordereau.nombreBS,
      delaiReglement: bordereau.delaiReglement,
      documentsCount: bordereau.documents.length,
      canScan: true,
      priority: this.calculatePriority(bordereau)
    }));
  }

  async startManualScan(bordereauId: string, userId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Allow multiple scans for SCAN_EN_COURS status
    if (bordereau.statut !== 'A_SCANNER' && bordereau.statut !== 'SCAN_EN_COURS') {
      throw new BadRequestException(`Bordereau status is ${bordereau.statut}, expected A_SCANNER or SCAN_EN_COURS`);
    }

    // Update status to scanning
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'SCAN_EN_COURS',
        dateDebutScan: new Date(),
        currentHandlerId: userId,
        documentStatus: 'NORMAL' // Ensure it's not marked as returned
      }
    });

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_SCAN_STARTED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          clientName: bordereau.client?.name
        }
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      message: 'Manual scan started. You can now upload documents.'
    };
  }

  async uploadScanDocuments(dto: ManualScanDto) {
    const { bordereauId, files, userId, notes, fileTypes } = dto;

    console.log('🔍 DEBUG SERVICE: uploadScanDocuments called');
    console.log('📄 Files count:', files.length);
    console.log('🏷️ FileTypes received:', fileTypes);
    console.log('🏷️ FileTypes type:', typeof fileTypes);
    console.log('🏷️ FileTypes is array:', Array.isArray(fileTypes));

    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Allow uploads for both A_SCANNER and SCAN_EN_COURS statuses
    if (bordereau.statut !== 'A_SCANNER' && bordereau.statut !== 'SCAN_EN_COURS') {
      throw new BadRequestException(`Cannot upload documents. Bordereau status is ${bordereau.statut}, expected A_SCANNER or SCAN_EN_COURS`);
    }

    // Auto-transition A_SCANNER to SCAN_EN_COURS when uploading
    if (bordereau.statut === 'A_SCANNER') {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'SCAN_EN_COURS',
          dateDebutScan: new Date(),
          currentHandlerId: userId,
          documentStatus: 'NORMAL' // Ensure it's not marked as returned
        }
      });
    }

    const uploadedDocuments: Array<{id: string; name: string; type: string; size: number}> = [];
    const errors: Array<{fileName: string; error: string}> = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
          errors.push({
            fileName: file.originalname,
            error: validation.error || 'Unknown validation error'
          });
          continue;
        }

        // Save file to disk
        const filePath = await this.saveFile(file, bordereauId);

        // Get document type from fileTypes array or fallback to auto-detection
        const providedType = fileTypes && fileTypes[i] ? fileTypes[i] : null;
        console.log(`📄 File ${i}: ${file.originalname}`);
        console.log(`🏷️ Provided type: ${providedType}`);
        
        const documentType = providedType
          ? this.mapToDocumentType(providedType)
          : this.mapToDocumentType(this.getDocumentType(file.originalname));
        
        console.log(`✅ Final mapped type: ${documentType}`);

        // Create document record
        const document = await this.prisma.document.create({
          data: {
            name: file.originalname,
            type: documentType,
            path: filePath,
            uploadedById: userId,
            bordereauId,
            status: 'UPLOADED',
            hash: this.generateFileHash(file.buffer)
          }
        });

        uploadedDocuments.push({
          id: document.id,
          name: document.name,
          type: document.type,
          size: file.size
        });

      } catch (error: any) {
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    // Log upload action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_SCAN_UPLOAD',
        details: {
          bordereauId,
          reference: bordereau.reference,
          uploadedCount: uploadedDocuments.length,
          errorCount: errors.length,
          notes
        }
      }
    });

    return {
      success: uploadedDocuments.length > 0,
      uploadedDocuments,
      errors,
      message: `${uploadedDocuments.length} documents uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  }

  async uploadAdditionalDocuments(dto: ManualScanDto) {
    const { bordereauId, files, userId, notes, fileTypes } = dto;

    console.log('🔍 DEBUG SERVICE: uploadAdditionalDocuments called');
    console.log('📄 Files count:', files.length);
    console.log('🏷️ FileTypes received:', fileTypes);
    console.log('🏷️ FileTypes type:', typeof fileTypes);
    console.log('🏷️ FileTypes is array:', Array.isArray(fileTypes));

    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    console.log('📊 Bordereau status:', bordereau.statut);

    if (bordereau.statut !== 'SCAN_EN_COURS') {
      throw new BadRequestException(`Cannot upload additional documents. Bordereau status is ${bordereau.statut}, expected SCAN_EN_COURS`);
    }

    const uploadedDocuments: Array<{id: string; name: string; type: string; size: number}> = [];
    const errors: Array<{fileName: string; error: string}> = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
          errors.push({
            fileName: file.originalname,
            error: validation.error || 'Unknown validation error'
          });
          continue;
        }

        // Save file to disk
        const filePath = await this.saveFile(file, bordereauId);

        // Get document type from fileTypes array or fallback to auto-detection
        const providedType = fileTypes && fileTypes[i] ? fileTypes[i] : null;
        console.log(`📄 File ${i}: ${file.originalname}`);
        console.log(`🏷️ Provided type: ${providedType}`);
        
        const documentType = providedType
          ? this.mapToDocumentType(providedType)
          : this.mapToDocumentType(this.getDocumentType(file.originalname));
        
        console.log(`✅ Final mapped type: ${documentType}`);

        // Create document record
        const document = await this.prisma.document.create({
          data: {
            name: file.originalname,
            type: documentType,
            path: filePath,
            uploadedById: userId,
            bordereauId,
            status: 'UPLOADED',
            hash: this.generateFileHash(file.buffer)
          }
        });

        uploadedDocuments.push({
          id: document.id,
          name: document.name,
          type: document.type,
          size: file.size
        });

      } catch (error: any) {
        console.error(`❌ Error uploading ${file.originalname}:`, error.message, error.stack);
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    console.log(`📊 Upload result: ${uploadedDocuments.length} success, ${errors.length} failed`);

    // Log additional upload action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_SCAN_ADDITIONAL_UPLOAD',
        details: {
          bordereauId,
          reference: bordereau.reference,
          uploadedCount: uploadedDocuments.length,
          errorCount: errors.length,
          notes,
          additionalScan: true
        }
      }
    });

    return {
      success: uploadedDocuments.length > 0,
      uploadedDocuments,
      errors,
      message: `${uploadedDocuments.length} additional documents uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  }

  async validateAndCompleteScan(bordereauId: string, userId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: {
          include: {
            gestionnaires: {
              where: { role: 'CHEF_EQUIPE' },
              select: { id: true, fullName: true }
            }
          }
        },
        documents: true
      }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (bordereau.statut !== 'SCAN_EN_COURS') {
      throw new BadRequestException(`Cannot validate scan. Bordereau status is ${bordereau.statut}`);
    }

    if (bordereau.documents.length === 0) {
      throw new BadRequestException('Cannot validate scan without documents. Please upload documents first.');
    }

    // Complete scanning
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'SCANNE',
        dateFinScan: new Date(),
        documentStatus: 'NORMAL' // Ensure it's not marked as returned
      }
    });

    // Auto-assign to chef d'équipe if available
    let finalStatus = 'SCANNE';
    let assignedChef: {id: string; fullName: string} | null = null;

    if (bordereau.client?.gestionnaires?.length > 0) {
      const chef = bordereau.client.gestionnaires[0];
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'A_AFFECTER',
          currentHandlerId: chef.id
        }
      });
      finalStatus = 'A_AFFECTER';
      assignedChef = chef;
    }

    // Update document statuses
    await this.prisma.document.updateMany({
      where: { bordereauId },
      data: { status: 'TRAITE' }
    });

    // Send workflow notification
    await this.workflowNotifications.notifyWorkflowTransition(
      bordereauId,
      'SCAN_EN_COURS',
      finalStatus,
      userId
    );

    // Log completion
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_SCAN_COMPLETED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          documentsCount: bordereau.documents.length,
          finalStatus,
          assignedChef: assignedChef?.fullName
        }
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      finalStatus,
      assignedChef,
      message: `Scan validated successfully. ${assignedChef ? `Assigned to ${assignedChef.fullName}` : 'Ready for assignment'}`
    };
  }

  async cancelScan(bordereauId: string, userId: string, reason?: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (bordereau.statut !== 'SCAN_EN_COURS') {
      throw new BadRequestException(`Cannot cancel scan. Bordereau status is ${bordereau.statut}`);
    }

    // Revert to A_SCANNER status
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'A_SCANNER',
        dateDebutScan: null,
        currentHandlerId: null
      }
    });

    // Remove uploaded documents
    await this.prisma.document.deleteMany({
      where: { bordereauId }
    });

    // Log cancellation
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'MANUAL_SCAN_CANCELLED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          reason
        }
      }
    });

    return {
      success: true,
      message: 'Scan cancelled. Bordereau returned to scan queue.'
    };
  }

  private validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Unsupported file type. Only PDF, JPEG, PNG, and TIFF are allowed.' };
    }

    // Check filename
    if (!file.originalname || file.originalname.length < 3) {
      return { valid: false, error: 'Invalid filename' };
    }

    return { valid: true };
  }

  private async saveFile(file: Express.Multer.File, bordereauId: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'manual-scan', bordereauId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const fileName = `${timestamp}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative path
    return path.relative(process.cwd(), filePath);
  }

  private getDocumentType(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.includes('bs') || name.includes('bulletin')) return 'BS';
    if (name.includes('facture')) return 'FACTURE';
    if (name.includes('contrat')) return 'CONTRAT';
    if (name.includes('reclamation')) return 'RECLAMATION';
    return 'DOCUMENT';
  }

  private generateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private calculatePriority(bordereau: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const daysSinceReception = Math.floor(
      (Date.now() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const slaLimit = bordereau.delaiReglement || 30;
    
    if (daysSinceReception > slaLimit * 0.8) return 'HIGH';
    if (daysSinceReception > slaLimit * 0.5) return 'MEDIUM';
    return 'LOW';
  }

  async getScanStatistics(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      queueCount,
      inProgressCount,
      completedToday,
      userScansToday
    ] = await Promise.all([
      this.prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: today }
        }
      }),
      this.prisma.auditLog.count({
        where: {
          userId,
          action: 'MANUAL_SCAN_COMPLETED',
          timestamp: { gte: today }
        }
      })
    ]);

    return {
      queueCount,
      inProgressCount,
      completedToday,
      userScansToday,
      efficiency: userScansToday > 0 ? Math.round((userScansToday / (userScansToday + inProgressCount)) * 100) : 0
    };
  }

  // NEW: Validate multiple scan capability
  async validateMultipleScanCapability(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        documents: true
      }
    });

    if (!bordereau) {
      return {
        canScanMultiple: false,
        currentScanCount: 0,
        maxScansAllowed: 5,
        isValid: false,
        message: 'Bordereau not found'
      };
    }

    // Count scan operations from audit logs
    const scanLogs = await this.prisma.auditLog.count({
      where: {
        details: {
          path: ['bordereauId'],
          equals: bordereauId
        },
        action: { in: ['MANUAL_SCAN_UPLOAD', 'MANUAL_SCAN_ADDITIONAL_UPLOAD'] }
      }
    });

    const currentScanCount = scanLogs;
    const maxScansAllowed = 5; // Business rule: max 5 scans per bordereau
    const canScanMultiple = bordereau.statut === 'SCAN_EN_COURS' && currentScanCount < maxScansAllowed;
    const isValid = ['A_SCANNER', 'SCAN_EN_COURS'].includes(bordereau.statut);

    let message = 'Scan autorisé';
    if (!isValid) {
      message = `Statut invalide: ${bordereau.statut}`;
    } else if (currentScanCount >= maxScansAllowed) {
      message = 'Limite de scans atteinte';
    } else if (bordereau.statut === 'SCAN_EN_COURS') {
      message = `Scan supplémentaire #${currentScanCount + 1} autorisé`;
    }

    return {
      canScanMultiple,
      currentScanCount,
      maxScansAllowed,
      isValid,
      message,
      documentsCount: bordereau.documents.length
    };
  }

  // NEW: Map old document types to new enum
  private mapToDocumentType(oldType?: string): any {
    if (!oldType) return 'BULLETIN_SOIN';
    
    console.log(`🔄 Mapping type: ${oldType}`);
    
    const mapping: Record<string, string> = {
      'BS': 'BULLETIN_SOIN',
      'BULLETIN_SOIN': 'BULLETIN_SOIN',
      'COMPLEMENT_INFORMATION': 'COMPLEMENT_INFORMATION',
      'ADHESION': 'ADHESION',
      'RECLAMATION': 'RECLAMATION',
      'CONTRAT_AVENANT': 'CONTRAT_AVENANT',
      'DEMANDE_RESILIATION': 'DEMANDE_RESILIATION',
      'CONVENTION_TIERS_PAYANT': 'CONVENTION_TIERS_PAYANT',
      'FACTURE': 'COMPLEMENT_INFORMATION',
      'CONTRAT': 'CONTRAT_AVENANT',
      'DOCUMENT': 'BULLETIN_SOIN'
    };
    
    const result = mapping[oldType.toUpperCase()] || 'BULLETIN_SOIN';
    console.log(`✅ Mapped to: ${result}`);
    return result;
  }
}