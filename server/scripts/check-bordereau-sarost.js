require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const reference = process.argv[2] || 'SAROST BR13-2026';
const exportPath = process.argv[3] === '--export' ? process.argv[4] : null;

async function main() {
  const bordereau = await prisma.bordereau.findUnique({
    where: { reference },
    include: {
      client: true,
      contract: { include: { compagnieAssurance: true } },
      currentHandler: {
        select: { id: true, email: true, fullName: true, role: true, department: true, active: true }
      },
      chargeCompte: {
        select: { id: true, email: true, fullName: true, role: true, department: true, active: true }
      },
      prestataire: true,
      documents: true,
      ovDocuments: true,
      BulletinSoin: true,
      BordereauAuditLog: true,
      ordresVirement: {
        include: {
          client: true,
          contract: { include: { compagnieAssurance: true } },
          donneurOrdre: true,
          items: {
            include: { adherent: true },
            orderBy: { createdAt: 'asc' }
          },
          historique: true,
          history: true
        },
        orderBy: { createdAt: 'asc' }
      },
      virement: true
    }
  });

  if (!bordereau) {
    console.error(`Bordereau introuvable: ${reference}`);
    const suggestions = await prisma.bordereau.findMany({
      where: { reference: { contains: reference.split(' ')[0], mode: 'insensitive' } },
      select: { id: true, reference: true, client: { select: { name: true } }, statut: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    if (suggestions.length > 0) {
      console.error('Références proches:');
      console.error(JSON.stringify(suggestions, null, 2));
    }
    process.exitCode = 1;
    return;
  }

  const adherents = await prisma.adherent.findMany({
    where: { clientId: bordereau.clientId },
    select: {
      id: true,
      matricule: true,
      nom: true,
      prenom: true,
      clientId: true,
      rib: true,
      codeAssure: true,
      numeroContrat: true,
      assurance: true,
      statut: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { matricule: 'asc' }
  });

  console.log(`Bordereau trouvé: ${bordereau.reference}`);
  console.log(`ID: ${bordereau.id}`);
  console.log(`Client: ${bordereau.client.name} (${bordereau.clientId})`);
  console.log(`Statut: ${bordereau.statut}`);
  console.log(`Nombre BS déclaré: ${bordereau.nombreBS}`);
  console.log(`Adhérents du client: ${adherents.length}`);
  console.log(`Ordres de virement liés: ${bordereau.ordresVirement.length}`);
  console.log(`Documents: ${bordereau.documents.length}`);
  console.log(`Documents OV: ${bordereau.ovDocuments.length}`);
  console.log(`Bulletins de soin: ${bordereau.BulletinSoin.length}`);

  const exportData = { ...bordereau, adherents };

  if (exportPath) {
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`Export JSON écrit dans: ${exportPath}`);
  }

  console.log('\nDonnées complètes:');
  console.log(JSON.stringify(exportData, null, 2));
}

main()
  .catch((error) => {
    console.error('Erreur lors de la lecture du bordereau:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
