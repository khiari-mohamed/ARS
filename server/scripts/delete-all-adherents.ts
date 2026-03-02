import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllAdherents() {
  console.log('🗑️  Deleting all adherents...\n');

  // Delete RIB history first
  const ribHistoryCount = await prisma.adherentRibHistory.deleteMany({});
  console.log(`✅ Deleted ${ribHistoryCount.count} RIB history records`);

  // Delete all adherents
  const adherentsCount = await prisma.adherent.deleteMany({});
  console.log(`✅ Deleted ${adherentsCount.count} adherents`);

  console.log('\n✅ All adherents deleted successfully!');

  await prisma.$disconnect();
}

deleteAllAdherents()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
