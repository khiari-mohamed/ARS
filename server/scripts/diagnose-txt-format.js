/**
 * diagnose-txt-format.js
 * 
 * Diagnoses TXT format mismatches between what is stored in DB
 * and what would actually be generated for each OrdreVirement.
 * 
 * Run: node scripts/diagnose-txt-format.js
 */

const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

const FORMAT_RULES = {
  '04': 'ATTIJARI (auto-detected from RIB)',
  '07': 'BNA (auto-detected from RIB)',
};

function resolveActualFormat(donneurOrdre) {
  const rib = donneurOrdre.rib || '';
  const storedFormat = donneurOrdre.formatTxtType || 'BTK_COMAR';

  // Auto-detection overrides stored format (same logic as txt-generation.service.ts)
  if (rib.startsWith('04')) return { actual: 'ATTIJARI', reason: 'RIB starts with 04 (auto-override)' };
  if (rib.startsWith('07')) return { actual: 'BNA', reason: 'RIB starts with 07 (auto-override)' };

  return { actual: storedFormat, reason: `stored formatTxtType = "${storedFormat}"` };
}

async function main() {
  console.log('=== TXT FORMAT DIAGNOSTIC ===\n');

  // 1. Show all DonneurOrdre records
  const donneurs = await prisma.donneurOrdre.findMany({
    orderBy: { nom: 'asc' }
  });

  console.log(`Found ${donneurs.length} DonneurOrdre(s):\n`);
  console.log('─'.repeat(100));

  let hasIssue = false;

  for (const d of donneurs) {
    const { actual, reason } = resolveActualFormat(d);
    const stored = d.formatTxtType || 'BTK_COMAR';
    const mismatch = stored !== actual;

    if (mismatch) hasIssue = true;

    console.log(`Donneur : ${d.nom}`);
    console.log(`  RIB          : ${d.rib}`);
    console.log(`  Stored format: ${stored}`);
    console.log(`  Actual format: ${actual}  ← ${reason}`);
    if (mismatch) {
      console.log(`  ⚠️  MISMATCH! DB says "${stored}" but code will generate "${actual}"`);
    } else {
      console.log(`  ✅ OK`);
    }
    console.log('');
  }

  // 2. Show recent OVs and what format they would use
  const recentOVs = await prisma.ordreVirement.findMany({
    take: 20,
    orderBy: { dateCreation: 'desc' },
    include: {
      donneurOrdre: true,
      bordereau: { include: { client: true } },
    }
  });

  console.log('─'.repeat(100));
  console.log(`\nRecent 20 OrdreVirement(s) — format that would be generated:\n`);
  console.log('─'.repeat(100));

  for (const ov of recentOVs) {
    if (!ov.donneurOrdre) {
      console.log(`OV ${ov.reference}: ⚠️  NO DONNEUR ORDRE`);
      continue;
    }
    const { actual, reason } = resolveActualFormat(ov.donneurOrdre);
    const stored = ov.donneurOrdre.formatTxtType || 'BTK_COMAR';
    const mismatch = stored !== actual;

    console.log(`OV: ${ov.reference.padEnd(25)} | Client: ${(ov.bordereau?.client?.name || ov.clientName || 'manual').padEnd(20)} | Donneur: ${ov.donneurOrdre.nom.padEnd(25)} | RIB: ${ov.donneurOrdre.rib.substring(0, 5)}... | Format: ${actual.padEnd(12)} ${mismatch ? `⚠️  (stored: ${stored})` : '✅'}`);
  }

  console.log('\n' + '─'.repeat(100));

  if (hasIssue) {
    console.log('\n⚠️  ISSUES FOUND — Some donneurs have a stored format that differs from what the code will generate.');
    console.log('   Fix: Update the formatTxtType in the DB to match the intended format, OR fix the RIB prefix.\n');

    // Show fix commands
    console.log('Fix commands (run in psql or via Prisma):');
    for (const d of donneurs) {
      const { actual } = resolveActualFormat(d);
      const stored = d.formatTxtType || 'BTK_COMAR';
      if (stored !== actual) {
        console.log(`  UPDATE "DonneurOrdre" SET "formatTxtType" = '${stored}' WHERE id = '${d.id}'; -- to keep stored and fix auto-detect`);
        console.log(`  -- OR update RIB prefix if the bank is actually ${stored}`);
      }
    }
  } else {
    console.log('\n✅ No format mismatches found. If prod still generates wrong format, the issue is likely a stale build cache.');
    console.log('   → Rebuild and redeploy the backend on prod.');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
