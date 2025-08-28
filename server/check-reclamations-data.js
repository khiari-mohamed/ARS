const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkReclamationsData() {
  try {
    console.log('🔍 Checking reclamations data in database...\n');
    
    // Check total count
    const totalCount = await prisma.reclamation.count();
    console.log(`📊 Total reclamations: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('❌ No reclamations found in database');
      console.log('💡 Need to create some test data\n');
      return false;
    }
    
    // Check by status
    const statusCounts = await prisma.reclamation.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    console.log('\n📈 Breakdown by status:');
    statusCounts.forEach(item => {
      console.log(`  ${item.status}: ${item._count.id}`);
    });
    
    // Check by severity
    const severityCounts = await prisma.reclamation.groupBy({
      by: ['severity'],
      _count: { id: true }
    });
    
    console.log('\n⚠️ Breakdown by severity:');
    severityCounts.forEach(item => {
      console.log(`  ${item.severity}: ${item._count.id}`);
    });
    
    // Check by type
    const typeCounts = await prisma.reclamation.groupBy({
      by: ['type'],
      _count: { id: true }
    });
    
    console.log('\n📋 Breakdown by type:');
    typeCounts.forEach(item => {
      console.log(`  ${item.type}: ${item._count.id}`);
    });
    
    // Check recent reclamations
    const recentReclamations = await prisma.reclamation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        assignedTo: true
      }
    });
    
    console.log('\n🕒 Recent reclamations:');
    recentReclamations.forEach(rec => {
      console.log(`  ${rec.id.substring(0, 8)}... - ${rec.type} - ${rec.status} - ${rec.client?.name || 'No client'}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking reclamations data:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function createTestReclamations() {
  try {
    console.log('🔧 Creating test reclamations data...\n');
    
    // First, check if we have clients and users
    const clientsCount = await prisma.client.count();
    const usersCount = await prisma.user.count();
    
    console.log(`👥 Clients in database: ${clientsCount}`);
    console.log(`👤 Users in database: ${usersCount}`);
    
    if (clientsCount === 0 || usersCount === 0) {
      console.log('❌ Need clients and users to create reclamations');
      console.log('💡 Please ensure you have clients and users in the database first');
      return false;
    }
    
    // Get some clients and users
    const clients = await prisma.client.findMany({ take: 3 });
    const users = await prisma.user.findMany({ 
      take: 3,
      where: {
        role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE', 'CLIENT_SERVICE'] }
      }
    });
    
    if (clients.length === 0 || users.length === 0) {
      console.log('❌ No suitable clients or users found');
      return false;
    }
    
    // Create test reclamations
    const testReclamations = [
      {
        type: 'retard',
        severity: 'medium',
        status: 'OPEN',
        description: 'Retard dans le traitement du dossier',
        clientId: clients[0].id,
        assignedToId: users[0].id,
        createdById: users[0].id
      },
      {
        type: 'document manquant',
        severity: 'critical',
        status: 'IN_PROGRESS',
        description: 'Document manquant pour finaliser le dossier',
        clientId: clients[1].id,
        assignedToId: users[1].id,
        createdById: users[1].id
      },
      {
        type: 'erreur traitement',
        severity: 'low',
        status: 'RESOLVED',
        description: 'Erreur dans le traitement corrigée',
        clientId: clients[2].id,
        assignedToId: users[2].id,
        createdById: users[2].id
      },
      {
        type: 'autre',
        severity: 'medium',
        status: 'OPEN',
        description: 'Demande de clarification',
        clientId: clients[0].id,
        assignedToId: users[0].id,
        createdById: users[0].id
      },
      {
        type: 'retard',
        severity: 'critical',
        status: 'CLOSED',
        description: 'Retard résolu et dossier fermé',
        clientId: clients[1].id,
        assignedToId: users[1].id,
        createdById: users[1].id
      }
    ];
    
    console.log('📝 Creating test reclamations...');
    
    for (const recData of testReclamations) {
      const reclamation = await prisma.reclamation.create({
        data: recData,
        include: {
          client: true,
          assignedTo: true
        }
      });
      
      console.log(`✅ Created: ${reclamation.id.substring(0, 8)}... - ${reclamation.type} - ${reclamation.status}`);
    }
    
    console.log(`\n🎉 Successfully created ${testReclamations.length} test reclamations!`);
    return true;
    
  } catch (error) {
    console.error('❌ Error creating test reclamations:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Reclamations Database Check\n');
  
  const hasData = await checkReclamationsData();
  
  if (!hasData) {
    console.log('\n🔧 Would you like to create test data? (This will help test the reporting)');
    const createData = await createTestReclamations();
    
    if (createData) {
      console.log('\n✅ Test data created! Now checking again...\n');
      await checkReclamationsData();
    }
  }
  
  console.log('\n✅ Database check complete!');
}

main().catch(console.error);