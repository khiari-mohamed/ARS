const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauAssignments() {
  console.log('=== Checking Bordereau Assignment Fields ===\n');

  const bordereaux = await prisma.bordereau.findMany({
    where: {
      reference: { in: ['PGH BR 20-2025 DE SIDI OTHMEN', 'bordx_senior_1', 'AIRBUS BR 34-2025'] }
    },
    include: {
      currentHandler: { select: { fullName: true, role: true } },
      team: { select: { fullName: true, role: true } },
      chargeCompte: { select: { fullName: true, role: true } }
    }
  });

  for (const b of bordereaux) {
    console.log(`\n--- ${b.reference} ---`);
    console.log(`assignedToUserId: ${b.assignedToUserId}`);
    console.log(`currentHandlerId: ${b.currentHandlerId}`);
    console.log(`teamId: ${b.teamId}`);
    console.log(`chargeCompteId: ${b.chargeCompteId}`);
    console.log(`currentHandler: ${b.currentHandler?.fullName} (${b.currentHandler?.role})`);
    console.log(`team: ${b.team?.fullName} (${b.team?.role})`);
    console.log(`chargeCompte: ${b.chargeCompte?.fullName} (${b.chargeCompte?.role})`);
    
    if (b.assignedToUserId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: b.assignedToUserId },
        select: { fullName: true, role: true }
      });
      console.log(`assignedToUser: ${assignedUser?.fullName} (${assignedUser?.role})`);
    }
  }

  await prisma.$disconnect();
}

checkBordereauAssignments().catch(console.error);
