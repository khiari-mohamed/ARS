const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySeniorAdherents() {
  try {
    console.log('🔍 Verifying GESTIONNAIRE_SENIOR adherents access...\n');
    
    // Find Cyrine Chouk
    const senior = await prisma.user.findFirst({
      where: {
        role: 'GESTIONNAIRE_SENIOR',
        fullName: { contains: 'Cyrine' }
      }
    });
    
    if (!senior) {
      console.log('❌ Cyrine Chouk not found');
      return;
    }
    
    console.log('✅ Testing for GESTIONNAIRE_SENIOR:');
    console.log(`Name: ${senior.fullName}`);
    console.log(`ID: ${senior.id}`);
    console.log(`Role: ${senior.role}\n`);
    
    // Get assigned contracts
    const assignedContracts = await prisma.contract.findMany({
      where: { teamLeaderId: senior.id },
      include: { client: true }
    });
    
    console.log(`📋 Assigned Contracts: ${assignedContracts.length}`);
    const clientIds = assignedContracts.map(c => c.clientId);
    const clientNames = assignedContracts.map(c => c.client.name);
    console.log('Assigned Clients:', clientNames.join(', '));
    console.log('');
    
    // Get ALL adherents in database
    const allAdherents = await prisma.adherent.findMany({
      include: { client: true },
      orderBy: { matricule: 'asc' }
    });
    
    console.log(`📊 Total adherents in database: ${allAdherents.length}\n`);
    
    // Filter adherents by assigned clients
    const seniorAdherents = allAdherents.filter(a => clientIds.includes(a.clientId));
    
    console.log(`✅ Adherents SENIOR SHOULD SEE: ${seniorAdherents.length}`);
    console.log('────────────────────────────────────────────────────────────────');
    
    // Group by client
    const byClient = {};
    seniorAdherents.forEach(a => {
      if (!byClient[a.client.name]) {
        byClient[a.client.name] = [];
      }
      byClient[a.client.name].push(a);
    });
    
    Object.keys(byClient).sort().forEach(clientName => {
      const adherents = byClient[clientName];
      console.log(`\n${clientName} (${adherents.length} adhérent(s)):`);
      adherents.forEach(a => {
        console.log(`  • Matricule: ${a.matricule} | Nom: ${a.nom} ${a.prenom}`);
      });
    });
    
    console.log('\n────────────────────────────────────────────────────────────────');
    console.log(`\n❌ Adherents SENIOR SHOULD NOT SEE: ${allAdherents.length - seniorAdherents.length}`);
    
    const otherAdherents = allAdherents.filter(a => !clientIds.includes(a.clientId));
    const otherByClient = {};
    otherAdherents.forEach(a => {
      if (!otherByClient[a.client.name]) {
        otherByClient[a.client.name] = [];
      }
      otherByClient[a.client.name].push(a);
    });
    
    Object.keys(otherByClient).sort().forEach(clientName => {
      const adherents = otherByClient[clientName];
      console.log(`\n${clientName} (${adherents.length} adhérent(s)) - NOT ASSIGNED`);
    });
    
    console.log('\n====================================================================================================');
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log(`Senior should see: ${seniorAdherents.length} adherents`);
    console.log(`Senior should NOT see: ${otherAdherents.length} adherents`);
    console.log('====================================================================================================\n');
    
    // Check what UI is showing
    console.log('📱 UI VERIFICATION:');
    console.log('UI shows: 14 adherents');
    console.log(`Expected: ${seniorAdherents.length} adherents`);
    
    if (seniorAdherents.length === 14) {
      console.log('✅ CORRECT: UI matches expected count!');
    } else {
      console.log(`❌ MISMATCH: UI shows 14 but should show ${seniorAdherents.length}`);
    }
    
    // Verify the specific adherents shown in UI
    console.log('\n📋 Verifying UI adherents:');
    const uiAdherents = [
      { matricule: '11', client: 'MECAPROTEC' },
      { matricule: '12', client: 'MECAPROTEC' },
      { matricule: '13', client: 'MECAPROTEC' },
      { matricule: '14', client: 'MECAPROTEC' },
      { matricule: '17', client: 'MECAPROTEC' },
      { matricule: '2', client: 'MECAPROTEC' },
      { matricule: '3', client: 'MECAPROTEC' },
      { matricule: '4', client: 'MECAPROTEC' },
      { matricule: '5', client: 'MECAPROTEC' },
      { matricule: '6', client: 'MECAPROTEC' },
      { matricule: '7', client: 'MECAPROTEC' },
      { matricule: '8', client: 'MECAPROTEC' },
      { matricule: '9', client: 'MECAPROTEC' },
      { matricule: 'M001', client: 'AMARIS' }
    ];
    
    let allCorrect = true;
    uiAdherents.forEach(ui => {
      const found = seniorAdherents.find(a => a.matricule === ui.matricule && a.client.name === ui.client);
      if (found) {
        console.log(`✅ ${ui.client} - ${ui.matricule}: CORRECT (assigned to senior)`);
      } else {
        console.log(`❌ ${ui.client} - ${ui.matricule}: WRONG (NOT assigned to senior)`);
        allCorrect = false;
      }
    });
    
    if (allCorrect) {
      console.log('\n✅ ALL UI ADHERENTS ARE CORRECT!');
    } else {
      console.log('\n❌ SOME UI ADHERENTS ARE INCORRECT!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeniorAdherents();
