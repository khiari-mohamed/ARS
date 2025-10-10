const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeGestionnaireStatuses(userId) {
  console.log('🔍 ========== ANALYZE GESTIONNAIRE STATUSES ==========');
  console.log('👤 User ID:', userId);
  console.log('');

  try {
    // Get bordereaux with documents assigned to gestionnaire
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        documents: {
          some: { assignedToUserId: userId }
        },
        archived: false
      },
      include: {
        client: { select: { name: true } },
        documents: { 
          where: { assignedToUserId: userId },
          select: { id: true, status: true, type: true }
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log('📊 TOTAL BORDEREAUX:', bordereaux.length);
    console.log('');

    // Group by status
    const byStatus = {};
    bordereaux.forEach(b => {
      if (!byStatus[b.statut]) byStatus[b.statut] = [];
      byStatus[b.statut].push(b);
    });

    console.log('📈 BORDEREAUX BY STATUS:');
    Object.keys(byStatus).sort().forEach(status => {
      console.log(`   ${status}: ${byStatus[status].length}`);
    });
    console.log('');

    console.log('📋 DETAILED LIST:');
    console.log('='.repeat(100));
    bordereaux.forEach((b, i) => {
      console.log(`${i + 1}. ${b.reference}`);
      console.log(`   Client: ${b.client?.name || 'N/A'}`);
      console.log(`   Statut: ${b.statut}`);
      console.log(`   Documents assignés: ${b.documents.length}`);
      console.log(`   Date: ${b.dateReception?.toLocaleDateString('fr-FR') || 'N/A'}`);
      console.log('');
    });
    console.log('='.repeat(100));

    console.log('\n📊 RECOMMENDED STATUS MAPPING:');
    console.log('');
    console.log('En cours (À traiter):');
    const enCoursStatuses = Object.keys(byStatus).filter(s => !['TRAITE', 'CLOTURE', 'REJETE', 'RETOURNE'].includes(s));
    enCoursStatuses.forEach(s => console.log(`   - ${s}: ${byStatus[s].length}`));
    console.log(`   TOTAL: ${enCoursStatuses.reduce((sum, s) => sum + byStatus[s].length, 0)}`);
    console.log('');

    console.log('Traités:');
    const traitesStatuses = ['TRAITE', 'CLOTURE'].filter(s => byStatus[s]);
    traitesStatuses.forEach(s => console.log(`   - ${s}: ${byStatus[s].length}`));
    console.log(`   TOTAL: ${traitesStatuses.reduce((sum, s) => sum + (byStatus[s]?.length || 0), 0)}`);
    console.log('');

    console.log('Retournés:');
    const retournesStatuses = ['REJETE', 'RETOURNE'].filter(s => byStatus[s]);
    retournesStatuses.forEach(s => console.log(`   - ${s}: ${byStatus[s].length}`));
    console.log(`   TOTAL: ${retournesStatuses.reduce((sum, s) => sum + (byStatus[s]?.length || 0), 0)}`);
    console.log('');

    console.log('✅ COMPLETE');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node analyze-gestionnaire-statuses.js <userId>');
  process.exit(1);
}

analyzeGestionnaireStatuses(userId);
