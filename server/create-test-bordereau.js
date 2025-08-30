const { PrismaClient } = require('@prisma/client');

async function createTestBordereau() {
  const prisma = new PrismaClient();
  
  try {
    // Get first available client
    const client = await prisma.client.findFirst();
    if (!client) {
      console.log('❌ No client found. Please create a client first.');
      return;
    }

    // Create test bordereau with matching barcode reference
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: 'BORD-2025-001', // This matches our XML barcode
        clientId: client.id,
        dateReception: new Date(),
        delaiReglement: 30,
        nombreBS: 1,
        statut: 'A_SCANNER'
      },
      include: {
        client: { select: { name: true } }
      }
    });

    console.log('✅ Test bordereau created successfully!');
    console.log(`📋 Reference: ${bordereau.reference}`);
    console.log(`👤 Client: ${bordereau.client?.name}`);
    console.log(`📅 Status: ${bordereau.statut}`);
    console.log('');
    console.log('🎯 This bordereau will now match the PaperStream batch barcode!');
    
  } catch (error) {
    console.error('❌ Error creating test bordereau:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBordereau();