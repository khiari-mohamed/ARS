/**
 * Read-only integrity audit for one Chef d'Equipe portfolio.
 *
 * Usage from server/:
 *   node scripts/audit-chef-team-integrity.js --chef "Mohamed Frad"
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const chefQuery = args[args.indexOf('--chef') + 1] || 'Mohamed Frad';
const summaryOnly = args.includes('--summary');

const ACTIVE_QUEUE_STATUSES = ['A_AFFECTER', 'SCANNE'];

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'NULL';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function printList(title, items, formatter) {
  if (summaryOnly) return;
  console.log(`\n=== ${title} (${items.length}) ===`);
  if (items.length === 0) {
    console.log('none');
    return;
  }
  items.forEach((item) => console.log(`- ${formatter(item)}`));
}

async function main() {
  const chefs = await prisma.user.findMany({
    where: {
      role: 'CHEF_EQUIPE',
      fullName: { contains: chefQuery, mode: 'insensitive' },
    },
    select: { id: true, fullName: true, email: true, active: true },
  });

  if (chefs.length === 0) {
    console.error(`Aucun Chef d'Equipe trouvé pour: ${chefQuery}`);
    process.exitCode = 1;
    return;
  }

  if (chefs.length > 1) {
    console.log('Plusieurs Chefs correspondent. Utilisez un nom plus précis:');
    chefs.forEach((chef) => console.log(`- ${chef.id} | ${chef.fullName} | ${chef.email}`));
    process.exitCode = 1;
    return;
  }

  const chef = chefs[0];
  const team = await prisma.user.findMany({
    where: { teamLeaderId: chef.id },
    select: { id: true, fullName: true, email: true, role: true, active: true },
    orderBy: { fullName: 'asc' },
  });
  const teamGestionnaires = team.filter((member) => member.role === 'GESTIONNAIRE');
  const activeTeamGestionnaireIds = new Set(
    teamGestionnaires.filter((member) => member.active).map((member) => member.id),
  );

  const contracts = await prisma.contract.findMany({
    where: { teamLeaderId: chef.id },
    select: {
      id: true,
      clientId: true,
      clientName: true,
      assignedManagerId: true,
      client: { select: { name: true } },
    },
    orderBy: { clientName: 'asc' },
  });
  const contractIds = contracts.map((contract) => contract.id);

  const bordereaux = await prisma.bordereau.findMany({
    where: { archived: false, contractId: { in: contractIds } },
    select: {
      id: true,
      reference: true,
      statut: true,
      assignedToUserId: true,
      currentHandlerId: true,
      contractId: true,
      contract: { select: { clientName: true } },
      documents: {
        select: { id: true, name: true, assignedToUserId: true, status: true },
      },
      BulletinSoin: {
        where: { deletedAt: null },
        select: { id: true, numBs: true, ownerId: true, etat: true },
      },
    },
    orderBy: { reference: 'asc' },
  });

  const bordereauxNotAssignedToTeam = bordereaux.filter(
    (bordereau) => !activeTeamGestionnaireIds.has(bordereau.assignedToUserId),
  );
  const queueCandidates = bordereauxNotAssignedToTeam.filter((bordereau) =>
    ACTIVE_QUEUE_STATUSES.includes(bordereau.statut),
  );
  const unassignedDocuments = bordereaux.flatMap((bordereau) =>
    bordereau.documents
      .filter((document) => !document.assignedToUserId)
      .map((document) => ({ bordereau, document })),
  );
  const unassignedBulletins = bordereaux.flatMap((bordereau) =>
    bordereau.BulletinSoin
      .filter((bulletin) => !bulletin.ownerId)
      .map((bulletin) => ({ bordereau, bulletin })),
  );

  console.log('\nChef d\'Equipe audité');
  console.log(`- ${chef.fullName} (${chef.id})`);
  console.log(`- Actif: ${chef.active ? 'oui' : 'non'}`);
  console.log(`- Gestionnaires liés: ${teamGestionnaires.length}`);
  console.log(`- Gestionnaires actifs pris en compte pour l'assignation: ${activeTeamGestionnaireIds.size}`);
  teamGestionnaires.forEach((member) =>
    console.log(`  - ${member.fullName} | ${member.active ? 'actif' : 'inactif'} | ${member.id}`),
  );

  console.log('\nPortefeuille');
  console.log(`- Contrats: ${contracts.length}`);
  console.log(`- Bordereaux non archivés: ${bordereaux.length}`);
  console.log(`- Bordereaux par statut: ${JSON.stringify(countBy(bordereaux, 'statut'))}`);
  console.log(`- Bordereaux non assignés à un gestionnaire de l'équipe: ${bordereauxNotAssignedToTeam.length}`);
  console.log(`- Ces bordereaux par statut: ${JSON.stringify(countBy(bordereauxNotAssignedToTeam, 'statut'))}`);
  console.log(`- Candidats de la file "Non assignés" (${ACTIVE_QUEUE_STATUSES.join(', ')}): ${queueCandidates.length}`);
  console.log(`- Documents: ${bordereaux.reduce((total, bordereau) => total + bordereau.documents.length, 0)}`);
  console.log(`- Bulletins de soins: ${bordereaux.reduce((total, bordereau) => total + bordereau.BulletinSoin.length, 0)}`);
  console.log(`- Documents sans gestionnaire: ${unassignedDocuments.length}`);
  console.log(`- Documents par statut: ${JSON.stringify(countBy(bordereaux.flatMap((bordereau) => bordereau.documents), 'status'))}`);
  console.log(`- BS sans propriétaire: ${unassignedBulletins.length}`);

  printList(
    'Bordereaux non assignés à un gestionnaire de l\'équipe',
    bordereauxNotAssignedToTeam,
    (bordereau) => `${bordereau.reference} | ${bordereau.statut} | assignedToUserId=${bordereau.assignedToUserId || 'NULL'} | client=${bordereau.contract?.clientName || 'N/A'}`,
  );
  printList(
    'Documents sans gestionnaire',
    unassignedDocuments,
    ({ bordereau, document }) => `${bordereau.reference} | ${document.name} | status=${document.status || 'NULL'}`,
  );
  printList(
    'BS sans propriétaire',
    unassignedBulletins,
    ({ bordereau, bulletin }) => `${bordereau.reference} | ${bulletin.numBs} | etat=${bulletin.etat}`,
  );
}

main()
  .catch((error) => {
    console.error('Audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
