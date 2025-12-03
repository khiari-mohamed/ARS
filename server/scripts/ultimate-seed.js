const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting ULTIMATE ARS database seeding...\n');

  try {
    // Clean existing data
    console.log('🧹 Cleaning existing data...');
    const tables = [
      'DocumentAssignmentHistory', 'OVDocument', 'VirementItem', 'VirementHistorique',
      'SuiviVirement', 'OrdreVirement', 'Adherent', 'DonneurOrdre', 'BSLog',
      'ExpertiseInfo', 'BulletinSoinItem', 'BulletinSoin', 'Virement',
      'ReclamationHistory', 'Reclamation', 'Document', 'Courrier',
      'TraitementHistory', 'BordereauAuditLog', 'Bordereau', 'ContractHistory',
      'Contract', 'Client', 'CompagnieAssurance', 'Notification', 'ActionLog', 'User'
    ];
    
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (e) {
        console.log(`⚠️  Skipped ${table} (doesn't exist)`);
      }
    }
    console.log('✅ Cleanup complete\n');

    // 1. Create Users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Password123@', 10);

    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@ars.tn',
        password: hashedPassword,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        department: 'ADMINISTRATION',
        active: true,
        capacity: 100
      }
    });

    const chefSante = await prisma.user.create({
      data: {
        email: 'chef.sante@ars.tn',
        password: hashedPassword,
        fullName: 'Mohamed Ben Ali',
        role: 'CHEF_EQUIPE',
        department: 'SANTE',
        serviceType: 'SANTE',
        active: true,
        capacity: 50
      }
    });

    const chefFinance = await prisma.user.create({
      data: {
        email: 'chef.finance@ars.tn',
        password: hashedPassword,
        fullName: 'Fatma Trabelsi',
        role: 'CHEF_EQUIPE',
        department: 'FINANCE',
        serviceType: 'FINANCE',
        active: true,
        capacity: 30
      }
    });

    // Gestionnaires Seniors
    const seniorGest1 = await prisma.user.create({
      data: {
        email: 'senior1@ars.tn',
        password: hashedPassword,
        fullName: 'Mohamed Gharbi',
        role: 'GESTIONNAIRE_SENIOR',
        department: 'SANTE',
        serviceType: 'SANTE',
        active: true,
        capacity: 25
      }
    });

    const seniorGest2 = await prisma.user.create({
      data: {
        email: 'senior2@ars.tn',
        password: hashedPassword,
        fullName: 'Leila Mansouri',
        role: 'GESTIONNAIRE_SENIOR',
        department: 'SANTE',
        serviceType: 'SANTE',
        active: true,
        capacity: 25
      }
    });

    // Gestionnaires Santé (5)
    const gestionnaires = [];
    for (let i = 1; i <= 5; i++) {
      const gest = await prisma.user.create({
        data: {
          email: `gestionnaire${i}@ars.tn`,
          password: hashedPassword,
          fullName: `Gestionnaire Santé ${i}`,
          role: 'GESTIONNAIRE',
          department: 'SANTE',
          serviceType: 'SANTE',
          teamLeaderId: chefSante.id,
          active: true,
          capacity: 20
        }
      });
      gestionnaires.push(gest);
    }

    const bureauOrdre = await prisma.user.create({
      data: {
        email: 'bo@ars.tn',
        password: hashedPassword,
        fullName: 'Bureau Ordre',
        role: 'BO',
        department: 'BUREAU_ORDRE',
        active: true,
        capacity: 100
      }
    });

    const equipeScan = await prisma.user.create({
      data: {
        email: 'scan@ars.tn',
        password: hashedPassword,
        fullName: 'Équipe Scan',
        role: 'SCAN_TEAM',
        department: 'SCAN',
        active: true,
        capacity: 100
      }
    });

    const financeUser = await prisma.user.create({
      data: {
        email: 'finance@ars.tn',
        password: hashedPassword,
        fullName: 'Service Finance',
        role: 'FINANCE',
        department: 'FINANCE',
        serviceType: 'FINANCE',
        teamLeaderId: chefFinance.id,
        active: true,
        capacity: 50
      }
    });

    console.log(`✅ Created ${gestionnaires.length + 7} users\n`);

    // 2. Create Insurance Companies
    console.log('🏢 Creating insurance companies...');
    const compagnies = [];
    const compagnieNames = [
      { nom: 'STAR Assurances', code: 'STAR' },
      { nom: 'GAT Assurances', code: 'GAT' },
      { nom: 'COMAR', code: 'COMAR' },
      { nom: 'AMI Assurances', code: 'AMI' }
    ];

    for (const comp of compagnieNames) {
      const compagnie = await prisma.compagnieAssurance.create({
        data: {
          nom: comp.nom,
          code: comp.code,
          adresse: `${comp.code} Building, Avenue Habib Bourguiba, Tunis`,
          telephone: `+216 71 ${Math.floor(Math.random() * 900000 + 100000)}`,
          email: `contact@${comp.code.toLowerCase()}.tn`,
          statut: 'ACTIF'
        }
      });
      compagnies.push(compagnie);
    }
    console.log(`✅ Created ${compagnies.length} insurance companies\n`);

    // 3. Create Clients
    console.log('🏢 Creating clients...');
    const clients = [];
    for (let i = 0; i < compagnies.length; i++) {
      const client = await prisma.client.create({
        data: {
          name: `Client ${compagnies[i].nom}`,
          email: `client${i + 1}@ars.tn`,
          phone: `+216 ${20 + i} 123 456`,
          address: `${i + 1} Rue de la République, Tunis`,
          reglementDelay: 15 + (i * 5),
          reclamationDelay: 10 + (i * 2),
          status: 'active',
          chargeCompteId: i === 0 ? chefSante.id : i === 1 ? seniorGest1.id : seniorGest2.id,
          compagnieAssuranceId: compagnies[i].id
        }
      });
      clients.push(client);
    }
    console.log(`✅ Created ${clients.length} clients\n`);

    // 4. Create Contracts
    console.log('📄 Creating contracts...');
    const contracts = [];
    for (let i = 0; i < clients.length; i++) {
      const contract = await prisma.contract.create({
        data: {
          clientId: clients[i].id,
          clientName: clients[i].name,
          codeAssure: `CA${1000 + i}`,
          assignedManagerId: i === 0 ? chefSante.id : i === 1 ? seniorGest1.id : seniorGest2.id,
          teamLeaderId: i === 0 ? chefSante.id : i === 1 ? seniorGest1.id : seniorGest2.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-12-31'),
          delaiReclamation: clients[i].reclamationDelay,
          delaiReglement: clients[i].reglementDelay,
          documentPath: `/contracts/contract_${i + 1}.pdf`,
          version: 1
        }
      });
      contracts.push(contract);
    }
    console.log(`✅ Created ${contracts.length} contracts\n`);

    // 5. Create Adherents
    console.log('👤 Creating adherents...');
    const adherents = [];
    for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
      for (let i = 1; i <= 10; i++) {
        const adherent = await prisma.adherent.create({
          data: {
            matricule: `MAT${clientIdx}${String(i).padStart(4, '0')}`,
            nom: `Nom${i}`,
            prenom: `Prenom${i}`,
            clientId: clients[clientIdx].id,
            rib: `${20000000000000000000 + (clientIdx * 10000) + i}`,
            codeAssure: contracts[clientIdx].codeAssure,
            numeroContrat: `CNT${clientIdx}${i}`,
            statut: i <= 8 ? 'ACTIF' : 'INACTIF'
          }
        });
        adherents.push(adherent);
      }
    }
    console.log(`✅ Created ${adherents.length} adherents\n`);

    // 6. Create Bordereaux with all statuses
    console.log('📋 Creating bordereaux...');
    const bordereaux = [];
    const statuses = [
      'EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE',
      'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE',
      'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE',
      'CLOTURE', 'PAYE', 'REJETE', 'EN_DIFFICULTE'
    ];

    let bordereauCounter = 1;
    for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
      for (let statusIdx = 0; statusIdx < statuses.length; statusIdx++) {
        const status = statuses[statusIdx];
        const isAssigned = ['ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT'].includes(status);
        const assignedGest = isAssigned ? gestionnaires[statusIdx % gestionnaires.length] : null;

        const dateReception = new Date(Date.now() - (statusIdx * 2 * 24 * 60 * 60 * 1000));
        
        const bordereau = await prisma.bordereau.create({
          data: {
            reference: `BDX-2025-${String(bordereauCounter).padStart(5, '0')}`,
            clientId: clients[clientIdx].id,
            contractId: contracts[clientIdx].id,
            type: 'BULLETIN_SOIN',
            dateReception: dateReception,
            dateReceptionBO: status !== 'EN_ATTENTE' ? dateReception : null,
            dateDebutScan: ['SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'].includes(status) 
              ? new Date(dateReception.getTime() + 2 * 60 * 60 * 1000) : null,
            dateFinScan: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'].includes(status)
              ? new Date(dateReception.getTime() + 4 * 60 * 60 * 1000) : null,
            dateReceptionSante: ['ASSIGNE', 'EN_COURS', 'TRAITE'].includes(status)
              ? new Date(dateReception.getTime() + 6 * 60 * 60 * 1000) : null,
            dateCloture: ['CLOTURE', 'PAYE'].includes(status)
              ? new Date(dateReception.getTime() + 10 * 24 * 60 * 60 * 1000) : null,
            nombreBS: 10 + (statusIdx * 2),
            statut: status,
            delaiReglement: clients[clientIdx].reglementDelay,
            chargeCompteId: chefSante.id,
            teamId: chefSante.id,
            currentHandlerId: assignedGest?.id,
            assignedToUserId: assignedGest?.id,
            scanStatus: ['EN_ATTENTE', 'A_SCANNER'].includes(status) ? 'NON_SCANNE' 
              : status === 'SCAN_EN_COURS' ? 'SCAN_EN_COURS' : 'SCANNE',
            completionRate: status === 'TRAITE' ? 100 
              : status === 'EN_COURS' ? 60 
              : status === 'ASSIGNE' ? 20 : 0,
            priority: statusIdx % 3 === 0 ? 3 : statusIdx % 2 === 0 ? 2 : 1
          }
        });
        bordereaux.push(bordereau);
        bordereauCounter++;
      }
    }
    console.log(`✅ Created ${bordereaux.length} bordereaux\n`);

    // 7. Create Documents
    console.log('📄 Creating documents...');
    let docCounter = 0;
    for (const bordereau of bordereaux) {
      const numDocs = Math.floor(bordereau.nombreBS / 2);
      for (let i = 1; i <= numDocs; i++) {
        const docStatus = bordereau.statut === 'TRAITE' ? 'TRAITE'
          : bordereau.statut === 'EN_COURS' ? (i <= numDocs / 2 ? 'TRAITE' : 'EN_COURS')
          : bordereau.statut === 'REJETE' ? 'REJETE'
          : bordereau.statut === 'SCANNE' ? 'SCANNE' : 'UPLOADED';

        await prisma.document.create({
          data: {
            name: `BS_${bordereau.reference}_${i}.pdf`,
            type: 'BULLETIN_SOIN',
            path: `/uploads/bordereaux/${bordereau.reference}/bs_${i}.pdf`,
            uploadedById: equipeScan.id,
            bordereauId: bordereau.id,
            status: docStatus,
            assignedToUserId: bordereau.assignedToUserId,
            assignedByUserId: bordereau.assignedToUserId ? chefSante.id : null,
            assignedAt: bordereau.assignedToUserId ? new Date() : null,
            priority: bordereau.priority,
            slaApplicable: true,
            pageCount: 1 + Math.floor(Math.random() * 3)
          }
        });
        docCounter++;
      }
    }
    console.log(`✅ Created ${docCounter} documents\n`);

    // 8. Create Bulletin de Soins
    console.log('💊 Creating bulletin de soins...');
    let bsCounter = 0;
    for (const bordereau of bordereaux.slice(0, 20)) {
      for (let i = 1; i <= Math.min(bordereau.nombreBS, 5); i++) {
        const bs = await prisma.bulletinSoin.create({
          data: {
            bordereauId: bordereau.id,
            numBs: `BS-${bordereau.reference}-${String(i).padStart(3, '0')}`,
            etat: bordereau.statut === 'TRAITE' ? 'TRAITE' 
              : bordereau.statut === 'REJETE' ? 'REJETE' : 'EN_COURS',
            codeAssure: contracts[clients.findIndex(c => c.id === bordereau.clientId)].codeAssure,
            dateCreation: bordereau.dateReception,
            dateMaladie: new Date(bordereau.dateReception.getTime() - 5 * 24 * 60 * 60 * 1000),
            dateSoin: new Date(bordereau.dateReception.getTime() - 3 * 24 * 60 * 60 * 1000),
            lien: 'CONJOINT',
            nomAssure: `Assuré ${i}`,
            nomBeneficiaire: `Bénéficiaire ${i}`,
            nomBordereau: bordereau.reference,
            nomPrestation: 'Consultation médicale',
            nomSociete: clients[clients.findIndex(c => c.id === bordereau.clientId)].name,
            observationGlobal: 'RAS',
            totalPec: 50 + (i * 10),
            montant: 50 + (i * 10),
            ownerId: bordereau.assignedToUserId,
            processedById: bordereau.statut === 'TRAITE' ? bordereau.assignedToUserId : null,
            processedAt: bordereau.statut === 'TRAITE' ? new Date() : null,
            priority: bordereau.priority
          }
        });
        bsCounter++;

        await prisma.bulletinSoinItem.create({
          data: {
            bulletinSoinId: bs.id,
            nomProduit: 'Consultation générale',
            quantite: 1,
            commentaire: 'Consultation standard',
            nomChapitre: 'Soins médicaux',
            nomPrestataire: 'Dr. Médecin',
            datePrestation: bs.dateSoin,
            typeHonoraire: 'CONSULTATION',
            depense: bs.montant,
            pec: bs.totalPec,
            participationAdherent: bs.montant - bs.totalPec,
            message: 'Remboursement accepté',
            codeMessage: 'OK',
            acuiteDroite: 10,
            acuiteGauche: 10,
            nombreCle: '001',
            nbJourDepassement: 0
          }
        });
      }
    }
    console.log(`✅ Created ${bsCounter} bulletin de soins\n`);

    // 9. Create Donneur d'Ordre
    console.log('🏦 Creating donneur d\'ordre...');
    const donneurOrdre = await prisma.donneurOrdre.create({
      data: {
        nom: 'ARS TUNISIE',
        rib: '08000000123456789012',
        banque: 'Banque de Tunisie',
        agence: 'Agence Centrale Tunis',
        address: 'Avenue Habib Bourguiba, Tunis',
        structureTxt: 'STRUCTURE_1',
        formatTxtType: 'STRUCTURE_1',
        statut: 'ACTIF'
      }
    });
    console.log('✅ Created donneur d\'ordre\n');

    // 10. Create Ordres de Virement
    console.log('💰 Creating ordres de virement...');
    const traiteBordereaux = bordereaux.filter(b => b.statut === 'TRAITE');
    let ovCounter = 0;
    
    for (const bordereau of traiteBordereaux.slice(0, 10)) {
      const clientAdherents = adherents.filter(a => a.clientId === bordereau.clientId && a.statut === 'ACTIF');
      const selectedAdherents = clientAdherents.slice(0, 5);
      
      const montantTotal = selectedAdherents.reduce((sum, _) => sum + (100 + Math.random() * 400), 0);

      const ov = await prisma.ordreVirement.create({
        data: {
          reference: `OV-2025-${String(ovCounter + 1).padStart(5, '0')}`,
          donneurOrdreId: donneurOrdre.id,
          bordereauId: bordereau.id,
          dateCreation: new Date(),
          utilisateurSante: chefSante.email,
          utilisateurFinance: financeUser.email,
          etatVirement: ovCounter % 3 === 0 ? 'EXECUTE' 
            : ovCounter % 3 === 1 ? 'EN_COURS_EXECUTION' : 'NON_EXECUTE',
          montantTotal: montantTotal,
          nombreAdherents: selectedAdherents.length,
          fichierPdf: `/virements/ov_${ovCounter + 1}.pdf`,
          fichierTxt: `/virements/ov_${ovCounter + 1}.txt`,
          validationStatus: 'VALIDE',
          validatedBy: chefFinance.id,
          validatedAt: new Date()
        }
      });

      for (const adherent of selectedAdherents) {
        await prisma.virementItem.create({
          data: {
            ordreVirementId: ov.id,
            adherentId: adherent.id,
            montant: 100 + Math.random() * 400,
            statut: 'VALIDE'
          }
        });
      }

      await prisma.virement.create({
        data: {
          bordereauId: bordereau.id,
          montant: montantTotal,
          referenceBancaire: ov.reference,
          dateDepot: new Date(),
          dateExecution: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          confirmed: ov.etatVirement === 'EXECUTE',
          confirmedById: ov.etatVirement === 'EXECUTE' ? financeUser.id : null,
          confirmedAt: ov.etatVirement === 'EXECUTE' ? new Date() : null,
          priority: 1
        }
      });

      ovCounter++;
    }
    console.log(`✅ Created ${ovCounter} ordres de virement\n`);

    // 11. Create Reclamations
    console.log('📢 Creating reclamations...');
    const reclamationTypes = ['DELAI', 'MONTANT', 'DOCUMENT_MANQUANT', 'ERREUR_TRAITEMENT'];
    const severities = ['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];
    const reclamationStatuses = ['OUVERTE', 'EN_COURS', 'RESOLUE', 'FERMEE'];

    for (let i = 0; i < 15; i++) {
      const bordereau = bordereaux[i % bordereaux.length];
      await prisma.reclamation.create({
        data: {
          clientId: bordereau.clientId,
          bordereauId: bordereau.id,
          contractId: bordereau.contractId,
          type: reclamationTypes[i % reclamationTypes.length],
          severity: severities[i % severities.length],
          status: reclamationStatuses[i % reclamationStatuses.length],
          description: `Réclamation ${i + 1} concernant le bordereau ${bordereau.reference}`,
          assignedToId: gestionnaires[i % gestionnaires.length].id,
          createdById: chefSante.id,
          priority: (i % 3) + 1,
          typologie: 'OPERATIONNELLE',
          conformite: i % 2 === 0 ? 'CONFORME' : 'NON_CONFORME'
        }
      });
    }
    console.log('✅ Created 15 reclamations\n');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ULTIMATE DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${gestionnaires.length + 7} (1 Super Admin, 2 Chefs, 2 Seniors, ${gestionnaires.length} Gestionnaires, 3 Services)`);
    console.log(`   🏢 Insurance Companies: ${compagnies.length}`);
    console.log(`   🏢 Clients: ${clients.length}`);
    console.log(`   📄 Contracts: ${contracts.length}`);
    console.log(`   👤 Adherents: ${adherents.length}`);
    console.log(`   📋 Bordereaux: ${bordereaux.length} (all statuses)`);
    console.log(`   📄 Documents: ${docCounter}`);
    console.log(`   💊 Bulletin de Soins: ${bsCounter}`);
    console.log(`   💰 Ordres de Virement: ${ovCounter}`);
    console.log(`   📢 Réclamations: 15`);
    console.log('\n🔐 Login Credentials (Password: Password123@):');
    console.log('   Super Admin: admin@ars.tn');
    console.log('   Chef Santé: chef.sante@ars.tn');
    console.log('   Chef Finance: chef.finance@ars.tn');
    console.log('   Gestionnaire Senior 1: senior1@ars.tn');
    console.log('   Gestionnaire Senior 2: senior2@ars.tn');
    console.log('   Gestionnaire 1-5: gestionnaire1@ars.tn ... gestionnaire5@ars.tn');
    console.log('   Bureau Ordre: bo@ars.tn');
    console.log('   Scan: scan@ars.tn');
    console.log('   Finance: finance@ars.tn');
    console.log('\n🚀 Application ready for testing!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
