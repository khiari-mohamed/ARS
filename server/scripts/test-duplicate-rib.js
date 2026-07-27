/**
 * test-duplicate-rib.js
 * Finds an existing adherent and inserts a duplicate RIB with a different matricule
 * to trigger the notification on the UI for testing the approve flow.
 *
 * Usage: node scripts/test-duplicate-rib.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find an existing adherent to use as the "existing" one
  const existing = await prisma.adherent.findFirst({
    include: { client: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!existing) {
    console.error('❌ No adherents found in DB');
    return;
  }

  console.log('✅ Found existing adherent:');
  console.log(`   Matricule : ${existing.matricule}`);
  console.log(`   Nom       : ${existing.nom} ${existing.prenom}`);
  console.log(`   RIB       : ${existing.rib}`);
  console.log(`   Client    : ${existing.client.name}`);

  // 2. Find a SUPER_ADMIN or RESPONSABLE_DEPARTEMENT user to act as the importer
  const importer = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT'] }, active: true }
  });

  if (!importer) {
    console.error('❌ No SUPER_ADMIN or RESPONSABLE_DEPARTEMENT user found');
    return;
  }

  console.log(`\n✅ Importer: ${importer.fullName} (${importer.role})`);

  // 3. Find users to notify (SUPER_ADMIN + RESPONSABLE_DEPARTEMENT)
  const notifyUsers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'RESPONSABLE_DEPARTEMENT'] }, active: true }
  });

  console.log(`\n✅ Will notify ${notifyUsers.length} user(s)`);

  // 4. Build the fake duplicate — same RIB, different matricule
  const fakeMatricule = `TEST_${Date.now()}`;
  const timestamp = new Date().toISOString();

  const duplicateEntry = {
    id: `DUP_${timestamp}_0`,
    status: 'PENDING',
    newAdherent: {
      matricule: fakeMatricule,
      nom: 'TEST',
      prenom: 'CONJOINT',
      fullName: 'TEST CONJOINT',
      rib: existing.rib,
      clientId: existing.clientId,
      clientName: existing.client.name,
      codeAssure: existing.codeAssure || '',
      numeroContrat: existing.numeroContrat || ''
    },
    existingAdherent: {
      id: existing.id,
      matricule: existing.matricule,
      nom: existing.nom,
      prenom: existing.prenom,
      fullName: `${existing.nom} ${existing.prenom}`,
      rib: existing.rib,
      clientName: existing.client.name
    },
    pendingData: {
      matricule: fakeMatricule,
      nom: 'TEST',
      prenom: 'CONJOINT',
      clientId: existing.clientId,  // UUID
      rib: existing.rib,
      codeAssure: existing.codeAssure || undefined,
      numeroContrat: existing.numeroContrat || undefined,
      assurance: existing.assurance || undefined,
      statut: 'ACTIF'
    },
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    justification: null
  };

  // 5. Create notifications for all target users
  const importDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const notificationData = {
    requiresAction: true,
    actionType: 'APPROVE_DUPLICATE_RIB',
    importId: `IMPORT_${timestamp}`,
    importedBy: importer.id,
    importedByName: importer.fullName,
    importedByEmail: importer.email,
    importedByRole: importer.role,
    importDate: timestamp,
    successCount: 5,
    blockedCount: 1,
    totalErrors: 1,
    duplicates: [duplicateEntry]
  };

  await prisma.notification.createMany({
    data: notifyUsers.map(u => ({
      userId: u.id,
      type: 'DUPLICATE_RIB_APPROVAL_REQUIRED',
      title: `🚨 1 RIB dupliqué(s) - Approbation requise [TEST]`,
      message: `[TEST] Import effectué par ${importer.fullName} le ${importDate}. 1 adhérent(s) bloqué(s) pour RIB dupliqué. Cas possibles: compte conjoint (mari/femme).`,
      data: notificationData,
      read: false
    }))
  });

  console.log('\n✅ Test notifications created successfully!');
  console.log(`   Fake matricule : ${fakeMatricule}`);
  console.log(`   Duplicate RIB  : ${existing.rib}`);
  console.log(`   Notified users : ${notifyUsers.map(u => u.fullName).join(', ')}`);
  console.log('\n👉 Now open the UI, check notifications, and click Approuver.');
  console.log('   After approval, search for matricule: ' + fakeMatricule + ' in the Adhérents tab.');
}

main()
  .catch(e => console.error('❌ Error:', e.message))
  .finally(() => prisma.$disconnect());
