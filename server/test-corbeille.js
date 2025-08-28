const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCorbeilleData() {
  try {
    console.log('🔍 Testing Corbeille data...');
    
    await prisma.$connect();
    console.log('✅ Database connected');

    // Get all reclamations with their status
    const allReclamations = await prisma.reclamation.findMany({
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { fullName: true } }
      }
    });

    console.log(`📊 Total reclamations: ${allReclamations.length}`);

    // Group by status
    const statusGroups = {};
    allReclamations.forEach(rec => {
      const status = rec.status;
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push({
        id: rec.id.substring(0, 8),
        client: rec.client?.name,
        type: rec.type,
        severity: rec.severity,
        assignedTo: rec.assignedTo?.fullName || 'Non assigné',
        createdAt: rec.createdAt
      });
    });

    console.log('\n📈 By Status:');
    Object.entries(statusGroups).forEach(([status, items]) => {
      console.log(`  ${status}: ${items.length} items`);
      items.slice(0, 2).forEach(item => {
        console.log(`    - ${item.id}: ${item.client} (${item.severity}) - ${item.assignedTo}`);
      });
    });

    // Test the corbeille logic
    const nonAffectes = allReclamations.filter(r => 
      ['OPEN', 'open', 'OUVERTE', 'OUVERT'].includes(r.status) && !r.assignedToId
    );
    
    const enCours = allReclamations.filter(r => 
      ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'].includes(r.status)
    );
    
    const traites = allReclamations.filter(r => 
      ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'].includes(r.status)
    );

    console.log('\n🗂️ Corbeille Stats:');
    console.log(`  Non affectés: ${nonAffectes.length}`);
    console.log(`  En cours: ${enCours.length}`);
    console.log(`  Traités: ${traites.length}`);

    // Show sample data for each category
    console.log('\n📋 Sample Non Affectés:');
    nonAffectes.slice(0, 3).forEach(rec => {
      console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - ${rec.type} (${rec.severity})`);
    });

    console.log('\n📋 Sample En Cours:');
    enCours.slice(0, 3).forEach(rec => {
      console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - ${rec.type} (${rec.severity}) - ${rec.assignedTo?.fullName || 'Non assigné'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCorbeilleData();