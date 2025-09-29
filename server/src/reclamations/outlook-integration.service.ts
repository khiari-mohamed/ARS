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
    try {
      // Read emails from monitored addresses
      for (const emailAddress of this.MONITORED_EMAILS) {
        try {
          const emails = await this.fetchEmailsFromOutlook(emailAddress);
          this.logger.log(`Found ${emails.length} emails from ${emailAddress}`);
          
          for (const email of emails) {
            await this.processEmailToReclamation(email, emailAddress);
          }
        } catch (error) {
          this.logger.error(`Error processing emails from ${emailAddress}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error reading emails:', error);
    }
  }

  private async fetchEmailsFromOutlook(emailAddress: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASS || '',
        host: process.env.SMTP_HOST || 'outlook.office365.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: any[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err) => {
          if (err) {
            this.logger.error('Error opening inbox:', err);
            return reject(err);
          }

          // Search for emails from monitored addresses in last 24 hours
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          imap.search([
            ['FROM', emailAddress],
            ['SINCE', yesterday]
          ], (err, results) => {
            if (err) {
              this.logger.error('Error searching emails:', err);
              return reject(err);
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
                  if (err) {
                    this.logger.error('Error parsing email:', err);
                    return;
                  }

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
        this.logger.error('IMAP connection error:', err);
        reject(err);
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