import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';

@Injectable()
export class OutlookIntegrationService {
  private readonly logger = new Logger(OutlookIntegrationService.name);
  
  private readonly MONITORED_EMAILS = [
    'reclamations@myinsurance.tn',
    'digihealthservicesandsolution@gmail.com',
    'noreply@arstunisia.com'
  ];

  constructor(private prisma: PrismaService) {}

  async readEmailsAndCreateReclamations() {
    // Skip if email credentials not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return;
    }

    try {
      for (const emailAddress of this.MONITORED_EMAILS) {
        try {
          const emails = await this.fetchEmailsFromOutlook(emailAddress);
          if (emails.length > 0) {
            this.logger.log(`Found ${emails.length} emails from ${emailAddress}`);
            for (const email of emails) {
              await this.processEmailToReclamation(email, emailAddress);
            }
          }
        } catch (error) {
          // Silently skip errors
        }
      }
    } catch (error) {
      // Silently skip errors
    }
  }

  private async fetchEmailsFromOutlook(emailAddress: string): Promise<any[]> {
    // Skip email fetching if credentials not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASS || '',
        host: process.env.SMTP_HOST || 'outlook.office365.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 5000,
        authTimeout: 5000
      });

      const emails: any[] = [];
      let connectionTimeout: NodeJS.Timeout;

      // Set overall timeout
      connectionTimeout = setTimeout(() => {
        imap.end();
        resolve([]);
      }, 10000);

      imap.once('ready', () => {
        clearTimeout(connectionTimeout);
        imap.openBox('INBOX', true, (err) => {
          if (err) {
            imap.end();
            return resolve([]);
          }

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          imap.search([
            ['FROM', emailAddress],
            ['SINCE', yesterday]
          ], (err, results) => {
            if (err) {
              imap.end();
              return resolve([]);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            const fetch = imap.fetch(results.slice(0, 50), {
              bodies: '',
              struct: true
            });

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream as any, (err, parsed) => {
                  if (err) return;

                  emails.push({
                    id: parsed.messageId,
                    subject: parsed.subject,
                    body: { content: parsed.text || parsed.html },
                    from: { emailAddress: { address: parsed.from?.value?.[0]?.address } },
                    receivedDateTime: parsed.date
                  });
                });
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });
      });

      imap.once('error', (err) => {
        clearTimeout(connectionTimeout);
        imap.end();
        resolve([]);
      });

      imap.connect();
    });
  }

  private async processEmailToReclamation(email: any, fromAddress: string) {
    try {
      // Extract company name from email content
      const companyName = this.extractCompanyName(email.subject || '', email.body?.content || '', fromAddress);
      
      // Find client by company name
      const client = await this.prisma.client.findFirst({
        where: {
          name: {
            contains: companyName,
            mode: 'insensitive'
          }
        }
      });

      if (!client) {
        this.logger.warn(`No client found for company: ${companyName}`);
        return;
      }

      // Find chef d'équipe for this client
      if (!client.chargeCompteId) {
        this.logger.warn(`No chef d'équipe assigned to client: ${client.name}`);
        return;
      }

      const chefEquipe = await this.prisma.user.findUnique({
        where: {
          id: client.chargeCompteId
        }
      });

      if (!chefEquipe) {
        this.logger.error(`Chef d'équipe not found for client: ${client.name}`);
        return;
      }

      // Create reclamation
      const reclamation = await this.prisma.reclamation.create({
        data: {
          clientId: client.id,
          type: 'EMAIL',
          severity: 'MOYENNE',
          status: 'OPEN',
          description: `Email reçu: ${email.subject}\n\n${email.body.content}`,
          department: 'RECLAMATIONS',
          assignedToId: chefEquipe.id,
          createdById: chefEquipe.id,
          evidencePath: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });

      // Create history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: reclamation.id,
          userId: chefEquipe.id,
          action: 'EMAIL_IMPORT',
          toStatus: 'OPEN',
          description: `Réclamation créée depuis email de ${email.from?.emailAddress?.address || fromAddress}`
        }
      });

      this.logger.log(`Created reclamation ${reclamation.id} from email for client ${client.name}`);
    } catch (error) {
      this.logger.error('Error processing email to reclamation:', error);
    }
  }

  private extractCompanyName(subject: string, body: string, fromAddress: string): string {
    // Extract company name from email content
    const text = `${subject} ${body}`.toLowerCase();
    
    // Common patterns to identify company names
    const patterns = [
      /société\s+([a-zA-Z\s]+)/i,
      /company\s+([a-zA-Z\s]+)/i,
      /assurance\s+([a-zA-Z\s]+)/i,
      /mutuelle\s+([a-zA-Z\s]+)/i,
      /client[:\s]+([a-zA-Z\s]+)/i,
      /de la part de[:\s]+([a-zA-Z\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: extract from sender domain or use a default based on sender
    const domain = fromAddress.split('@')[1];
    if (domain.includes('myinsurance')) return 'MyInsurance';
    if (domain.includes('arstunisia')) return 'ARS Tunisia';
    return 'Unknown Company';
  }
}