const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDiverseData() {
  try {
    // Find the gestionnaire user
    const gestionnaire = await prisma.user.findFirst({
      where: { 
        email: 'gestionnaire@test.com',
        role: 'GESTIONNAIRE'
      }
    });

    if (!gestionnaire) {
      console.log('❌ Gestionnaire user not found');
      return;
    }

    console.log(`✅ Found gestionnaire: ${gestionnaire.fullName} (${gestionnaire.id})`);

    // Create multiple clients
    const clients = [
      { name: 'ASSURANCES SALIM', code: 'ASS' },
      { name: 'STAR ASSURANCE', code: 'STAR' },
      { name: 'COMAR ASSURANCE', code: 'COMAR' },
      { name: 'GAT ASSURANCE', code: 'GAT' },
      { name: 'LLOYD TUNISIEN', code: 'LLOYD' }
    ];

    const createdClients = [];
    for (const clientData of clients) {
      try {
        const client = await prisma.client.create({
          data: {
            name: clientData.name,
            reglementDelay: 30,
            reclamationDelay: 15
          }
        });
        createdClients.push({ ...client, code: clientData.code });
        console.log(`✅ Created client: ${client.name}`);
      } catch (error) {
        // Client might already exist
        const existingClient = await prisma.client.findUnique({
          where: { name: clientData.name }
        });
        if (existingClient) {
          createdClients.push({ ...existingClient, code: clientData.code });
          console.log(`✅ Using existing client: ${existingClient.name}`);
        }
      }
    }

    console.log('🔧 Creating diverse bordereaux...');
    
    // Create 15 assigned bordereaux with different clients
    for (let i = 1; i <= 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const client = createdClients[Math.floor(Math.random() * createdClients.length)];
      
      const newBordereau = await prisma.bordereau.create({
        data: {
          reference: `${client.code}-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
          nombreBS: Math.floor(Math.random() * 5) + 1,
          statut: 'ASSIGNE',
          assignedToUserId: gestionnaire.id,
          completionRate: 0,
          delaiReglement: 30
        }
      });
      
      // Create BS for this bordereau with varied names
      const assureNames = ['Ahmed Ben Ali', 'Fatma Trabelsi', 'Mohamed Gharbi', 'Leila Mansouri', 'Karim Bouazizi'];
      const beneficiaireNames = ['Sarra', 'Youssef', 'Amina', 'Mehdi', 'Nour'];
      
      for (let j = 1; j <= newBordereau.nombreBS; j++) {
        const assure = assureNames[Math.floor(Math.random() * assureNames.length)];
        const beneficiaire = beneficiaireNames[Math.floor(Math.random() * beneficiaireNames.length)];
        
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: newBordereau.id,
            numBs: `${newBordereau.reference}-BS-${j}`,
            nomAssure: assure,
            nomBeneficiaire: beneficiaire,
            codeAssure: `${client.code}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
            montant: Math.floor(Math.random() * 500) + 100,
            etat: j <= Math.floor(newBordereau.nombreBS / 2) ? 'TRAITE' : 'EN_COURS',
            dateCreation: new Date(),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: newBordereau.reference,
            nomPrestation: `Consultation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Observation médicale',
            totalPec: Math.floor(Math.random() * 500) + 100
          }
        });
      }
    }

    // Create 5 returned bordereaux with different clients
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const client = createdClients[Math.floor(Math.random() * createdClients.length)];
      
      const retBordereau = await prisma.bordereau.create({
        data: {
          reference: `RET-${client.code}-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000),
          nombreBS: Math.floor(Math.random() * 3) + 1,
          statut: 'EN_DIFFICULTE',
          assignedToUserId: null,
          currentHandlerId: gestionnaire.id,
          completionRate: 0,
          delaiReglement: 30
        }
      });
      
      // Create BS for returned bordereau
      for (let j = 1; j <= retBordereau.nombreBS; j++) {
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: retBordereau.id,
            numBs: `${retBordereau.reference}-BS-${j}`,
            nomAssure: `Retourné Assuré ${j}`,
            nomBeneficiaire: `Retourné Bénéficiaire ${j}`,
            codeAssure: `RET-${client.code}-${j}`,
            montant: Math.floor(Math.random() * 300) + 50,
            etat: 'EN_COURS',
            dateCreation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: retBordereau.reference,
            nomPrestation: `Retour Prestation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Dossier retourné',
            totalPec: Math.floor(Math.random() * 300) + 50
          }
        });
      }
    }

    // Create 8 processed bordereaux with different clients
    for (let i = 1; i <= 8; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const client = createdClients[Math.floor(Math.random() * createdClients.length)];
      
      const procBordereau = await prisma.bordereau.create({
        data: {
          reference: `PROC-${client.code}-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
          dateReceptionSante: new Date(Date.now() - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000),
          nombreBS: Math.floor(Math.random() * 4) + 1,
          statut: 'TRAITE',
          assignedToUserId: gestionnaire.id,
          completionRate: 100,
          delaiReglement: 30
        }
      });
      
      // Create BS for processed bordereau
      for (let j = 1; j <= procBordereau.nombreBS; j++) {
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: procBordereau.id,
            numBs: `${procBordereau.reference}-BS-${j}`,
            nomAssure: `Traité Assuré ${j}`,
            nomBeneficiaire: `Traité Bénéficiaire ${j}`,
            codeAssure: `PROC-${client.code}-${j}`,
            montant: Math.floor(Math.random() * 400) + 200,
            etat: 'TRAITE',
            processedById: gestionnaire.id,
            processedAt: new Date(Date.now() - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000),
            dateCreation: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: procBordereau.reference,
            nomPrestation: `Traité Prestation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Dossier traité',
            totalPec: Math.floor(Math.random() * 400) + 200
          }
        });
      }
    }

    console.log('✅ Created diverse data:');
    console.log('  - 5 different clients');
    console.log('  - 15 assigned bordereaux');
    console.log('  - 5 returned bordereaux');
    console.log('  - 8 processed bordereaux');
    console.log('🎯 Setup complete! Now you can test search functionality with different clients.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDiverseData();