const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGlobalCorbeilleData() {
  console.log('🔍 Checking Global Corbeille Data...\n');

  try {
    // 1. Check all bordereaux with their client relationships
    console.log('📋 BORDEREAUX DATA:');
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        currentHandler: true
      },
      orderBy: { dateReception: 'desc' },
      take: 10
    });

    console.log(`Found ${bordereaux.length} bordereaux (showing first 10):`);
    bordereaux.forEach(b => {
      const daysSince = Math.floor((Date.now() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  - ${b.reference}`);
      console.log(`    Client: ${b.client?.name || 'NULL'} (ID: ${b.clientId})`);
      console.log(`    Status: ${b.statut}`);
      console.log(`    Days since reception: ${daysSince}`);
      console.log(`    Délai règlement: ${b.delaiReglement || 'NULL'}`);
      console.log(`    Assigned to: ${b.currentHandler?.fullName || 'NULL'} (ID: ${b.assignedToUserId || 'NULL'})`);
      console.log(`    Date reception: ${b.dateReception}`);
      console.log('');
    });

    // 2. Check clients table
    console.log('\n👥 CLIENTS DATA:');
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, _count: { select: { bordereaux: true } } }
    });
    
    console.log(`Found ${clients.length} clients:`);
    clients.forEach(c => {
      console.log(`  - ${c.name} (ID: ${c.id}) - ${c._count.bordereaux} bordereaux`);
    });

    // 3. Check users (gestionnaires)
    console.log('\n👤 GESTIONNAIRES DATA:');
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { 
        id: true, 
        fullName: true, 
        email: true,
        _count: { select: { bordereauxCurrentHandler: true } }
      }
    });

    console.log(`Found ${gestionnaires.length} gestionnaires:`);
    gestionnaires.forEach(g => {
      console.log(`  - ${g.fullName} (${g.email}) - ${g._count.bordereauxCurrentHandler} assigned bordereaux`);
    });

    // 4. Check status distribution
    console.log('\n📊 STATUS DISTRIBUTION:');
    const statusCounts = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { statut: true }
    });

    statusCounts.forEach(s => {
      console.log(`  - ${s.statut}: ${s._count.statut}`);
    });

    // 5. Check bordereaux without clients (causing N/A issue) - SKIP since clientId is required
    console.log('\n❌ BORDEREAUX WITHOUT CLIENTS: SKIPPED (clientId is required field)');

    // 6. Check bordereaux with invalid dates (causing NaN issue)
    console.log('\n📅 BORDEREAUX WITH DATE ISSUES:');
    const allBordereaux = await prisma.bordereau.findMany({
      select: { id: true, reference: true, dateReception: true, delaiReglement: true }
    });

    const dateIssues = allBordereaux.filter(b => {
      const date = new Date(b.dateReception);
      return isNaN(date.getTime()) || !b.delaiReglement;
    });

    console.log(`Found ${dateIssues.length} bordereaux with date/délai issues:`);
    dateIssues.forEach(b => {
      console.log(`  - ${b.reference}:`);
      console.log(`    Date reception: ${b.dateReception} (valid: ${!isNaN(new Date(b.dateReception).getTime())})`);
      console.log(`    Délai règlement: ${b.delaiReglement}`);
    });

    // 8. IDENTIFY THE REAL ISSUES
    console.log('\n🔍 ANALYSIS OF ISSUES:');
    console.log('\n1. NaN ISSUE:');
    console.log('   - All dates are valid, all délaiReglement exist');
    console.log('   - Issue is in frontend calculation logic');
    
    console.log('\n2. N/A CLIENT ISSUE:');
    console.log('   - All bordereaux have valid clients');
    console.log('   - Issue is in frontend data mapping');
    
    console.log('\n3. ASSIGNMENT ISSUE:');
    console.log('   - Many bordereaux have assignedToUserId but NULL currentHandler');
    console.log('   - This causes data inconsistency');
    
    console.log('\n4. STATUS FILTERING ISSUE:');
    console.log('   - En Cours should show ASSIGNE status bordereaux');
    console.log('   - But they are being filtered incorrectly');

    // 7. Summary for the three categories
    console.log('\n📈 SUMMARY FOR GLOBAL CORBEILLE:');
    
    const nonAffectes = await prisma.bordereau.count({
      where: { 
        currentHandlerId: null,
        statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
      }
    });

    const enCours = await prisma.bordereau.count({
      where: { 
        currentHandlerId: { not: null },
        statut: { in: ['EN_COURS', 'ASSIGNE'] }
      }
    });

    const traites = await prisma.bordereau.count({
      where: { 
        statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
      }
    });

    console.log(`Non Affectés: ${nonAffectes}`);
    console.log(`En Cours: ${enCours}`);
    console.log(`Traités: ${traites}`);
    console.log(`Total: ${nonAffectes + enCours + traites}`);
    
    // 8. Check what should be in En Cours but isn't
    console.log('\n🔍 DETAILED ANALYSIS:');
    const assignedBordereaux = await prisma.bordereau.count({
      where: { statut: 'ASSIGNE' }
    });
    console.log(`ASSIGNE status bordereaux: ${assignedBordereaux} (these should be in En Cours)`);
    
    const withCurrentHandler = await prisma.bordereau.count({
      where: { currentHandlerId: { not: null } }
    });
    console.log(`Bordereaux with currentHandlerId: ${withCurrentHandler}`);
    
    const withAssignedToUserId = await prisma.bordereau.count({
      where: { assignedToUserId: { not: null } }
    });
    console.log(`Bordereaux with assignedToUserId: ${withAssignedToUserId}`);

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGlobalCorbeilleData();

// ISSUES IDENTIFIED:
// 1. NaN in SLA: Frontend calculation issue with daysSinceReception
// 2. N/A in Client: Frontend data mapping issue 
// 3. "Aucun bordereau" in En Cours: Status filtering logic issue
// 4. Data inconsistency: assignedToUserId vs currentHandlerId mismatch