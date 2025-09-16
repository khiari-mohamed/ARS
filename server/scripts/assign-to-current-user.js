const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignToCurrentUser() {
  console.log('🔧 Assigning reclamations to Test Gestionnaire...');

  // Assign all reclamations to the logged-in user (Test Gestionnaire)
  const result = await prisma.reclamation.updateMany({
    data: { assignedToId: 'f7d0493c-f2a4-4241-8abc-b80ce85913cc' }
  });

  console.log(`✅ Assigned ${result.count} reclamations to Test Gestionnaire`);

  // Update history entries too
  const historyResult = await prisma.reclamationHistory.updateMany({
    where: { userId: '079d6252-1613-421e-91de-19ef843194b2' },
    data: { userId: 'f7d0493c-f2a4-4241-8abc-b80ce85913cc' }
  });

  console.log(`✅ Updated ${historyResult.count} history entries`);
}

assignToCurrentUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());