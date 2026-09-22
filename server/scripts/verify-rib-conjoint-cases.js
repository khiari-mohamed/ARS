require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const marker = 'RIBTEST1790075389316';

async function main() {
  const adherents = await prisma.adherent.findMany({
    where: { matricule: { startsWith: marker } },
    select: {
      matricule: true,
      nom: true,
      prenom: true,
      rib: true,
      client: { select: { name: true } },
    },
    orderBy: { matricule: 'asc' },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      type: 'DUPLICATE_RIB_APPROVAL_REQUIRED',
      data: { path: ['importedByName'], equals: 'Naim Boughanmi' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, data: true },
  });

  const approvals = notifications.flatMap((notification) =>
    ((notification.data && notification.data.duplicates) || []).map((duplicate) => ({
      notificationId: notification.id,
      duplicateId: duplicate.id,
      status: duplicate.status,
      operation: duplicate.operation || 'CREATE',
      targetAdherentId: duplicate.targetAdherentId || null,
    })),
  );

  console.log('Adherents:');
  console.log(JSON.stringify(adherents, null, 2));
  console.log('Approvals:');
  console.log(JSON.stringify(approvals, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
