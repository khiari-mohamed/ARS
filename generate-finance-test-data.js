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
    await prisma.virementHistory.deleteMany({});
    await prisma.sageTxtGeneration.deleteMany({});
    await prisma.sageIntegration.deleteMany({});
    await prisma.oVDocument.deleteMany({});
    await prisma.virementHistorique.deleteMany({});
    await prisma.suiviVirement.deleteMany({});
    await prisma.virementItem.deleteMany({});
    await prisma.ordreVirement.deleteMany({});
    await prisma.adherent.deleteMany({});
    await prisma.donneurOrdre.deleteMany({});
    
    console.log('   ✓ All finance data deleted successfully\n');
  } catch (error) {
    console.error('   ⚠️ Error cleaning data (this is OK if tables are empty):', error.message);
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

  // Step 5: Create Ordre de Virement for each bordereau
  console.log('📝 Step 5: Creating Ordres de Virement...');
  
  for (const client of clients.slice(0, 3)) {
    for (const bordereau of client.bordereaux.slice(0, 2)) {
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
        take: Math.floor(Math.random() * 5) + 2 // 2-6 adherents per OV
      });

      if (clientAdherents.length === 0) {
        console.log(`   ⚠ No adherents found for client ${client.name}`);
        continue;
      }

      // Select random donneur
      const donneur = createdDonneurs[Math.floor(Math.random() * createdDonneurs.length)];
      
      // Generate reference
      const year = new Date().getFullYear();
      const ovReference = `OV-${year}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Calculate total amount
      const montantTotal = clientAdherents.reduce((sum, _) => sum + (Math.random() * 300 + 50), 0);

      // Create OV
      const ov = await prisma.ordreVirement.create({
        data: {
          reference: ovReference,
          donneurOrdreId: donneur.id,
          bordereauId: bordereau.id,
          clientId: client.id,
          contractId: client.contracts[0]?.id || null,
          dateCreation: new Date(),
          utilisateurSante: 'Chef Équipe Test',
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

      console.log(`   ✓ Created OV: ${ovReference} for ${bordereau.reference} (${clientAdherents.length} adherents)`);

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
          comment: 'Ordre de virement créé automatiquement pour test',
          userId: 'system' // You'll need to replace with actual user ID
        }
      });
    }
  }

  console.log('\n✅ Finance module test data generation completed!');
  console.log('\n📊 Summary:');
  console.log(`   - Donneurs d'Ordre: ${createdDonneurs.length}`);
  console.log(`   - Adhérents created: Check database`);
  console.log(`   - Ordres de Virement: Check database`);
  console.log('\n🧪 You can now test the fixes in the Finance Module!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
