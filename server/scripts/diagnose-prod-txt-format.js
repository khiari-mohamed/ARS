/**
 * diagnose-prod-txt-format.js
 *
 * Run this ON THE PROD SERVER to check DonneurOrdre format mismatches.
 * Usage: node scripts/diagnose-prod-txt-format.js
 */

require('dotenv').config({ path: '../.env.production' });

const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

function resolveActualFormat(rib, stored) {
  if (rib.startsWith('04')) return { actual: 'ATTIJARI', reason: 'RIB starts with 04 (auto-override)' };
  if (rib.startsWith('07')) return { actual: 'BNA', reason: 'RIB starts with 07 (auto-override)' };
  return { actual: stored, reason: `stored formatTxtType = "${stored}"` };
}

async function main() {
  console.log('=== PROD TXT FORMAT DIAGNOSTIC ===\n');
  console.log('DB:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'));
  console.log('');

  // --- DonneurOrdre ---
  const donneurs = await prisma.donneurOrdre.findMany({ orderBy: { nom: 'asc' } });
  console.log(`Found ${donneurs.length} DonneurOrdre(s):\n`);
  console.log('─'.repeat(110));

  let hasIssue = false;
  for (const d of donneurs) {
    const stored = d.formatTxtType || 'BTK_COMAR';
    const { actual, reason } = resolveActualFormat(d.rib || '', stored);
    const mismatch = stored !== actual;
    if (mismatch) hasIssue = true;

    console.log(`${mismatch ? '⚠️  MISMATCH' : '✅ OK      '} | ${d.nom.padEnd(30)} | RIB: ${(d.rib || '').substring(0, 8)}... | stored: ${stored.padEnd(12)} | actual: ${actual.padEnd(12)} | ${reason}`);
  }

  // --- Recent OVs ---
  const ovs = await prisma.ordreVirement.findMany({
    take: 30,
    orderBy: { dateCreation: 'desc' },
    include: {
      donneurOrdre: true,
      bordereau: { include: { client: true } },
    },
  });

  console.log('\n' + '─'.repeat(110));
  console.log(`\nRecent 30 OrdreVirement(s):\n`);
  console.log('─'.repeat(110));

  for (const ov of ovs) {
    if (!ov.donneurOrdre) {
      console.log(`⚠️  OV ${ov.reference}: NO DONNEUR ORDRE`);
      continue;
    }
    const stored = ov.donneurOrdre.formatTxtType || 'BTK_COMAR';
    const { actual } = resolveActualFormat(ov.donneurOrdre.rib || '', stored);
    const mismatch = stored !== actual;

    console.log(
      `${mismatch ? '⚠️ ' : '✅ '} OV: ${ov.reference.padEnd(25)} | Client: ${(ov.bordereau?.client?.name || 'manual').padEnd(22)} | Donneur: ${ov.donneurOrdre.nom.padEnd(28)} | stored: ${stored.padEnd(12)} | actual: ${actual}${mismatch ? `  ← MISMATCH` : ''}`
    );
  }

  console.log('\n' + '─'.repeat(110));
  if (hasIssue) {
    console.log('\n⚠️  MISMATCHES FOUND — DB has wrong formatTxtType vs what code will generate.\n');
    console.log('SQL fix commands:\n');
    for (const d of donneurs) {
      const stored = d.formatTxtType || 'BTK_COMAR';
      const { actual } = resolveActualFormat(d.rib || '', stored);
      if (stored !== actual) {
        console.log(`-- Fix for "${d.nom}" (RIB: ${d.rib})`);
        console.log(`UPDATE "DonneurOrdre" SET "formatTxtType" = '${actual}' WHERE id = '${d.id}';\n`);
      }
    }
  } else {
    console.log('\n✅ No DB mismatches. If prod still generates wrong format → backend needs a rebuild + restart.');
    console.log('   Run: npm run build && pm2 restart all  (or however the server is managed)\n');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
