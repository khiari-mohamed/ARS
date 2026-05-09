const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const mariem = await prisma.user.findFirst({
    where: { email: 'mariem.abessi@arstunisie.com' }
  });

  const bordereaux = await prisma.bordereau.findMany({
    where: {
      assignedToUserId: mariem.id,
      statut: 'VIREMENT_EXECUTE'
    },
    include: { client: true }
  });

  console.log(`Found ${bordereaux.length} VIREMENT_EXECUTE bordereaux for Mariem:\n`);
  bordereaux.forEach(b => {
    console.log(`✅ ${b.reference} - ${b.client.name} - ${b.statut}`);
  });

  await prisma.$disconnect();
}

verify();
