require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLES = [
  'TraitementHistory', 'BordereauAuditLog', 'ActionLog',
  'WorkflowNotification', 'Courrier',
  'BSLog', 'ExpertiseInfo', 'BulletinSoinItem', 'BulletinSoin',
  'DocumentAssignmentHistory', 'OCRLog', 'AlertLog', 'Document',
  'ReclamationHistory', 'Reclamation',
  'VirementHistory', 'VirementItem', 'OVDocument', 'OrdreVirement', 'Virement',
  'Bordereau',
];

async function main() {
  console.log('Connected to:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));
  console.log(`\nDisabling FK checks and truncating ${TABLES.length} tables...\n`);

  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`);

  const globalStart = Date.now();

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    const t = Date.now();
    console.log(`  [${i + 1}/${TABLES.length}] Truncating "${table}"...`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY`);
    console.log(`  [${i + 1}/${TABLES.length}] "${table}" done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }

  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`);

  console.log(`\nAll done in ${((Date.now() - globalStart) / 1000).toFixed(1)}s total`);
}

main()
  .catch(async (e) => {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`).catch(() => {});
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
