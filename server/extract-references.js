const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractReferences() {
  try {
    console.log('🔍 Extracting all references for reclamation form...\n');
    
    // Get all clients
    const clients = await prisma.client.findMany({
      select: { id: true, name: true }
    });
    
    // Get all contracts
    const contracts = await prisma.contract.findMany({
      select: { id: true, clientName: true, codeAssure: true }
    });
    
    // Get all bordereaux
    const bordereaux = await prisma.bordereau.findMany({
      include: { client: { select: { name: true } } }
    });
    
    console.log('📋 CLIENTS:');
    clients.forEach(client => {
      console.log(`  ID: ${client.id}`);
      console.log(`  Name: ${client.name}`);
      console.log('');
    });
    
    console.log('📋 CONTRACTS:');
    contracts.forEach(contract => {
      console.log(`  ID: ${contract.id}`);
      console.log(`  Client Name: ${contract.clientName}`);
      console.log(`  Code Assuré: ${contract.codeAssure || 'N/A'}`);
      console.log('');
    });
    
    console.log('📋 BORDEREAUX:');
    bordereaux.forEach(bordereau => {
      console.log(`  ID: ${bordereau.id}`);
      console.log(`  Reference: ${bordereau.reference}`);
      console.log(`  Client: ${bordereau.client?.name || 'Unknown'}`);
      console.log('');
    });
    
    console.log('🎯 FORM TEST DATA:');
    console.log('Copy these values for testing:');
    console.log('');
    
    if (clients.length > 0) {
      console.log(`Client ID: ${clients[0].id}`);
    }
    
    if (contracts.length > 0) {
      console.log(`Contract ID: ${contracts[0].id}`);
    }
    
    if (bordereaux.length > 0) {
      console.log(`Bordereau ID: ${bordereaux[0].id}`);
      console.log(`Bordereau Reference: ${bordereaux[0].reference}`);
    }
    
    console.log('');
    console.log('📝 SAMPLE FORM DATA:');
    console.log(JSON.stringify({
      clientId: clients[0]?.id || 'NO_CLIENT_FOUND',
      type: 'DELAI',
      severity: 'MOYENNE',
      description: 'Test reclamation with all fields',
      typologie: 'Demande renseignement',
      bordereauId: bordereaux[0]?.id || 'TEST-BORDEREAU-123',
      contractId: contracts[0]?.id || 'TEST-CONTRACT-456'
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error extracting references:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractReferences();