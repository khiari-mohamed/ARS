import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resolveOldAlert() {
  console.log('🔄 Resolving old TEAM_OVERLOAD alert...');

  try {
    const result = await prisma.alertLog.updateMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        resolved: false,
        message: { contains: '51 dossiers / 20 capacité' }
      },
      data: {
        resolved: true,
        resolvedAt: new Date()
      }
    });

    console.log(`✅ Resolved ${result.count} alerts`);
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resolveOldAlert();
