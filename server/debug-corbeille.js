const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCorbeilleData() {
  try {
    console.log('🔍 Debugging Corbeille data...');
    
    await prisma.$connect();
    
    // Get all reclamations with their exact status values
    const allReclamations = await prisma.reclamation.findMany({
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { fullName: true } }
      }
    });

    console.log(`📊 Total reclamations: ${allReclamations.length}`);
    
    // Show exact status values
    console.log('\n📋 Exact Status Values:');
    const statusMap = {};
    allReclamations.forEach(rec => {
      const status = rec.status;
      if (!statusMap[status]) statusMap[status] = [];
      statusMap[status].push({
        id: rec.id.substring(0, 8),
        client: rec.client?.name,
        assignedTo: rec.assignedTo?.fullName || 'Non assigné'
      });
    });

    Object.entries(statusMap).forEach(([status, items]) => {
      console.log(`  "${status}": ${items.length} items`);
      items.slice(0, 2).forEach(item => {
        console.log(`    - ${item.id}: ${item.client} - ${item.assignedTo}`);
      });
    });

    // Test the current logic
    console.log('\n🧪 Testing Current Logic:');
    
    // Non affectés (OPEN without assignment)
    const nonAffectes = allReclamations.filter(r => 
      ['OPEN', 'open', 'OUVERTE', 'OUVERT'].includes(r.status) && !r.assignedToId
    );
    console.log(`Non affectés: ${nonAffectes.length}`);
    
    // En cours (IN_PROGRESS, EN_COURS, ESCALATED)
    const enCours = allReclamations.filter(r => 
      ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'].includes(r.status)
    );
    console.log(`En cours: ${enCours.length}`);
    
    // Show en cours details
    if (enCours.length > 0) {
      console.log('En cours details:');
      enCours.forEach(rec => {
        console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - Status: "${rec.status}" - Assigné: ${rec.assignedTo?.fullName || 'Non assigné'}`);
      });
    }
    
    // Traités (RESOLVED, CLOSED)
    const traites = allReclamations.filter(r => 
      ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'].includes(r.status)
    );
    console.log(`Traités: ${traites.length}`);

    // Check if we need to include assigned OPEN items in "en cours"
    const assignedOpen = allReclamations.filter(r => 
      ['OPEN', 'open', 'OUVERTE', 'OUVERT'].includes(r.status) && r.assignedToId
    );
    console.log(`Assigned OPEN (should be en cours?): ${assignedOpen.length}`);
    
    if (assignedOpen.length > 0) {
      console.log('Assigned OPEN details:');
      assignedOpen.forEach(rec => {
        console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - Status: "${rec.status}" - Assigné: ${rec.assignedTo?.fullName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCorbeilleData();