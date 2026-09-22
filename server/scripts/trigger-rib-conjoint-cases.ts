import 'dotenv/config';
import { AdherentService } from '../src/finance/adherent.service';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();
const adherentService = new AdherentService(prisma);
const marker = `RIBTEST${Date.now()}`;

async function uniqueRib(suffix: string): Promise<string> {
  const digits = `${Date.now()}${suffix}`.replace(/\D/g, '').slice(-20).padStart(20, '7');
  const existing = await prisma.adherent.findFirst({ where: { rib: digits } });
  return existing ? uniqueRib(`${suffix}9`) : digits;
}

async function main() {
  await prisma.$connect();

  const actor = await prisma.user.findFirst({
    where: { active: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!actor) throw new Error('Aucun utilisateur actif disponible pour lancer le test.');

  const client = await prisma.client.create({
    data: {
      name: `__${marker}`,
      reglementDelay: 30,
      reclamationDelay: 30,
      status: 'active',
    },
  });

  const case1Rib = await uniqueRib('1');
  const case2HolderRib = await uniqueRib('2');
  const case2TargetOldRib = await uniqueRib('3');

  const case1Holder = await prisma.adherent.create({
    data: {
      matricule: `${marker}-C1-HOLDER`,
      nom: 'Test',
      prenom: 'Conjoint A',
      clientId: client.id,
      rib: case1Rib,
      statut: 'ACTIF',
    },
  });

  const case2Holder = await prisma.adherent.create({
    data: {
      matricule: `${marker}-C2-HOLDER`,
      nom: 'Test',
      prenom: 'Conjoint B',
      clientId: client.id,
      rib: case2HolderRib,
      statut: 'ACTIF',
    },
  });

  const case2Target = await prisma.adherent.create({
    data: {
      matricule: `${marker}-C2-TARGET`,
      nom: 'Test',
      prenom: 'Conjoint C',
      clientId: client.id,
      rib: case2TargetOldRib,
      statut: 'ACTIF',
    },
  });

  let case1Blocked = false;
  try {
    await adherentService.createAdherent(
      {
        matricule: `${marker}-C1-NEW`,
        nom: 'Test',
        prenom: 'Conjoint Nouveau',
        clientId: client.id,
        rib: case1Rib,
        statut: 'ACTIF',
      },
      actor.id,
    );
  } catch (error: any) {
    case1Blocked = error?.message?.includes('already exists for adherent') || false;
  }

  let case2Blocked = false;
  try {
    await adherentService.updateAdherent(
      case2Target.id,
      { rib: case2HolderRib },
      actor.id,
    );
  } catch (error: any) {
    case2Blocked = error?.message?.includes('already exists for adherent') || false;
  }

  const notifications = await prisma.notification.findMany({
    where: {
      type: 'DUPLICATE_RIB_APPROVAL_REQUIRED',
      data: { path: ['importedBy'], equals: actor.id },
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: { id: true, userId: true, createdAt: true, data: true },
  });

  console.log('\nRIB conjoint test fixtures created');
  console.log(`Actor: ${actor.fullName} (${actor.role}) - ${actor.id}`);
  console.log(`Test client: ${client.name} - ${client.id}`);
  console.log('\nCase 1 - new conjoint without existing adherent:');
  console.log(`- Existing holder: ${case1Holder.matricule}`);
  console.log(`- Shared RIB: ${case1Rib}`);
  console.log(`- Duplicate request blocked and notification created: ${case1Blocked ? 'YES' : 'NO'}`);
  console.log('\nCase 2 - existing conjoint changes from one RIB to another:');
  console.log(`- Existing holder: ${case2Holder.matricule} -> ${case2HolderRib}`);
  console.log(`- Target adherent: ${case2Target.matricule} -> old RIB ${case2TargetOldRib}`);
  console.log(`- Duplicate request blocked and notification created: ${case2Blocked ? 'YES' : 'NO'}`);
  console.log(`- Expected after approval: ${case2Target.matricule} -> ${case2HolderRib}`);
  console.log('\nRecent approval notifications:');
  notifications.forEach((notification) => {
    const data = notification.data as any;
    const duplicate = data?.duplicates?.[0];
    console.log(`- ${notification.id} | recipient=${notification.userId} | operation=${duplicate?.operation || 'legacy CREATE'} | target=${duplicate?.targetAdherentId || 'new adherent'} | duplicateId=${duplicate?.id || 'n/a'}`);
  });
  console.log('\nApprove both notifications from the UI, then verify:');
  console.log(`- Case 1 creates ${marker}-C1-NEW with RIB ${case1Rib}`);
  console.log(`- Case 2 updates ${case2Target.matricule} to ${case2HolderRib}`);
  console.log(`- ${case2Holder.matricule} must remain unchanged.`);
}

main()
  .catch((error) => {
    console.error('RIB conjoint test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
