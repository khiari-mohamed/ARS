const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCorbeilleLogic() {
  console.log('🧪 Testing Corbeille Logic...\n');
  
  // Find the senior user
  const senior = await prisma.user.findFirst({
    where: { role: 'GESTIONNAIRE_SENIOR' }
  });
  
  if (!senior) {
    console.log('❌ No GESTIONNAIRE_SENIOR found');
    return;
  }
  
  console.log('👤 Senior:', senior.fullName, `(${senior.email})`);
  console.log('🆔 User ID:', senior.id);
  
  // Find clients managed by this senior
  const clients = await prisma.client.findMany({
    where: { chargeCompteId: senior.id },
    select: { id: true, name: true }
  });
  
  console.log('\n🏢 Clients Managed:', clients.length);
  clients.forEach(c => console.log('   -', c.name));
  
  const clientIds = clients.map(c => c.id);
  
  if (!clientIds.length) {
    console.log('❌ No clients found for this senior');
    return;
  }
  
  // Get documents for those clients
  const docs = await prisma.document.findMany({
    where: {
      bordereau: { 
        clientId: { in: clientIds }, 
        archived: false 
      }
    },
    select: { id: true, status: true, assignedToUserId: true }
  });
  
  console.log('\n📄 Total Documents:', docs.length);
  
  const nonAffectes = docs.filter(d => !d.assignedToUserId).length;
  const traites = docs.filter(d => (d.status || '').toUpperCase() === 'TRAITE').length;
  const enCours = docs.filter(d => {
    const s = (d.status || '').toUpperCase();
    if (s === 'TRAITE') return false;
    if (!d.assignedToUserId) return false;
    return true;
  }).length;
  
  console.log('\n📊 Calculated Stats:');
  console.log('   ✅ Traités:', traites);
  console.log('   🔄 En Cours:', enCours);
  console.log('   📥 Non Affectés:', nonAffectes);
  
  console.log('\n✅ This is what the API should return!');
  
  await prisma.$disconnect();
}

testCorbeilleLogic().catch(console.error);
