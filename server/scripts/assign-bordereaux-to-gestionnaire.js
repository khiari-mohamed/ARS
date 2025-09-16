const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignBordereauxToGestionnaire() {
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

    // Get client
    const client = await prisma.client.findFirst();
    if (!client) {
      console.log('❌ No client found to create bordereaux');
      return;
    }

    console.log('🔧 Creating test bordereaux...');
    
    // Create 5 assigned bordereaux
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for unique timestamps
      const newBordereau = await prisma.bordereau.create({
        data: {
          reference: `GEST-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(),
          nombreBS: Math.floor(Math.random() * 5) + 1,
          statut: 'ASSIGNE',
          assignedToUserId: gestionnaire.id,
          completionRate: 0,
          delaiReglement: 30
        }
      });
      
      // Create BS for this bordereau
      for (let j = 1; j <= newBordereau.nombreBS; j++) {
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: newBordereau.id,
            numBs: `${newBordereau.reference}-BS-${j}`,
            nomAssure: `Assuré ${j}`,
            nomBeneficiaire: `Bénéficiaire ${j}`,
            codeAssure: `CODE-${j}`,
            montant: Math.floor(Math.random() * 500) + 100,
            etat: j <= Math.floor(newBordereau.nombreBS / 2) ? 'TRAITE' : 'EN_COURS',
            dateCreation: new Date(),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: newBordereau.reference,
            nomPrestation: `Prestation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Test observation',
            totalPec: Math.floor(Math.random() * 500) + 100
          }
        });
      }
    }

    // Create 2 returned bordereaux
    for (let i = 1; i <= 2; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const retBordereau = await prisma.bordereau.create({
        data: {
          reference: `RET-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
            nomAssure: `Returned Assuré ${j}`,
            nomBeneficiaire: `Returned Bénéficiaire ${j}`,
            codeAssure: `RET-CODE-${j}`,
            montant: Math.floor(Math.random() * 300) + 50,
            etat: 'EN_COURS',
            dateCreation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: retBordereau.reference,
            nomPrestation: `Returned Prestation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Returned observation',
            totalPec: Math.floor(Math.random() * 300) + 50
          }
        });
      }
    }

    // Create 3 processed bordereaux
    for (let i = 1; i <= 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const procBordereau = await prisma.bordereau.create({
        data: {
          reference: `PROC-${Date.now()}-${i.toString().padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          dateReceptionSante: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
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
            nomAssure: `Processed Assuré ${j}`,
            nomBeneficiaire: `Processed Bénéficiaire ${j}`,
            codeAssure: `PROC-CODE-${j}`,
            montant: Math.floor(Math.random() * 400) + 200,
            etat: 'TRAITE',
            processedById: gestionnaire.id,
            processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            dateCreation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            lien: 'PRINCIPAL',
            nomBordereau: procBordereau.reference,
            nomPrestation: `Processed Prestation ${j}`,
            nomSociete: client.name,
            observationGlobal: 'Processed observation',
            totalPec: Math.floor(Math.random() * 400) + 200
          }
        });
      }
    }

    console.log('✅ Created 10 test bordereaux for gestionnaire');
    console.log('🎯 Setup complete! Gestionnaire now has data to work with.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignBordereauxToGestionnaire();