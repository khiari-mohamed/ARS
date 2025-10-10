const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugGestionnaireBordereaux(userId) {
  console.log('🔍 ========== DEBUG GESTIONNAIRE BORDEREAUX ==========');
  console.log('👤 User ID:', userId);
  console.log('');

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true }
    });

    if (!user) {
      console.error('❌ User not found!');
      return;
    }

    console.log('👤 USER:', user.fullName, '| Role:', user.role);
    console.log('');

    const bordereaux = await prisma.bordereau.findMany({
      where: { assignedToUserId: userId },
      include: {
        client: { select: { name: true } },
        BulletinSoin: { select: { id: true, etat: true } }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log('📊 TOTAL ASSIGNED:', bordereaux.length);
    console.log('');

    const stats = {
      total: bordereaux.length,
      enCours: bordereaux.filter(b => b.statut === 'EN_COURS').length,
      traites: bordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length,
      retournes: bordereaux.filter(b => ['REJETE', 'RETOURNE'].includes(b.statut)).length,
      assigne: bordereaux.filter(b => b.statut === 'ASSIGNE').length,
      autres: bordereaux.filter(b => !['EN_COURS', 'TRAITE', 'CLOTURE', 'REJETE', 'RETOURNE', 'ASSIGNE'].includes(b.statut)).length
    };

    console.log('📈 STATS:');
    console.log('   Total assignés:', stats.total);
    console.log('   En cours:', stats.enCours);
    console.log('   Traités:', stats.traites);
    console.log('   Retournés:', stats.retournes);
    console.log('   Assigné (status):', stats.assigne);
    console.log('   Autres:', stats.autres);
    console.log('');

    console.log('📋 BORDEREAUX LIST:');
    console.log('='.repeat(100));
    bordereaux.forEach((b, i) => {
      console.log(`${i + 1}. ${b.reference} | Client: ${b.client?.name || 'N/A'} | Statut: ${b.statut} | BS: ${b.nombreBS || 0} | Date: ${b.dateReception?.toLocaleDateString('fr-FR') || 'N/A'}`);
    });
    console.log('='.repeat(100));

    console.log('\n✅ COMPLETE');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node debug-gestionnaire-bordereaux.js <userId>');
  process.exit(1);
}

debugGestionnaireBordereaux(userId);
