require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const clientId = process.argv[2] || 'e1150a8c-d2e1-473a-a2d1-50545ad3d599';
const apply = process.argv.includes('--apply');

const normalizeMatricule = (value) => String(value ?? '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/^(?:\u00D4\u00C7\u00EE|\u00E2\u20AC\u0152|\u00EF\u00BB\u00BF)+/g, '')
  .trim()
  .replace(/\.0+$/, '');

async function main() {
  const rows = await prisma.adherent.findMany({
    where: { clientId },
    select: { id: true, matricule: true, nom: true, prenom: true, rib: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

  const groups = new Map();
  for (const row of rows) {
    const key = normalizeMatricule(row.matricule);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicateGroups = [...groups.entries()].filter(([, values]) => values.length > 1);
  console.log(`Lignes: ${rows.length}; matricules normalisés: ${groups.size}; groupes doublons: ${duplicateGroups.length}`);

  if (!apply) {
    console.log('Aucun changement effectué. Relancez avec --apply pour nettoyer les doublons.');
    return;
  }

  let removed = 0;
  await prisma.$transaction(async (tx) => {
    for (const [matricule, values] of duplicateGroups) {
      const canonical = values[0];
      for (const duplicate of values.slice(1)) {
        await tx.virementItem.updateMany({
          where: { adherentId: duplicate.id },
          data: { adherentId: canonical.id }
        });
        await tx.adherentHistory.updateMany({
          where: { adherentId: duplicate.id },
          data: { adherentId: canonical.id }
        });
        await tx.adherentRibHistory.updateMany({
          where: { adherentId: duplicate.id },
          data: { adherentId: canonical.id }
        });
        await tx.adherent.delete({ where: { id: duplicate.id } });
        removed += 1;
      }
      await tx.adherent.update({
        where: { id: canonical.id },
        data: { matricule }
      });
    }
  });

  console.log(`Nettoyage terminé: ${removed} doublons supprimés.`);
}

main()
  .catch((error) => {
    console.error('Erreur nettoyage:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
