// Generate Fake Finance Data for Testing
// This script creates test data for the finance module based on existing bordereaux and contracts

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fake data generators
const generateRIB = () => {
  // Generate 20-digit RIB
  const banks = ['08', '04', '10', '07', '11']; // BTK, ATTIJARI, UIB, BNA, STB
  const bank = banks[Math.floor(Math.random() * banks.length)];
  const rest = Math.floor(Math.random() * 1e17).toString().padStart(18, '0');
  return bank + rest;
};

const generateMatricule = (clientCode) => {
  return `${clientCode}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

const generateContractNumber = () => {
  // Generate contract number like 70240017
  return `702${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
};

const firstNames = ['Mohamed', 'Ahmed', 'Fatma', 'Amira', 'Youssef', 'Salma', 'Karim', 'Nadia', 'Mehdi', 'Leila'];
const lastNames = ['Ben Ali', 'Trabelsi', 'Bouazizi', 'Hammami', 'Gharbi', 'Jebali', 'Karray', 'Mejri', 'Nasri', 'Oueslati'];

const assurances = ['PGH & FILIALES', 'ASTREE ASSURANCES', 'COMAR ASSURANCES', 'CARTE ASSURANCES', 'GAT ASSURANCES'];

async function main() {
  console.log('🚀 Starting Finance Module Test Data Generation...\n');

  // Step 0: Clean existing finance data
  console.log('🧹 Step 0: Cleaning existing finance data...');
  try {
    // Delete in correct order (respecting foreign key constraints)
    const deletedHistory = await prisma.virementHistory.deleteMany({});
    const deletedSageTxt = await prisma.sageTxtGeneration.deleteMany({});
    const deletedSageInt = await prisma.sageIntegration.deleteMany({});
    const deletedOVDocs = await prisma.oVDocument.deleteMany({});
    const deletedHistorique = await prisma.virementHistorique.deleteMany({});
    const deletedSuivi = await prisma.suiviVirement.deleteMany({});
    const deletedItems = await prisma.virementItem.deleteMany({});
    const deletedOVs = await prisma.ordreVirement.deleteMany({});
    const deletedAdherents = await prisma.adherent.deleteMany({});
    const deletedDonneurs = await prisma.donneurOrdre.deleteMany({});
    
    console.log('   ✓ Deleted:', {
      virementHistory: deletedHistory.count,
      sageTxt: deletedSageTxt.count,
      sageIntegration: deletedSageInt.count,
      ovDocuments: deletedOVDocs.count,
      virementHistorique: deletedHistorique.count,
      suiviVirement: deletedSuivi.count,
      virementItems: deletedItems.count,
      ordreVirements: deletedOVs.count,
      adherents: deletedAdherents.count,
      donneurOrdre: deletedDonneurs.count
    });
    console.log('   ✓ All finance data deleted successfully\n');
  } catch (error) {
    console.error('   ⚠️ Error cleaning data:', error.message);
    console.log('   Continuing anyway...\n');
  }

  // Step 1: Check existing data
  console.log('📊 Step 1: Checking existing database...');
  const clients = await prisma.client.findMany({
    include: {
      contracts: true,
      bordereaux: {
        take: 5,
        where: {
          statut: {
            in: ['TRAITE', 'PRET_VIREMENT']
          }
        }
      }
    }
  });

  console.log(`   Found ${clients.length} clients`);
  console.log(`   Found ${clients.reduce((sum, c) => sum + c.contracts.length, 0)} contracts`);
  console.log(`   Found ${clients.reduce((sum, c) => sum + c.bordereaux.length, 0)} bordereaux ready for virement\n`);

  if (clients.length === 0) {
    console.log('❌ No clients found in database. Please seed clients first.');
    return;
  }

  // Step 2: Create or update Donneurs d'Ordre
  console.log('📝 Step 2: Creating Donneurs d\'Ordre (Bank Accounts)...');
  const donneurs = [
    {
      nom: 'Virement ATTIJARI 411',
      rib: '04001000123456789012',
      banque: 'ATTIJARI BANK',
      agence: 'Tunis Centre',
      structureTxt: 'ATTIJARI',
      formatTxtType: 'ATTIJARI',
      statut: 'ACTIF',
      codeJournal: 'ATT411',
      compteTresorerie: '53220900',
      compteGeneralTiers: '41100005'
    },
    {
      nom: 'BTK COMAR 501',
      rib: '08001234567890123456',
      banque: 'BANQUE DE TUNISIE',
      agence: 'Lac 1',
      structureTxt: 'BTK_COMAR',
      formatTxtType: 'BTK_COMAR',
      statut: 'ACTIF',
      codeJournal: 'BTK580',
      compteTresorerie: '53221650',
      compteGeneralTiers: '41100005'
    },
    {
      nom: 'BTK ASTREE',
      rib: '08009876543210987654',
      banque: 'BANQUE DE TUNISIE',
      agence: 'Lac 2',
      structureTxt: 'BTK_ASTREE',
      formatTxtType: 'BTK_ASTREE',
      statut: 'ACTIF',
      codeJournal: 'BTK134',
      compteTresorerie: '53221550',
      compteGeneralTiers: '41100007'
    },
    {
      nom: 'BNA SALAIRES',
      rib: '07001234567890123456',
      banque: 'BANQUE NATIONALE AGRICOLE',
      agence: '1000000088',
      structureTxt: 'BNA',
      formatTxtType: 'BNA',
      statut: 'ACTIF',
      codeJournal: 'BNA100',
      compteTresorerie: '53221700',
      compteGeneralTiers: '41100010'
    }
  ];

  const createdDonneurs = [];
  for (const donneur of donneurs) {
    const existing = await prisma.donneurOrdre.findFirst({
      where: { nom: donneur.nom }
    });

    if (existing) {
      console.log(`   ✓ Donneur already exists: ${donneur.nom}`);
      createdDonneurs.push(existing);
    } else {
      const created = await prisma.donneurOrdre.create({ data: donneur });
      console.log(`   ✓ Created Donneur: ${donneur.nom}`);
      createdDonneurs.push(created);
    }
  }
  console.log('');

  // Step 3: Update clients with modeRecuperation
  console.log('📝 Step 3: Updating clients with Mode Récupération...');
  const modeRecuperations = ['Chèque', 'Virement', 'Espèces', 'Prélèvement'];
  for (const client of clients.slice(0, 5)) {
    const mode = modeRecuperations[Math.floor(Math.random() * modeRecuperations.length)];
    await prisma.client.update({
      where: { id: client.id },
      data: { modeRecuperation: mode }
    });
    console.log(`   ✓ Updated client ${client.name}: ${mode}`);
  }
  console.log('');

  // Step 4: Create Adherents for each client
  console.log('📝 Step 4: Creating Adhérents (Beneficiaries)...');
  const adherentsToCreate = [];
  
  for (const client of clients.slice(0, 5)) {
    const numAdherents = Math.floor(Math.random() * 5) + 3; // 3-7 adherents per client
    
    for (let i = 0; i < numAdherents; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const matricule = generateMatricule(client.name.substring(0, 3).toUpperCase());
      const contract = client.contracts[0]; // Use first contract
      
      adherentsToCreate.push({
        matricule: matricule,
        nom: lastName,
        prenom: firstName,
        clientId: client.id,
        rib: generateRIB(),
        codeAssure: contract?.codeAssure || '4103',
        numeroContrat: generateContractNumber(), // Generate proper contract number like 70240017
        assurance: assurances[Math.floor(Math.random() * assurances.length)],
        statut: 'ACTIF'
      });
    }
  }

  // Check for duplicates and create
  for (const adherent of adherentsToCreate) {
    const existing = await prisma.adherent.findFirst({
      where: {
        matricule: adherent.matricule,
        clientId: adherent.clientId
      }
    });

    if (!existing) {
      await prisma.adherent.create({ data: adherent });
      console.log(`   ✓ Created Adherent: ${adherent.prenom} ${adherent.nom} (${adherent.matricule}) - Contract: ${adherent.numeroContrat}`);
    }
  }
  console.log('');

  // Step 5: Get a valid user ID for history
  const sampleUser = await prisma.user.findFirst();
  if (!sampleUser) {
    console.log('❌ No users found. Cannot create history entries.');
    return;
  }

  // Step 6: Create Ordre de Virement for bordereaux and direct clients
  console.log('📝 Step 5: Creating Ordres de Virement...');
  
  let ovsCreated = 0;
  
  // First, try to create OVs for existing bordereaux
  for (const client of clients.slice(0, 5)) {
    if (client.bordereaux.length > 0) {
      for (const bordereau of client.bordereaux.slice(0, 1)) {
        // Check if OV already exists for this bordereau
        const existingOV = await prisma.ordreVirement.findFirst({
          where: { bordereauId: bordereau.id }
        });

        if (existingOV) {
          console.log(`   ⚠ OV already exists for bordereau: ${bordereau.reference}`);
          continue;
        }

        // Get adherents for this client
        const clientAdherents = await prisma.adherent.findMany({
          where: { clientId: client.id },
          take: Math.floor(Math.random() * 4) + 2 // 2-5 adherents per OV
        });

        if (clientAdherents.length === 0) {
          console.log(`   ⚠ No adherents found for client ${client.name}`);
          continue;
        }

        // Select random donneur
        const donneur = createdDonneurs[Math.floor(Math.random() * createdDonneurs.length)];
        
        // Generate reference based on bordereau
        const year = new Date().getFullYear();
        const ovReference = `OV-${year}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Calculate total amount
        const montantTotal = clientAdherents.reduce((sum, _) => sum + (Math.random() * 300 + 50), 0);

        // Create OV linked to bordereau
        const ov = await prisma.ordreVirement.create({
          data: {
            reference: ovReference,
            donneurOrdreId: donneur.id,
            bordereauId: bordereau.id,
            clientId: client.id,
            contractId: client.contracts[0]?.id || null,
            dateCreation: new Date(),
            utilisateurSante: sampleUser.id,
            utilisateurFinance: null,
            etatVirement: 'NON_EXECUTE',
            montantTotal: montantTotal,
            nombreAdherents: clientAdherents.length,
            typeOperation: 'REMBOURSEMENT',
            statutGlobal: 'EN_ATTENTE',
            validationStatus: 'EN_ATTENTE_VALIDATION',
            recouvrementStatus: 'ATTENTE_RECOUVREMENT',
            demandeRecuperation: Math.random() > 0.5,
            montantRecupere: false
          }
        });

        console.log(`   ✓ Created OV: ${ovReference} for bordereau ${bordereau.reference} (${clientAdherents.length} adherents)`);
        console.log(`   ✓ First Adherent Contract: ${clientAdherents[0].numeroContrat}`);

        // Create VirementItems
        for (const adherent of clientAdherents) {
          const montant = Math.random() * 300 + 50; // 50-350 TND
          await prisma.virementItem.create({
            data: {
              ordreVirementId: ov.id,
              adherentId: adherent.id,
              montant: parseFloat(montant.toFixed(2)),
              statut: 'VALIDE'
            }
          });
        }

        console.log(`   ✓ Created ${clientAdherents.length} VirementItems`);

        // Create initial history entry
        await prisma.virementHistory.create({
          data: {
            virementId: ov.id,
            action: 'CREATION',
            newState: 'EN_ATTENTE',
            comment: 'Ordre de virement créé pour test (lié au bordereau)',
            userId: sampleUser.id
          }
        });
        
        ovsCreated++;
      }
    }
  }
  
  // Then create some manual entries (without bordereaux)
  console.log('\n   Creating manual entries (without bordereaux)...');
  for (const client of clients.slice(5, 8)) {
    const clientAdherents = await prisma.adherent.findMany({
      where: { clientId: client.id },
      take: Math.floor(Math.random() * 4) + 2
    });

    if (clientAdherents.length === 0) {
      console.log(`   ⚠ No adherents found for client ${client.name}`);
      continue;
    }

    const donneur = createdDonneurs[Math.floor(Math.random() * createdDonneurs.length)];
    const year = new Date().getFullYear();
    const ovReference = `OV-${year}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const montantTotal = clientAdherents.reduce((sum, _) => sum + (Math.random() * 300 + 50), 0);

    const ov = await prisma.ordreVirement.create({
      data: {
        reference: ovReference,
        donneurOrdreId: donneur.id,
        bordereauId: null, // Manual entry - no bordereau
        clientId: client.id,
        contractId: client.contracts[0]?.id || null,
        dateCreation: new Date(),
        utilisateurSante: sampleUser.id,
        utilisateurFinance: null,
        etatVirement: 'NON_EXECUTE',
        montantTotal: montantTotal,
        nombreAdherents: clientAdherents.length,
        typeOperation: 'REMBOURSEMENT',
        statutGlobal: 'EN_ATTENTE',
        validationStatus: 'EN_ATTENTE_VALIDATION',
        recouvrementStatus: 'ATTENTE_RECOUVREMENT',
        demandeRecuperation: false,
        montantRecupere: false
      }
    });

    console.log(`   ✓ Created OV: ${ovReference} for ${client.name} (manual entry - no bordereau) (${clientAdherents.length} adherents)`);
    console.log(`   ✓ First Adherent Contract: ${clientAdherents[0].numeroContrat}`);

    for (const adherent of clientAdherents) {
      const montant = Math.random() * 300 + 50;
      await prisma.virementItem.create({
        data: {
          ordreVirementId: ov.id,
          adherentId: adherent.id,
          montant: parseFloat(montant.toFixed(2)),
          statut: 'VALIDE'
        }
      });
    }

    console.log(`   ✓ Created ${clientAdherents.length} VirementItems`);

    await prisma.virementHistory.create({
      data: {
        virementId: ov.id,
        action: 'CREATION',
        newState: 'EN_ATTENTE',
        comment: 'OV manuel créé pour test (sans bordereau)',
        userId: sampleUser.id
      }
    });
    
    ovsCreated++;
  }

  console.log('\n✅ Finance module test data generation completed!');
  console.log('\n📊 Summary:');
  console.log(`   - Donneurs d'Ordre: ${createdDonneurs.length}`);
  
  const totalAdherents = await prisma.adherent.count();
  const totalOVs = await prisma.ordreVirement.count();
  const ovsWithBordereau = await prisma.ordreVirement.count({ where: { bordereauId: { not: null } } });
  const ovsManual = await prisma.ordreVirement.count({ where: { bordereauId: null } });
  
  console.log(`   - Total Adhérents: ${totalAdherents}`);
  console.log(`   - Total Ordres de Virement: ${totalOVs}`);
  console.log(`     • With Bordereau: ${ovsWithBordereau}`);
  console.log(`     • Manual Entry: ${ovsManual}`);
  
  if (totalOVs > 0) {
    const firstOV = await prisma.ordreVirement.findFirst({
      include: {
        bordereau: true,
        items: {
          take: 1,
          include: { adherent: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (firstOV && firstOV.items[0]) {
      console.log(`\n🎯 Test Data:`);
      console.log(`   - Latest OV: ${firstOV.reference}`);
      console.log(`   - Type: ${firstOV.bordereauId ? `Bordereau (${firstOV.bordereau?.reference})` : 'Manual Entry'}`);
      console.log(`   - Expected N° Contrat in PDF: ${firstOV.items[0].adherent.numeroContrat}`);
      console.log(`   - Should NOT show: ${firstOV.items[0].adherent.codeAssure} (insured code)`);
    }
  }
  
  console.log('\n🧪 You can now test the fixes in the Finance Module!');
  console.log('   1. Refresh the Finance Dashboard');
  console.log('   2. Find OVs (both bordereau-linked and manual)');
  console.log('   3. Generate PDF and verify N° Contrat is correct');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
