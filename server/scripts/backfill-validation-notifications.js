const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const shouldApply = process.argv.includes('--apply');

async function main() {
  const responsibleUsers = await prisma.user.findMany({
    where: {
      role: 'RESPONSABLE_DEPARTEMENT',
      active: true,
    },
    select: { id: true, fullName: true, email: true },
  });

  if (responsibleUsers.length === 0) {
    console.log('No active RESPONSABLE_DEPARTEMENT users found. Nothing to backfill.');
    return;
  }

  const pendingOVs = await prisma.ordreVirement.findMany({
    where: { validationStatus: 'EN_ATTENTE_VALIDATION' },
    select: {
      id: true,
      reference: true,
      utilisateurSante: true,
    },
    orderBy: { dateCreation: 'asc' },
  });

  const existingNotifications = await prisma.notification.findMany({
    where: {
      type: 'OV_PENDING_VALIDATION',
      userId: { in: responsibleUsers.map(user => user.id) },
    },
    select: {
      userId: true,
      data: true,
    },
  });

  const notifiedByUser = new Set(
    existingNotifications
      .map(notification => {
        const ordreVirementId = notification.data && notification.data.ordreVirementId;
        return ordreVirementId ? `${notification.userId}:${ordreVirementId}` : null;
      })
      .filter(Boolean),
  );

  const missing = [];
  for (const ov of pendingOVs) {
    for (const user of responsibleUsers) {
      const key = `${user.id}:${ov.id}`;
      if (!notifiedByUser.has(key)) {
        missing.push({ ov, user });
      }
    }
  }

  console.log(`Pending OVs checked: ${pendingOVs.length}`);
  console.log(`Active responsables checked: ${responsibleUsers.length}`);
  console.log(`Existing validation notifications checked: ${existingNotifications.length}`);
  console.log(`Missing notifications found: ${missing.length}`);

  if (missing.length === 0) {
    console.log('No orphaned validation notifications found.');
    return;
  }

  for (const { ov, user } of missing) {
    console.log(`- ${ov.reference} -> ${user.fullName || user.email || user.id}`);
  }

  if (!shouldApply) {
    console.log('\nDry run only. Re-run with --apply to create the missing notifications.');
    return;
  }

  const result = await prisma.notification.createMany({
    data: missing.map(({ ov, user }) => ({
      userId: user.id,
      type: 'OV_PENDING_VALIDATION',
      title: 'Nouvel OV à valider',
      message: `Nouvel OV ${ov.reference} créé et en attente de validation`,
      data: {
        ordreVirementId: ov.id,
        reference: ov.reference,
        createdBy: ov.utilisateurSante,
        backfilled: true,
      },
    })),
  });

  console.log(`\nBackfilled notifications created: ${result.count}`);
}

main()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
