require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const clientId = process.argv[2] || 'e1150a8c-d2e1-473a-a2d1-50545ad3d599';

const normalizeMatricule = (value) => String(value ?? '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/^(?:\u00D4\u00C7\u00EE|\u00E2\u20AC\u0152|\u00EF\u00BB\u00BF)+/g, '')
  .trim()
  .replace(/\.0+$/, '');

async function main() {
  const rows = await prisma.adherent.findMany({
    where: { clientId },
    select: { id: true, matricule: true, nom: true, prenom: true, rib: true, createdAt: true },
    orderBy: { matricule: 'asc' }
  });

  const groups = new Map();
  for (const row of rows) {
    const key = normalizeMatricule(row.matricule);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicates = [...groups.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([matricule, values]) => ({ matricule, values }));

  console.log(JSON.stringify({
    clientId,
    totalRows: rows.length,
    normalizedUniqueMatricules: groups.size,
    duplicateGroups: duplicates.length,
    duplicates
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
