const { PrismaClient } = require('@prisma/client');
const { CorbeilleService } = require('./dist/reclamations/corbeille.service');

const prisma = new PrismaClient();

async function testCorbeilleEndpoint() {
  try {
    console.log('🔍 Testing Corbeille Endpoint...');
    
    await prisma.$connect();
    
    // Create corbeille service instance
    const corbeilleService = new CorbeilleService(prisma);
    
    // Test the chef corbeille method
    console.log('\n📊 Testing getChefCorbeille...');
    const result = await corbeilleService.getChefCorbeille('test-user');
    
    console.log('Result structure:');
    console.log(`- nonAffectes: ${result.nonAffectes.length} items`);
    console.log(`- enCours: ${result.enCours.length} items`);
    console.log(`- traites: ${result.traites.length} items`);
    
    console.log('\nStats:');
    console.log(`- nonAffectes: ${result.stats.nonAffectes}`);
    console.log(`- enCours: ${result.stats.enCours}`);
    console.log(`- traites: ${result.stats.traites}`);
    console.log(`- enRetard: ${result.stats.enRetard}`);
    console.log(`- critiques: ${result.stats.critiques}`);
    
    if (result.traites.length > 0) {
      console.log('\n📋 Traités Details:');
      result.traites.forEach(item => {
        console.log(`  - ${item.reference}: ${item.clientName} - Status: ${item.status} - Assigné: ${item.assignedTo || 'Non assigné'}`);
      });
    } else {
      console.log('\n⚠️ No traités found in result');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCorbeilleEndpoint();