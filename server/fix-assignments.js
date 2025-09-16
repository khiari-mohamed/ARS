const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAssignments() {
  console.log('🔧 Fixing bordereau assignments...');
  
  try {
    // Find the test gestionnaire
    const testGestionnaire = await prisma.user.findUnique({
      where: { email: 'gestionnaire@test.com' }
    });
    
    if (!testGestionnaire) {
      console.log('❌ Test gestionnaire not found!');
      return;
    }
    
    console.log('👤 Found test gestionnaire:', testGestionnaire.fullName, testGestionnaire.id);
    
    // Find bordereaux from Test Client ARS
    const testClient = await prisma.client.findUnique({
      where: { name: 'Test Client ARS' }
    });
    
    if (!testClient) {
      console.log('❌ Test client not found!');
      return;
    }
    
    console.log('🏢 Found test client:', testClient.name, testClient.id);
    
    // Update bordereaux to be assigned to test gestionnaire
    const updateResult = await prisma.bordereau.updateMany({
      where: { clientId: testClient.id },
      data: { 
        assignedToUserId: testGestionnaire.id,
        statut: 'ASSIGNE'
      }
    });
    
    console.log('✅ Updated', updateResult.count, 'bordereaux');
    
    // Verify the assignment
    const assignedBordereaux = await prisma.bordereau.findMany({
      where: { assignedToUserId: testGestionnaire.id },
      include: {
        client: { select: { name: true } },
        documents: { select: { name: true, type: true } }
      }
    });
    
    console.log('📋 Now assigned to test gestionnaire:', assignedBordereaux.length);
    assignedBordereaux.forEach(b => {
      console.log(`  - ${b.reference} (${b.client?.name}) - ${b.documents.length} docs`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAssignments();