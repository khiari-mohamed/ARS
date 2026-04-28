require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkImport() {
  console.log('🔍 Checking imported Siwar data...\n');

  const siwarId = '12eab8ad-a1dc-4008-81eb-fbff6b2f804b';
  const clientIds = ['343c32a7-7bf2-4a1f-a0f2-b5cd5712494c', '193af8db-e0b8-4e39-a676-dc95d68e6ee7'];

  const user = await prisma.user.findUnique({ where: { id: siwarId } });
  console.log('✅ User:', user ? user.fullName : 'NOT FOUND');

  const compagnie = await prisma.compagnieAssurance.findFirst({ where: { nom: 'STAR ASSURANCES' } });
  console.log('✅ Compagnie:', compagnie ? compagnie.nom : 'NOT FOUND');

  const clients = await prisma.client.findMany({ where: { id: { in: clientIds } } });
  console.log('✅ Clients:', clients.length);

  const contracts = await prisma.contract.findMany({ where: { clientId: { in: clientIds } } });
  console.log('✅ Contracts:', contracts.length);

  const bordereaux = await prisma.bordereau.findMany({ where: { clientId: { in: clientIds } } });
  console.log('✅ Bordereaux:', bordereaux.length);

  const documents = await prisma.document.findMany({
    where: { bordereau: { clientId: { in: clientIds } } }
  });
  console.log('✅ Documents:', documents.length);

  await prisma.$disconnect();
}

checkImport();
