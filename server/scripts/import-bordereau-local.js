require('dotenv/config');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/import-bordereau-local.js <export.json>');
  process.exit(1);
}

const readJson = () => JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const normalizeMatricule = (value) => String(value ?? '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/^(?:\u00D4\u00C7\u00EE|\u00E2\u20AC\u0152|\u00EF\u00BB\u00BF)+/g, '')
  .trim()
  .replace(/\.0+$/, '');

async function findOrCreateClient(sourceClient) {
  let client = await prisma.client.findFirst({ where: { name: sourceClient.name } });
  if (client) return client;

  return prisma.client.create({
    data: {
      name: sourceClient.name,
      reglementDelay: sourceClient.reglementDelay,
      reclamationDelay: sourceClient.reclamationDelay,
      address: sourceClient.address || '',
      email: sourceClient.email || '',
      phone: sourceClient.phone || '',
      status: sourceClient.status || 'active',
      compteAuxiliaireSage: sourceClient.compteAuxiliaireSage || null,
      codeJournalSage: sourceClient.codeJournalSage || null
    }
  });
}

async function findOrCreateContract(sourceContract, client, sourceCompany) {
  if (!sourceContract) return null;

  let contract = await prisma.contract.findFirst({
    where: {
      clientId: client.id,
      OR: [
        { codeAssure: sourceContract.codeAssure || undefined },
        { clientName: sourceContract.clientName }
      ]
    }
  });
  if (contract) return contract;

  let compagnieAssuranceId;
  if (sourceCompany?.code) {
    const company = await prisma.compagnieAssurance.findFirst({
      where: { code: sourceCompany.code }
    });
    compagnieAssuranceId = company?.id;
  }

  return prisma.contract.create({
    data: {
      clientId: client.id,
      clientName: sourceContract.clientName,
      codeAssure: sourceContract.codeAssure || null,
      compagnieAssuranceId: compagnieAssuranceId || null,
      modeRecuperation: sourceContract.modeRecuperation || null,
      delaiReclamation: sourceContract.delaiReclamation,
      delaiReglement: sourceContract.delaiReglement,
      documentPath: sourceContract.documentPath || '',
      escalationThreshold: sourceContract.escalationThreshold || null,
      startDate: new Date(sourceContract.startDate),
      endDate: new Date(sourceContract.endDate),
      signature: sourceContract.signature || null,
      version: sourceContract.version || 1,
      thresholds: sourceContract.thresholds || null
    }
  });
}

async function main() {
  const source = readJson();
  if (!source.reference || !source.client) {
    throw new Error('Export invalide: reference et client sont requis.');
  }

  const client = await findOrCreateClient(source.client);
  const contract = await findOrCreateContract(
    source.contract,
    client,
    source.contract?.compagnieAssurance
  );

  for (const sourceAdherent of source.adherents || []) {
    const matricule = normalizeMatricule(sourceAdherent.matricule);
    const existing = await prisma.adherent.findFirst({
      where: { matricule, clientId: client.id }
    });
    const adherentData = {
      nom: sourceAdherent.nom,
      prenom: sourceAdherent.prenom,
      clientId: client.id,
      rib: sourceAdherent.rib,
      codeAssure: sourceAdherent.codeAssure || null,
      numeroContrat: sourceAdherent.numeroContrat || null,
      assurance: sourceAdherent.assurance || null,
      statut: sourceAdherent.statut || 'ACTIF'
    };

    if (existing) {
      await prisma.adherent.update({ where: { id: existing.id }, data: adherentData });
    } else {
      await prisma.adherent.create({
        data: { matricule, ...adherentData }
      });
    }
  }

  const localHandler = source.currentHandler?.email
    ? await prisma.user.findFirst({ where: { email: source.currentHandler.email } })
    : null;

  const data = {
    clientId: client.id,
    contractId: contract?.id || null,
    type: source.type,
    dateReception: new Date(source.dateReception),
    dateDebutScan: source.dateDebutScan ? new Date(source.dateDebutScan) : null,
    dateFinScan: source.dateFinScan ? new Date(source.dateFinScan) : null,
    dateReceptionSante: source.dateReceptionSante ? new Date(source.dateReceptionSante) : null,
    dateCloture: source.dateCloture ? new Date(source.dateCloture) : null,
    dateDepotVirement: source.dateDepotVirement ? new Date(source.dateDepotVirement) : null,
    dateExecutionVirement: source.dateExecutionVirement ? new Date(source.dateExecutionVirement) : null,
    delaiReglement: source.delaiReglement,
    statut: source.statut,
    nombreBS: source.nombreBS,
    currentHandlerId: localHandler?.id || null,
    assignedToUserId: localHandler?.id || null,
    priority: source.priority,
    archived: source.archived,
    dateReceptionBO: source.dateReceptionBO ? new Date(source.dateReceptionBO) : null,
    dateLimiteTraitement: source.dateLimiteTraitement ? new Date(source.dateLimiteTraitement) : null,
    dateAffectation: source.dateAffectation ? new Date(source.dateAffectation) : null,
    dateReceptionEquipeSante: source.dateReceptionEquipeSante ? new Date(source.dateReceptionEquipeSante) : null,
    dateReelleCloture: source.dateReelleCloture ? new Date(source.dateReelleCloture) : null,
    nombreJourTraitement: source.nombreJourTraitement,
    scanStatus: source.scanStatus,
    completionRate: source.completionRate,
    documentStatus: source.documentStatus
  };

  const bordereau = await prisma.bordereau.upsert({
    where: { reference: source.reference },
    create: { reference: source.reference, ...data },
    update: data,
    select: {
      id: true,
      reference: true,
      clientId: true,
      contractId: true,
      statut: true,
      nombreBS: true,
      client: { select: { id: true, name: true } },
      contract: { select: { id: true, clientName: true, codeAssure: true, modeRecuperation: true } }
    }
  });

  console.log('Bordereau local inséré ou mis à jour:');
  console.log(JSON.stringify(bordereau, null, 2));
  console.log('Aucune donnée utilisateur sensible de production n’a été copiée.');
}

main()
  .catch((error) => {
    console.error('Erreur import local:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
