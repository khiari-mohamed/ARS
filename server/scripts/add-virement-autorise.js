const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TYPE "EtatVirement" ADD VALUE IF NOT EXISTS 'VIREMENT_AUTORISE'`);
  console.log('✅ VIREMENT_AUTORISE added to EtatVirement enum');
}

main()
  .catch(e => console.error('❌ Error:', e))
  .finally(() => prisma.$disconnect());
