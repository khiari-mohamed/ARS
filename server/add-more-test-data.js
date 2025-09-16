const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMoreTestData() {
  console.log('🌱 Adding more test data for search functionality...');
  
  try {
    // Get test gestionnaire
    const testGestionnaire = await prisma.user.findUnique({
      where: { email: 'gestionnaire@test.com' }
    });
    
    if (!testGestionnaire) {
      console.log('❌ Test gestionnaire not found!');
      return;
    }
    
    // Create additional clients
    const client2 = await prisma.client.upsert({
      where: { name: 'Société Delta' },
      update: {},
      create: {
        name: 'Société Delta',
        reglementDelay: 25,
        reclamationDelay: 12,
        address: '456 Avenue Delta, Tunis'
      }
    });
    
    const client3 = await prisma.client.upsert({
      where: { name: 'Compagnie Epsilon' },
      update: {},
      create: {
        name: 'Compagnie Epsilon',
        reglementDelay: 35,
        reclamationDelay: 18,
        address: '789 Boulevard Epsilon, Sfax'
      }
    });
    
    // Create contracts for new clients
    const contract2 = await prisma.contract.create({
      data: {
        clientId: client2.id,
        clientName: client2.name,
        assignedManagerId: testGestionnaire.id,
        delaiReglement: 25,
        delaiReclamation: 12,
        documentPath: '/contracts/delta-contract.pdf',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      }
    });
    
    const contract3 = await prisma.contract.create({
      data: {
        clientId: client3.id,
        clientName: client3.name,
        assignedManagerId: testGestionnaire.id,
        delaiReglement: 35,
        delaiReclamation: 18,
        documentPath: '/contracts/epsilon-contract.pdf',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      }
    });
    
    // Create bordereaux for client2 (Société Delta)
    for (let i = 6; i <= 8; i++) {
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `DLT-2024-${String(i-5).padStart(3, '0')}`,
          clientId: client2.id,
          contractId: contract2.id,
          dateReception: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          delaiReglement: 25,
          nombreBS: 2,
          statut: 'ASSIGNE',
          assignedToUserId: testGestionnaire.id,
          dateReceptionBO: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          scanStatus: 'SCANNE'
        }
      });
      
      // Create document
      await prisma.document.create({
        data: {
          name: `GED-DLT-${String(i-5).padStart(3, '0')}`,
          type: 'BULLETIN_SOIN',
          path: `/documents/bordereau-${bordereau.id}.pdf`,
          uploadedById: testGestionnaire.id,
          bordereauId: bordereau.id,
          status: 'TRAITE'
        }
      });
      
      // Create bulletin soins
      for (let j = 1; j <= 2; j++) {
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: bordereau.id,
            numBs: `DLT-${i-5}-${j}`,
            etat: 'EN_COURS',
            codeAssure: `DLT${String((i-5) * 100 + j).padStart(6, '0')}`,
            dateCreation: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000),
            lien: 'TITULAIRE',
            nomAssure: `Delta Assuré ${i-5}`,
            nomBeneficiaire: `Delta Bénéficiaire ${i-5}-${j}`,
            nomBordereau: bordereau.reference,
            nomPrestation: 'Consultation spécialisée',
            nomSociete: client2.name,
            observationGlobal: 'Dossier Delta',
            totalPec: 200.75 + ((i-5) * 15) + (j * 8),
            ownerId: testGestionnaire.id,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          }
        });
      }
    }
    
    // Create bordereaux for client3 (Compagnie Epsilon)
    for (let i = 9; i <= 10; i++) {
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `EPS-2024-${String(i-8).padStart(3, '0')}`,
          clientId: client3.id,
          contractId: contract3.id,
          dateReception: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          delaiReglement: 35,
          nombreBS: 4,
          statut: 'EN_COURS',
          assignedToUserId: testGestionnaire.id,
          dateReceptionBO: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          scanStatus: 'SCANNE'
        }
      });
      
      // Create document
      await prisma.document.create({
        data: {
          name: `GED-EPS-${String(i-8).padStart(3, '0')}`,
          type: 'RECLAMATION',
          path: `/documents/bordereau-${bordereau.id}.pdf`,
          uploadedById: testGestionnaire.id,
          bordereauId: bordereau.id,
          status: 'EN_COURS'
        }
      });
      
      // Create bulletin soins
      for (let j = 1; j <= 4; j++) {
        await prisma.bulletinSoin.create({
          data: {
            bordereauId: bordereau.id,
            numBs: `EPS-${i-8}-${j}`,
            etat: j <= 2 ? 'TRAITE' : 'EN_COURS',
            codeAssure: `EPS${String((i-8) * 100 + j).padStart(6, '0')}`,
            dateCreation: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            dateMaladie: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
            lien: 'ENFANT',
            nomAssure: `Epsilon Assuré ${i-8}`,
            nomBeneficiaire: `Epsilon Bénéficiaire ${i-8}-${j}`,
            nomBordereau: bordereau.reference,
            nomPrestation: 'Analyse médicale',
            nomSociete: client3.name,
            observationGlobal: 'Dossier Epsilon',
            totalPec: 180.25 + ((i-8) * 20) + (j * 12),
            ownerId: testGestionnaire.id,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            processedById: j <= 2 ? testGestionnaire.id : null,
            processedAt: j <= 2 ? new Date() : null
          }
        });
      }
    }
    
    console.log('✅ Additional test data created successfully!');
    console.log('📊 Added:');
    console.log('   - 2 New Clients (Société Delta, Compagnie Epsilon)');
    console.log('   - 2 New Contracts');
    console.log('   - 5 New Bordereaux (3 Delta + 2 Epsilon)');
    console.log('   - 5 New Documents');
    console.log('   - 14 New Bulletin Soins');
    console.log('');
    console.log('🔍 Now you can test search with:');
    console.log('   - "Delta" or "DLT" for Société Delta');
    console.log('   - "Epsilon" or "EPS" for Compagnie Epsilon');
    console.log('   - "Test Client ARS" or "BDX" for original data');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreTestData();