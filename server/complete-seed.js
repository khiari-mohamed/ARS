const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting complete ARS database seeding...');

  try {
    // 1. Create Users with different roles
    console.log('👥 Creating users...');
    
    const users = await Promise.all([
      // Super Admin
      prisma.user.upsert({
        where: { email: 'admin@ars.tn' },
        update: {},
        create: {
          email: 'admin@ars.tn',
          password: await bcrypt.hash('admin123', 10),
          fullName: 'Super Administrateur',
          role: 'SUPER_ADMIN',
          active: true,
          capacity: 100
        }
      }),

      // Chef d'Équipes
      prisma.user.upsert({
        where: { email: 'chef1@ars.tn' },
        update: {},
        create: {
          email: 'chef1@ars.tn',
          password: await bcrypt.hash('chef123', 10),
          fullName: 'Ahmed Ben Ali',
          role: 'CHEF_EQUIPE',
          department: 'Santé',
          active: true,
          capacity: 50
        }
      }),

      prisma.user.upsert({
        where: { email: 'chef2@ars.tn' },
        update: {},
        create: {
          email: 'chef2@ars.tn',
          password: await bcrypt.hash('chef123', 10),
          fullName: 'Fatma Trabelsi',
          role: 'CHEF_EQUIPE',
          department: 'Finance',
          active: true,
          capacity: 30
        }
      }),

      // Gestionnaires Seniors
      prisma.user.upsert({
        where: { email: 'senior1@ars.tn' },
        update: {},
        create: {
          email: 'senior1@ars.tn',
          password: await bcrypt.hash('senior123', 10),
          fullName: 'Mohamed Gharbi',
          role: 'GESTIONNAIRE_SENIOR',
          department: 'Santé',
          active: true,
          capacity: 25
        }
      }),

      prisma.user.upsert({
        where: { email: 'senior2@ars.tn' },
        update: {},
        create: {
          email: 'senior2@ars.tn',
          password: await bcrypt.hash('senior123', 10),
          fullName: 'Leila Mansouri',
          role: 'GESTIONNAIRE_SENIOR',
          department: 'Santé',
          active: true,
          capacity: 25
        }
      }),

      // Gestionnaires
      prisma.user.upsert({
        where: { email: 'gest1@ars.tn' },
        update: {},
        create: {
          email: 'gest1@ars.tn',
          password: await bcrypt.hash('gest123', 10),
          fullName: 'Sami Bouaziz',
          role: 'GESTIONNAIRE',
          department: 'Santé',
          active: true,
          capacity: 20
        }
      }),

      prisma.user.upsert({
        where: { email: 'gest2@ars.tn' },
        update: {},
        create: {
          email: 'gest2@ars.tn',
          password: await bcrypt.hash('gest123', 10),
          fullName: 'Nadia Khelifi',
          role: 'GESTIONNAIRE',
          department: 'Santé',
          active: true,
          capacity: 20
        }
      }),

      prisma.user.upsert({
        where: { email: 'gest3@ars.tn' },
        update: {},
        create: {
          email: 'gest3@ars.tn',
          password: await bcrypt.hash('gest123', 10),
          fullName: 'Karim Jemli',
          role: 'GESTIONNAIRE',
          department: 'Santé',
          active: true,
          capacity: 20
        }
      }),

      // Finance Users
      prisma.user.upsert({
        where: { email: 'finance1@ars.tn' },
        update: {},
        create: {
          email: 'finance1@ars.tn',
          password: await bcrypt.hash('finance123', 10),
          fullName: 'Hedi Sassi',
          role: 'FINANCE',
          department: 'Finance',
          active: true,
          capacity: 30
        }
      }),

      // BO Users
      prisma.user.upsert({
        where: { email: 'bo1@ars.tn' },
        update: {},
        create: {
          email: 'bo1@ars.tn',
          password: await bcrypt.hash('bo123', 10),
          fullName: 'Rim Chaabane',
          role: 'BO',
          department: 'Bureau Ordre',
          active: true,
          capacity: 40
        }
      }),

      // Scan Team
      prisma.user.upsert({
        where: { email: 'scan1@ars.tn' },
        update: {},
        create: {
          email: 'scan1@ars.tn',
          password: await bcrypt.hash('scan123', 10),
          fullName: 'Youssef Mejri',
          role: 'SCAN_TEAM',
          department: 'Scan',
          active: true,
          capacity: 35
        }
      })
    ]);

    console.log(`✅ Created ${users.length} users`);

    // 2. Create Insurance Companies
    console.log('🏢 Creating insurance companies...');
    
    const compagnies = await Promise.all([
      prisma.compagnieAssurance.upsert({
        where: { code: 'COMAR' },
        update: {},
        create: {
          nom: 'COMAR Assurances',
          code: 'COMAR',
          adresse: 'Avenue Habib Bourguiba, Tunis',
          telephone: '71234567',
          email: 'contact@comar.com.tn',
          statut: 'ACTIF'
        }
      }),

      prisma.compagnieAssurance.upsert({
        where: { code: 'LLOYD' },
        update: {},
        create: {
          nom: 'Lloyd Tunisien',
          code: 'LLOYD',
          adresse: 'Rue de la Liberté, Tunis',
          telephone: '71345678',
          email: 'info@lloyd.tn',
          statut: 'ACTIF'
        }
      }),

      prisma.compagnieAssurance.upsert({
        where: { code: 'STAR' },
        update: {},
        create: {
          nom: 'STAR Assurances',
          code: 'STAR',
          adresse: 'Avenue Mohamed V, Tunis',
          telephone: '71456789',
          email: 'contact@star.tn',
          statut: 'ACTIF'
        }
      })
    ]);

    console.log(`✅ Created ${compagnies.length} insurance companies`);

    // 3. Create Clients
    console.log('🏛️ Creating clients...');
    
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { name: 'Ministère de la Santé' },
        update: {},
        create: {
          name: 'Ministère de la Santé',
          reglementDelay: 30,
          reclamationDelay: 15,
          address: 'Bab Saadoun, Tunis',
          email: 'sante@gov.tn',
          phone: '71567890',
          status: 'active',
          compagnieAssuranceId: compagnies[0].id,
          chargeCompteId: users[1].id // Chef1 as account manager
        }
      }),

      prisma.client.upsert({
        where: { name: 'CNSS Tunisie' },
        update: {},
        create: {
          name: 'CNSS Tunisie',
          reglementDelay: 45,
          reclamationDelay: 20,
          address: 'Avenue de la République, Tunis',
          email: 'cnss@cnss.tn',
          phone: '71678901',
          status: 'active',
          compagnieAssuranceId: compagnies[1].id,
          chargeCompteId: users[2].id // Chef2 as account manager
        }
      }),

      prisma.client.upsert({
        where: { name: 'Mutuelle Générale' },
        update: {},
        create: {
          name: 'Mutuelle Générale',
          reglementDelay: 25,
          reclamationDelay: 10,
          address: 'Rue Ibn Khaldoun, Tunis',
          email: 'contact@mutuelle.tn',
          phone: '71789012',
          status: 'active',
          compagnieAssuranceId: compagnies[2].id,
          chargeCompteId: users[3].id // Senior1 as account manager
        }
      })
    ]);

    console.log(`✅ Created ${clients.length} clients`);

    // 4. Create Contracts
    console.log('📋 Creating contracts...');
    
    const contracts = await Promise.all([
      prisma.contract.create({
        data: {
          clientId: clients[0].id,
          clientName: clients[0].name,
          codeAssure: 'SANTE2024',
          delaiReclamation: 15,
          delaiReglement: 30,
          documentPath: '/contracts/sante_2024.pdf',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          teamLeaderId: users[1].id, // Chef1
          assignedManagerId: users[1].id,
          signature: 'Contrat signé électroniquement',
          version: 1
        }
      }),

      prisma.contract.create({
        data: {
          clientId: clients[1].id,
          clientName: clients[1].name,
          codeAssure: 'CNSS2024',
          delaiReclamation: 20,
          delaiReglement: 45,
          documentPath: '/contracts/cnss_2024.pdf',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          teamLeaderId: users[2].id, // Chef2
          assignedManagerId: users[2].id,
          signature: 'Contrat signé électroniquement',
          version: 1
        }
      }),

      prisma.contract.create({
        data: {
          clientId: clients[2].id,
          clientName: clients[2].name,
          codeAssure: 'MUT2024',
          delaiReclamation: 10,
          delaiReglement: 25,
          documentPath: '/contracts/mutuelle_2024.pdf',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          teamLeaderId: users[3].id, // Senior1
          assignedManagerId: users[3].id,
          signature: 'Contrat signé électroniquement',
          version: 1
        }
      })
    ]);

    console.log(`✅ Created ${contracts.length} contracts`);

    // 5. Create Bordereaux with various statuses
    console.log('📄 Creating bordereaux...');
    
    const bordereaux = [];
    const statuses = ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT'];
    
    for (let i = 1; i <= 50; i++) {
      const clientIndex = (i - 1) % clients.length;
      const statusIndex = (i - 1) % statuses.length;
      const status = statuses[statusIndex];
      
      // Assign to different users based on status
      let assignedUserId = null;
      let teamId = null;
      let currentHandlerId = null;
      
      if (['ASSIGNE', 'EN_COURS', 'TRAITE'].includes(status)) {
        const gestionnaires = [users[4], users[5], users[6]]; // gest1, gest2, gest3
        assignedUserId = gestionnaires[(i - 1) % gestionnaires.length].id;
        currentHandlerId = assignedUserId;
        teamId = contracts[clientIndex].teamLeaderId;
      }

      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BDX-2025-${String(i).padStart(5, '0')}`,
          clientId: clients[clientIndex].id,
          contractId: contracts[clientIndex].id,
          dateReception: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          dateReceptionBO: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          delaiReglement: contracts[clientIndex].delaiReglement,
          statut: status,
          nombreBS: Math.floor(Math.random() * 20) + 1,
          assignedToUserId: assignedUserId,
          teamId: teamId,
          currentHandlerId: currentHandlerId,
          priority: Math.floor(Math.random() * 5) + 1,
          scanStatus: ['A_SCANNER', 'EN_ATTENTE'].includes(status) ? 'NON_SCANNE' : 'SCANNE',
          completionRate: ['TRAITE', 'PRET_VIREMENT'].includes(status) ? 100 : Math.floor(Math.random() * 80),
          ...(status === 'TRAITE' && { dateCloture: new Date() }),
          ...(status === 'SCAN_EN_COURS' && { dateDebutScan: new Date() }),
          ...(status === 'SCANNE' && { 
            dateDebutScan: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            dateFinScan: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }),
          ...(status === 'EN_COURS' && { dateReceptionSante: new Date() })
        }
      });
      
      bordereaux.push(bordereau);
    }

    console.log(`✅ Created ${bordereaux.length} bordereaux`);

    // 6. Create Documents for each Bordereau
    console.log('📎 Creating documents...');
    
    const documentTypes = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION', 'CONTRAT_AVENANT'];
    let documentCount = 0;

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const bordereau of bordereaux) {
      const numDocs = Math.floor(Math.random() * 5) + 1; // 1-5 documents per bordereau
      
      for (let j = 1; j <= numDocs; j++) {
        const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
        const fileName = `${bordereau.reference}_doc_${j}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Create a dummy PDF file
        const dummyContent = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF`;
        
        try {
          fs.writeFileSync(filePath, dummyContent);
        } catch (error) {
          console.warn(`Could not create file ${filePath}:`, error.message);
        }

        // Assign documents to gestionnaires if bordereau is assigned
        let assignedToUserId = null;
        if (bordereau.assignedToUserId && ['ASSIGNE', 'EN_COURS', 'TRAITE'].includes(bordereau.statut)) {
          assignedToUserId = bordereau.assignedToUserId;
        }

        const document = await prisma.document.create({
          data: {
            name: fileName,
            type: docType,
            path: `uploads/documents/${fileName}`,
            uploadedById: users[0].id, // Super admin as uploader
            bordereauId: bordereau.id,
            assignedToUserId: assignedToUserId,
            assignedByUserId: bordereau.teamId, // Assigned by team leader
            assignedAt: assignedToUserId ? new Date() : null,
            status: bordereau.statut === 'TRAITE' ? 'TRAITE' : 
                   ['ASSIGNE', 'EN_COURS'].includes(bordereau.statut) ? 'EN_COURS' : 'UPLOADED',
            priority: Math.floor(Math.random() * 5) + 1,
            ocrText: `Document ${docType} pour bordereau ${bordereau.reference}. Contenu OCR simulé.`,
            barcodeValues: [`BC${bordereau.reference}${j}`]
          }
        });

        documentCount++;
      }
    }

    console.log(`✅ Created ${documentCount} documents`);

    // 7. Create Bulletin de Soins
    console.log('🏥 Creating bulletin de soins...');
    
    let bsCount = 0;
    for (const bordereau of bordereaux) {
      for (let k = 1; k <= bordereau.nombreBS; k++) {
        const bs = await prisma.bulletinSoin.create({
          data: {
            bordereauId: bordereau.id,
            numBs: `BS-${bordereau.reference}-${String(k).padStart(3, '0')}`,
            etat: bordereau.statut === 'TRAITE' ? 'VALIDATED' : 
                  ['ASSIGNE', 'EN_COURS'].includes(bordereau.statut) ? 'IN_PROGRESS' : 'PENDING',
            ownerId: bordereau.assignedToUserId,
            processedById: bordereau.statut === 'TRAITE' ? bordereau.assignedToUserId : null,
            processedAt: bordereau.statut === 'TRAITE' ? new Date() : null,
            codeAssure: `ASS${Math.floor(Math.random() * 100000)}`,
            dateCreation: bordereau.dateReception,
            dateMaladie: new Date(bordereau.dateReception.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000),
            dateSoin: new Date(bordereau.dateReception.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
            lien: 'CONJOINT',
            nomAssure: `Patient ${k} ${bordereau.reference}`,
            nomBeneficiaire: `Bénéficiaire ${k}`,
            nomBordereau: bordereau.reference,
            nomPrestation: ['Consultation', 'Analyse', 'Radiographie', 'Chirurgie', 'Médicaments'][Math.floor(Math.random() * 5)],
            nomSociete: bordereau.client?.name || 'Société Test',
            observationGlobal: 'Traitement standard selon protocole',
            totalPec: Math.floor(Math.random() * 500) + 50,
            montant: Math.floor(Math.random() * 300) + 30,
            matricule: `MAT${Math.floor(Math.random() * 10000)}`,
            acte: 'CONSULTATION',
            priority: Math.floor(Math.random() * 3) + 1
          }
        });
        bsCount++;
      }
    }

    console.log(`✅ Created ${bsCount} bulletin de soins`);

    // 8. Create some Reclamations
    console.log('📞 Creating reclamations...');
    
    const reclamationTypes = ['DELAI_TRAITEMENT', 'DOCUMENT_MANQUANT', 'MONTANT_INCORRECT', 'AUTRE'];
    const reclamations = [];

    for (let i = 1; i <= 15; i++) {
      const clientIndex = (i - 1) % clients.length;
      const bordereauIndex = (i - 1) % Math.min(bordereaux.length, 15);
      
      const reclamation = await prisma.reclamation.create({
        data: {
          clientId: clients[clientIndex].id,
          bordereauId: bordereaux[bordereauIndex].id,
          type: reclamationTypes[Math.floor(Math.random() * reclamationTypes.length)],
          severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][Math.floor(Math.random() * 3)],
          description: `Réclamation ${i}: Problème concernant le traitement du dossier ${bordereaux[bordereauIndex].reference}`,
          createdById: users[0].id,
          assignedToId: users[Math.floor(Math.random() * 3) + 4].id, // Random gestionnaire
          contractId: contracts[clientIndex].id,
          department: 'Santé',
          priority: Math.floor(Math.random() * 5) + 1,
          typologie: 'STANDARD'
        }
      });
      
      reclamations.push(reclamation);
    }

    console.log(`✅ Created ${reclamations.length} reclamations`);

    // 9. Create some Virements for processed bordereaux
    console.log('💰 Creating virements...');
    
    const processedBordereaux = bordereaux.filter(b => b.statut === 'TRAITE');
    let virementCount = 0;

    for (const bordereau of processedBordereaux.slice(0, 10)) { // Create virements for first 10 processed
      const virement = await prisma.virement.create({
        data: {
          bordereauId: bordereau.id,
          montant: Math.floor(Math.random() * 5000) + 1000,
          referenceBancaire: `REF${Date.now()}${Math.floor(Math.random() * 1000)}`,
          dateDepot: new Date(),
          dateExecution: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          confirmed: Math.random() > 0.5,
          confirmedAt: Math.random() > 0.5 ? new Date() : null,
          confirmedById: Math.random() > 0.5 ? users[8].id : null, // Finance user
          priority: Math.floor(Math.random() * 3) + 1
        }
      });
      virementCount++;
    }

    console.log(`✅ Created ${virementCount} virements`);

    // 10. Create some Notifications
    console.log('🔔 Creating notifications...');
    
    let notificationCount = 0;
    for (const user of users.slice(0, 5)) { // Create notifications for first 5 users
      for (let i = 1; i <= 3; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: ['ASSIGNMENT', 'SLA_WARNING', 'SYSTEM_UPDATE'][Math.floor(Math.random() * 3)],
            title: `Notification ${i} pour ${user.fullName}`,
            message: `Message de notification ${i} concernant vos tâches en cours`,
            data: { priority: 'normal', source: 'system' },
            read: Math.random() > 0.5
          }
        });
        notificationCount++;
      }
    }

    console.log(`✅ Created ${notificationCount} notifications`);

    // 11. Create Action Logs for audit trail
    console.log('📋 Creating action logs...');
    
    let actionLogCount = 0;
    for (const bordereau of bordereaux.slice(0, 20)) { // Create logs for first 20 bordereaux
      await prisma.actionLog.create({
        data: {
          bordereauId: bordereau.id,
          action: 'CREATE_BORDEREAU',
          timestamp: bordereau.dateReception,
          details: {
            user: 'system',
            reference: bordereau.reference,
            client: bordereau.client?.name
          }
        }
      });
      
      if (bordereau.assignedToUserId) {
        await prisma.actionLog.create({
          data: {
            bordereauId: bordereau.id,
            action: 'ASSIGN_BORDEREAU',
            timestamp: new Date(bordereau.dateReception.getTime() + 60 * 60 * 1000),
            details: {
              assignedTo: bordereau.assignedToUserId,
              assignedBy: bordereau.teamId
            }
          }
        });
      }
      
      actionLogCount += bordereau.assignedToUserId ? 2 : 1;
    }

    console.log(`✅ Created ${actionLogCount} action logs`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏢 Insurance Companies: ${compagnies.length}`);
    console.log(`🏛️ Clients: ${clients.length}`);
    console.log(`📋 Contracts: ${contracts.length}`);
    console.log(`📄 Bordereaux: ${bordereaux.length}`);
    console.log(`📎 Documents: ${documentCount}`);
    console.log(`🏥 Bulletin de Soins: ${bsCount}`);
    console.log(`📞 Reclamations: ${reclamations.length}`);
    console.log(`💰 Virements: ${virementCount}`);
    console.log(`🔔 Notifications: ${notificationCount}`);
    console.log(`📋 Action Logs: ${actionLogCount}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('Super Admin: admin@ars.tn / admin123');
    console.log('Chef Équipe 1: chef1@ars.tn / chef123');
    console.log('Chef Équipe 2: chef2@ars.tn / chef123');
    console.log('Gestionnaire Senior 1: senior1@ars.tn / senior123');
    console.log('Gestionnaire Senior 2: senior2@ars.tn / senior123');
    console.log('Gestionnaire 1: gest1@ars.tn / gest123');
    console.log('Gestionnaire 2: gest2@ars.tn / gest123');
    console.log('Gestionnaire 3: gest3@ars.tn / gest123');
    console.log('Finance: finance1@ars.tn / finance123');
    console.log('BO: bo1@ars.tn / bo123');
    console.log('Scan: scan1@ars.tn / scan123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });