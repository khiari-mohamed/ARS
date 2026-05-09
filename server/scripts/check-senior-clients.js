const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndAssignClients() {
  console.log('🔍 Checking Gestionnaire Senior client assignments...\n');
  
  // Get all Gestionnaire Seniors
  const seniors = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE_SENIOR' },
    select: { id: true, fullName: true, email: true }
  });
  
  console.log(`Found ${seniors.length} Gestionnaire Seniors:`);
  seniors.forEach(s => console.log(`  - ${s.fullName} (${s.email})`));
  
  // Get all clients
  const clients = await prisma.client.findMany({
    select: { 
      id: true, 
      name: true, 
      chargeCompteId: true,
      chargeCompte: { select: { fullName: true, role: true } }
    }
  });
  
  console.log(`\n📊 Total clients: ${clients.length}`);
  
  // Check which clients are assigned to seniors
  const clientsWithSenior = clients.filter(c => {
    if (!c.chargeCompteId) return false;
    return seniors.some(s => s.id === c.chargeCompteId);
  });
  
  console.log(`✅ Clients assigned to Gestionnaire Seniors: ${clientsWithSenior.length}`);
  clientsWithSenior.forEach(c => {
    console.log(`  - ${c.name} → ${c.chargeCompte?.fullName}`);
  });
  
  // Check clients without assignment
  const clientsWithoutSenior = clients.filter(c => !c.chargeCompteId);
  console.log(`\n⚠️  Clients WITHOUT chargeCompteId: ${clientsWithoutSenior.length}`);
  if (clientsWithoutSenior.length > 0) {
    console.log('First 5:');
    clientsWithoutSenior.slice(0, 5).forEach(c => {
      console.log(`  - ${c.name} (ID: ${c.id})`);
    });
  }
  
  // Check clients assigned to non-seniors
  const clientsWithOthers = clients.filter(c => {
    if (!c.chargeCompteId) return false;
    return !seniors.some(s => s.id === c.chargeCompteId);
  });
  
  console.log(`\n📋 Clients assigned to OTHER users (not seniors): ${clientsWithOthers.length}`);
  if (clientsWithOthers.length > 0) {
    console.log('First 5:');
    clientsWithOthers.slice(0, 5).forEach(c => {
      console.log(`  - ${c.name} → ${c.chargeCompte?.fullName} (${c.chargeCompte?.role})`);
    });
  }
  
  // SUGGESTION: Assign some clients to seniors
  if (seniors.length > 0 && clientsWithoutSenior.length > 0) {
    console.log('\n💡 SUGGESTION: To assign clients to seniors, run:');
    console.log(`
// Assign first 10 clients to ${seniors[0].fullName}
await prisma.client.updateMany({
  where: { 
    id: { in: [${clientsWithoutSenior.slice(0, 10).map(c => `'${c.id}'`).join(', ')}] }
  },
  data: { chargeCompteId: '${seniors[0].id}' }
});
    `);
  }
  
  await prisma.$disconnect();
}

checkAndAssignClients().catch(console.error);
