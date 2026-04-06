const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testChefEquipeAccess() {
  try {
    console.log('🔍 Testing CHEF_EQUIPE access in Finance module...\n');
    
    // Find a CHEF_EQUIPE user
    const chefEquipe = await prisma.user.findFirst({
      where: { role: 'CHEF_EQUIPE' }
    });
    
    if (!chefEquipe) {
      console.log('❌ No CHEF_EQUIPE user found');
      return;
    }
    
    console.log('✅ Testing for CHEF_EQUIPE:');
    console.log(`Name: ${chefEquipe.fullName}`);
    console.log(`ID: ${chefEquipe.id}`);
    console.log(`Role: ${chefEquipe.role}\n`);
    
    // Get assigned contracts
    const assignedContracts = await prisma.contract.findMany({
      where: { teamLeaderId: chefEquipe.id },
      include: { client: true }
    });
    
    console.log(`📋 Assigned Contracts: ${assignedContracts.length}`);
    const clientIds = assignedContracts.map(c => c.clientId);
    const clientNames = assignedContracts.map(c => c.client.name);
    console.log('Assigned Clients:', clientNames.join(', '));
    console.log('');
    
    // Test 1: Bordereaux Traités
    console.log('📊 TEST 1: Bordereaux Traités');
    console.log('────────────────────────────────────────');
    
    const allBordereauxTraites = await prisma.bordereau.findMany({
      where: {
        OR: [
          { statut: 'TRAITE' },
          { ordresVirement: { some: {} } }
        ],
        archived: false
      },
      include: {
        client: true,
        contract: {
          include: {
            teamLeader: { select: { id: true, fullName: true } }
          }
        }
      }
    });
    
    const chefBordereauxTraites = allBordereauxTraites.filter(b => 
      b.contract?.teamLeaderId === chefEquipe.id
    );
    
    console.log(`Total bordereaux traités in DB: ${allBordereauxTraites.length}`);
    console.log(`Chef should see: ${chefBordereauxTraites.length}`);
    console.log(`Chef should NOT see: ${allBordereauxTraites.length - chefBordereauxTraites.length}\n`);
    
    // Test 2: Manual OV Entries
    console.log('📊 TEST 2: Manual OV Entries (no bordereau)');
    console.log('────────────────────────────────────────');
    
    const allManualOVs = await prisma.ordreVirement.findMany({
      where: { bordereauId: null }
    });
    
    const chefManualOVs = allManualOVs.filter(ov => 
      ov.utilisateurSante === chefEquipe.id
    );
    
    console.log(`Total manual OVs in DB: ${allManualOVs.length}`);
    console.log(`Chef should see: ${chefManualOVs.length} (created by them)`);
    console.log(`Chef should NOT see: ${allManualOVs.length - chefManualOVs.length}\n`);
    
    // Test 3: Dashboard Recent OVs
    console.log('📊 TEST 3: Dashboard - Recent OVs');
    console.log('────────────────────────────────────────');
    
    const allOVs = await prisma.ordreVirement.findMany({
      include: {
        bordereau: {
          include: {
            contract: true
          }
        }
      }
    });
    
    const chefOVs = allOVs.filter(ov => {
      // Manual OVs created by chef
      if (!ov.bordereauId && ov.utilisateurSante === chefEquipe.id) {
        return true;
      }
      // OVs from assigned contracts
      if (ov.bordereau?.contract?.teamLeaderId === chefEquipe.id) {
        return true;
      }
      return false;
    });
    
    console.log(`Total OVs in DB: ${allOVs.length}`);
    console.log(`Chef should see: ${chefOVs.length}`);
    console.log(`Chef should NOT see: ${allOVs.length - chefOVs.length}\n`);
    
    // Summary
    console.log('====================================================================================================');
    console.log('🎯 EXPECTED BEHAVIOR FOR CHEF_EQUIPE:');
    console.log(`Bordereaux Traités: Should see ${chefBordereauxTraites.length} out of ${allBordereauxTraites.length}`);
    console.log(`Manual OV Entries: Should see ${chefManualOVs.length} out of ${allManualOVs.length}`);
    console.log(`Dashboard Recent OVs: Should see ${chefOVs.length} out of ${allOVs.length}`);
    console.log('====================================================================================================\n');
    
    // Show breakdown by client
    console.log('📋 Breakdown by Client:');
    console.log('────────────────────────────────────────');
    
    const byClient = {};
    chefBordereauxTraites.forEach(b => {
      if (!byClient[b.client.name]) {
        byClient[b.client.name] = { bordereaux: 0, ovs: 0 };
      }
      byClient[b.client.name].bordereaux++;
    });
    
    chefOVs.forEach(ov => {
      const clientName = ov.bordereau?.client?.name || 'Manual Entry';
      if (!byClient[clientName]) {
        byClient[clientName] = { bordereaux: 0, ovs: 0 };
      }
      byClient[clientName].ovs++;
    });
    
    Object.keys(byClient).sort().forEach(clientName => {
      const data = byClient[clientName];
      console.log(`${clientName}: ${data.bordereaux} bordereau(x), ${data.ovs} OV(s)`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChefEquipeAccess();
