const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBordereaux() {
  try {
    console.log('🔍 Checking Bordereaux Data...\n');

    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📋 BORDEREAUX (${bordereaux.length} total):`);
    bordereaux.forEach((b, i) => {
      console.log(`  ${i + 1}. ID: ${b.id}`);
      console.log(`     Reference: ${b.reference}`);
      console.log(`     Client: ${b.client?.name || 'No Client'}`);
      console.log(`     Status: ${b.statut}`);
      console.log(`     Created: ${b.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking bordereaux:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereaux();