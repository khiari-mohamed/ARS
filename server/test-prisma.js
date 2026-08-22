const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error'] });

async function main() {
  try {
    const result = await prisma.bordereau.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('✅ SUCCESS:', result.length, 'rows returned');
  } catch (e) {
    console.error('❌ FAILED:', e);
  }
}

main().finally(() => prisma.$disconnect());
