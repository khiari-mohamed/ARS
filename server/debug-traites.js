const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTraitesData() {
  try {
    console.log('🔍 Debugging Traités data...');
    
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
    console.log('\n📋 All Status Values:');
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
      items.forEach(item => {
        console.log(`    - ${item.id}: ${item.client} - ${item.assignedTo}`);
      });
    });

    // Test current logic for traités
    console.log('\n🧪 Testing Current Traités Logic:');
    
    const traites = allReclamations.filter(r => 
      ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'].includes(r.status)
    );
    console.log(`Current logic finds: ${traites.length} traités`);
    
    if (traites.length > 0) {
      console.log('Traités details:');
      traites.forEach(rec => {
        console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - Status: "${rec.status}" - Assigné: ${rec.assignedTo?.fullName || 'Non assigné'}`);
      });
    }
    
    // Check if we need to add other status values
    console.log('\n🔍 Looking for potential traités with other status values...');
    const potentialTraites = allReclamations.filter(r => {
      const status = r.status?.toLowerCase();
      return status?.includes('resol') || 
             status?.includes('ferm') || 
             status?.includes('clos') || 
             status?.includes('termin') ||
             status?.includes('fini');
    });
    
    if (potentialTraites.length > 0) {
      console.log(`Found ${potentialTraites.length} potential traités with other status values:`);
      potentialTraites.forEach(rec => {
        console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - Status: "${rec.status}"`);
      });
    }

    // Let's manually create a resolved reclamation for testing
    console.log('\n🔧 Creating a test resolved reclamation...');
    try {
      const testResolved = await prisma.reclamation.create({
        data: {
          clientId: allReclamations[0]?.clientId || 'test-client',
          type: 'TEST',
          severity: 'low',
          status: 'RESOLVED',
          description: 'Test resolved reclamation for debugging',
          createdById: 'test-user'
        }
      });
      console.log(`✅ Created test resolved reclamation: ${testResolved.id.substring(0, 8)}`);
    } catch (error) {
      console.log('⚠️ Could not create test reclamation:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTraitesData();