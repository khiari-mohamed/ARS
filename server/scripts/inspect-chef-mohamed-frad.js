const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectChefMohamedFrad() {
  console.log('\n========================================');
  console.log('🔍 INSPECTION: Chef d\'Équipe MOHAMED FRAD');
  console.log('========================================\n');

  try {
    // Find MOHAMED FRAD user
    const user = await prisma.user.findFirst({
      where: {
        fullName: { contains: 'MOHAMED FRAD', mode: 'insensitive' }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      console.log('❌ User MOHAMED FRAD not found');
      return;
    }

    console.log('👤 User Found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.fullName);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('\n');

    // Get contracts assigned to this chef
    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: user.id },
      include: { client: { select: { name: true } } }
    });

    console.log('📋 Contracts Assigned:', contracts.length);
    contracts.forEach(c => {
      console.log(`   - ${c.client?.name || 'N/A'} (Contract ID: ${c.id})`);
    });
    console.log('\n');

    // Get bordereaux for this chef's contracts
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: { teamLeaderId: user.id }
      },
      include: {
        client: { select: { name: true } },
        contract: { select: { id: true } },
        documents: { select: { id: true, status: true, type: true } }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log('📦 Total Bordereaux:', bordereaux.length);
    console.log('\n========================================');
    console.log('BORDEREAU DETAILS:');
    console.log('========================================\n');

    // Group by status
    const byStatus = {};
    bordereaux.forEach(b => {
      if (!byStatus[b.statut]) byStatus[b.statut] = [];
      byStatus[b.statut].push(b);
    });

    console.log('📊 By Status:');
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status}: ${byStatus[status].length}`);
    });
    console.log('\n');

    // Detailed list
    bordereaux.forEach((b, idx) => {
      const docCount = b.documents?.length || 0;
      const docsByStatus = {};
      const docsByType = {};
      
      b.documents?.forEach(d => {
        docsByStatus[d.status || 'NULL'] = (docsByStatus[d.status || 'NULL'] || 0) + 1;
        docsByType[d.type] = (docsByType[d.type] || 0) + 1;
      });

      console.log(`${idx + 1}. ${b.reference}`);
      console.log(`   Client: ${b.client?.name || 'N/A'}`);
      console.log(`   Status: ${b.statut}`);
      console.log(`   Date: ${b.dateReception?.toISOString().split('T')[0]}`);
      console.log(`   nombreBS (static): ${b.nombreBS}`);
      console.log(`   Documents (actual): ${docCount}`);
      
      if (docCount > 0) {
        console.log(`   Documents by Status:`);
        Object.keys(docsByStatus).forEach(s => {
          console.log(`      ${s}: ${docsByStatus[s]}`);
        });
        console.log(`   Documents by Type:`);
        Object.keys(docsByType).forEach(t => {
          console.log(`      ${t}: ${docsByType[t]}`);
        });
      }
      console.log('');
    });

    // Summary stats
    const totalDocs = bordereaux.reduce((sum, b) => sum + (b.documents?.length || 0), 0);
    const totalNombreBS = bordereaux.reduce((sum, b) => sum + (b.nombreBS || 0), 0);

    console.log('========================================');
    console.log('SUMMARY:');
    console.log('========================================');
    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log(`Total nombreBS (static field): ${totalNombreBS}`);
    console.log(`Total Documents (actual count): ${totalDocs}`);
    console.log(`Difference: ${totalDocs - totalNombreBS}`);
    console.log('\n');

    // Check corbeille categories
    const nonAffectes = bordereaux.filter(b => 
      ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'].includes(b.statut) && !b.assignedToUserId
    );
    const enCours = bordereaux.filter(b => 
      ['ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'].includes(b.statut)
    );
    const traites = bordereaux.filter(b => 
      ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut)
    );

    console.log('📥 CORBEILLE CATEGORIES:');
    console.log(`   Non Affectés: ${nonAffectes.length}`);
    console.log(`   En Cours: ${enCours.length}`);
    console.log(`   Traités: ${traites.length}`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectChefMohamedFrad();
