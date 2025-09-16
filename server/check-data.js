const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Checking database data...');
  
  try {
    // Check users
    const users = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { id: true, email: true, fullName: true, role: true }
    });
    console.log('👤 Gestionnaire users:', users);
    
    if (users.length === 0) {
      console.log('❌ No gestionnaire users found!');
      return;
    }
    
    const gestionnaireId = users[0].id;
    console.log('🎯 Using gestionnaire ID:', gestionnaireId);
    
    // Check bordereaux assigned to gestionnaire
    const bordereaux = await prisma.bordereau.findMany({
      where: { assignedToUserId: gestionnaireId },
      include: {
        client: { select: { name: true } },
        documents: { select: { name: true, type: true } },
        BulletinSoin: { select: { id: true, etat: true } }
      }
    });
    console.log('📋 Bordereaux assigned to gestionnaire:', bordereaux.length);
    console.log('📋 Bordereau details:', bordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      client: b.client?.name,
      documents: b.documents.length,
      bs: b.BulletinSoin.length
    })));
    
    // Check all bordereaux (not just assigned)
    const allBordereaux = await prisma.bordereau.findMany({
      include: {
        client: { select: { name: true } },
        documents: { select: { name: true, type: true } }
      }
    });
    console.log('📋 Total bordereaux in DB:', allBordereaux.length);
    
    // Check clients
    const clients = await prisma.client.findMany({
      select: { id: true, name: true }
    });
    console.log('🏢 Clients:', clients);
    
    // Check documents
    const documents = await prisma.document.findMany({
      select: { id: true, name: true, type: true, bordereauId: true }
    });
    console.log('📄 Documents:', documents.length);
    
    // Check bulletin soins
    const bulletinSoins = await prisma.bulletinSoin.findMany({
      select: { id: true, numBs: true, etat: true, bordereauId: true }
    });
    console.log('🩺 Bulletin Soins:', bulletinSoins.length);
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();