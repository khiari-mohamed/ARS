const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectGestionnaireJihed() {
  console.log('\n========================================');
  console.log('🔍 INSPECTION: Gestionnaire JIHED YAHYAOUI');
  console.log('========================================\n');

  try {
    const user = await prisma.user.findFirst({
      where: { fullName: { contains: 'JIHED YAHYAOUI', mode: 'insensitive' } },
      select: { id: true, fullName: true, email: true, role: true }
    });

    if (!user) {
      console.log('❌ User JIHED YAHYAOUI not found');
      return;
    }

    console.log('👤 User Found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.fullName);
    console.log('   Role:', user.role);
    console.log('\n');

    // Get bordereaux with documents assigned to this gestionnaire
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        documents: {
          some: { assignedToUserId: user.id }
        }
      },
      include: {
        client: { select: { name: true } },
        documents: {
          where: { assignedToUserId: user.id },
          select: { id: true, status: true, type: true, name: true }
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log('📦 Total Bordereaux with assigned documents:', bordereaux.length);
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
    let totalDocs = 0;
    let totalNombreBS = 0;

    bordereaux.forEach((b, idx) => {
      const docCount = b.documents?.length || 0;
      totalDocs += docCount;
      totalNombreBS += b.nombreBS || 0;

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
      console.log(`   Documents assigned to JIHED: ${docCount}`);
      
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

    console.log('========================================');
    console.log('SUMMARY:');
    console.log('========================================');
    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log(`Total nombreBS (static field): ${totalNombreBS}`);
    console.log(`Total Documents assigned to JIHED: ${totalDocs}`);
    console.log(`Difference: ${totalDocs - totalNombreBS}`);
    console.log('\n');

    // Check corbeille categories
    const enCours = bordereaux.filter(b => ['ASSIGNE', 'EN_COURS'].includes(b.statut));
    const traites = bordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
    const retournes = bordereaux.filter(b => ['REJETE', 'EN_DIFFICULTE'].includes(b.statut));

    console.log('📥 CORBEILLE CATEGORIES:');
    console.log(`   En Cours: ${enCours.length}`);
    console.log(`   Traités: ${traites.length}`);
    console.log(`   Retournés: ${retournes.length}`);
    console.log('\n');

    // Document type breakdown
    const allDocs = bordereaux.flatMap(b => b.documents);
    const docTypeBreakdown = {};
    allDocs.forEach(d => {
      docTypeBreakdown[d.type] = (docTypeBreakdown[d.type] || 0) + 1;
    });

    console.log('📄 DOCUMENTS BY TYPE:');
    Object.keys(docTypeBreakdown).forEach(type => {
      console.log(`   ${type}: ${docTypeBreakdown[type]}`);
    });
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectGestionnaireJihed();
