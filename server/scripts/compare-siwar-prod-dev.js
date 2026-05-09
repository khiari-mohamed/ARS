/**
 * Compare Siwar Ayari's data between PROD and DEV databases
 * Run: node scripts/compare-siwar-prod-dev.js
 * 
 * Set PROD_DATABASE_URL in your .env or pass it as env variable:
 * PROD_DATABASE_URL="postgresql://..." node scripts/compare-siwar-prod-dev.js
 */

const { PrismaClient } = require('@prisma/client');

const devPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const prodPrisma = new PrismaClient({
  datasources: { db: { url: process.env.PROD_DATABASE_URL } }
});

async function getSiwarData(prisma, label) {
  const siwar = await prisma.user.findFirst({
    where: { fullName: { contains: 'Siwar', mode: 'insensitive' } }
  });

  if (!siwar) {
    console.log(`❌ [${label}] Siwar not found!`);
    return null;
  }

  console.log(`✅ [${label}] Found Siwar: ${siwar.fullName} (${siwar.id}), Role: ${siwar.role}`);

  const contracts = await prisma.contract.findMany({
    where: { teamLeaderId: siwar.id },
    select: {
      id: true,
      clientName: true,
      delaiReglement: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const contractIds = contracts.map(c => c.id);

  const bordereaux = await prisma.bordereau.findMany({
    where: { contractId: { in: contractIds }, archived: false },
    include: {
      client: { select: { name: true } },
      documents: { 
        select: { 
          id: true, 
          name: true, 
          status: true, 
          uploadedAt: true,
          createdAt: true,
          updatedAt: true
        } 
      },
      BulletinSoin: { 
        select: { 
          id: true, 
          numBs: true,
          etat: true, 
          createdAt: true,
          updatedAt: true 
        } 
      }
    },
    orderBy: { dateReception: 'desc' }
  });

  return { siwar, contracts, bordereaux };
}

function printBordereaux(bordereaux, label) {
  console.log(`\n📋 [${label}] Bordereaux (${bordereaux.length} total):`);
  console.log('─'.repeat(120));

  for (const b of bordereaux) {
    const totalDocs = b.documents.length;
    const traitedDocs = b.documents.filter(d => d.status === 'TRAITE').length;
    const totalBS = b.BulletinSoin.length;
    const traitedBS = b.BulletinSoin.filter(bs => bs.etat === 'TRAITE').length;

    const allTreated = (totalDocs === 0 || traitedDocs === totalDocs) &&
                       (totalBS === 0 || traitedBS === totalBS) &&
                       (totalDocs > 0 || totalBS > 0);

    const statusIcon = ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut) ? '✅' : '⏳';

    console.log(`\n${statusIcon} ${b.reference}`);
    console.log(`   Client: ${b.client?.name || 'N/A'}`);
    console.log(`   Statut: ${b.statut}`);
    console.log(`   dateReception: ${b.dateReception ? new Date(b.dateReception).toISOString() : 'NULL'}`);
    console.log(`   dateCloture: ${b.dateCloture ? new Date(b.dateCloture).toISOString() : 'NULL'}`);
    console.log(`   createdAt: ${b.createdAt ? new Date(b.createdAt).toISOString() : 'NULL'}`);
    console.log(`   updatedAt: ${b.updatedAt ? new Date(b.updatedAt).toISOString() : 'NULL'}`);
    console.log(`   Documents: ${traitedDocs}/${totalDocs} TRAITE`);
    console.log(`   BulletinSoin: ${traitedBS}/${totalBS} TRAITE`);
    console.log(`   allTreated: ${allTreated}`);

    // Show ALL documents with details
    if (b.documents.length > 0) {
      console.log(`\n   📄 Documents (${b.documents.length}):`);
      b.documents.forEach((d, idx) => {
        const statusEmoji = d.status === 'TRAITE' ? '✅' : d.status === 'UPLOADED' ? '📤' : '❓';
        console.log(`      ${idx + 1}. ${statusEmoji} ${d.name}`);
        console.log(`         Status: ${d.status || 'NULL'}`);
        console.log(`         uploadedAt: ${d.uploadedAt ? new Date(d.uploadedAt).toISOString() : 'NULL'}`);
        console.log(`         createdAt: ${d.createdAt ? new Date(d.createdAt).toISOString() : 'NULL'}`);
        console.log(`         updatedAt: ${d.updatedAt ? new Date(d.updatedAt).toISOString() : 'NULL'}`);
      });
    }

    // Show ALL bulletin soins with details
    if (b.BulletinSoin.length > 0) {
      console.log(`\n   📋 Bulletin Soins (${b.BulletinSoin.length}):`);
      b.BulletinSoin.forEach((bs, idx) => {
        const statusEmoji = bs.etat === 'TRAITE' ? '✅' : '⏳';
        console.log(`      ${idx + 1}. ${statusEmoji} ${bs.numBs || 'N/A'}`);
        console.log(`         Etat: ${bs.etat || 'NULL'}`);
        console.log(`         createdAt: ${bs.createdAt ? new Date(bs.createdAt).toISOString() : 'NULL'}`);
        console.log(`         updatedAt: ${bs.updatedAt ? new Date(bs.updatedAt).toISOString() : 'NULL'}`);
      });
    }

    // Show untreated documents summary
    const untreated = b.documents.filter(d => d.status !== 'TRAITE');
    if (untreated.length > 0) {
      console.log(`\n   ⚠️  Untreated docs (${untreated.length}): ${untreated.map(d => `${d.name}(${d.status})`).join(', ')}`);
    }
  }
  console.log('\n' + '─'.repeat(120));
}

function compareBordereaux(devBordereaux, prodBordereaux) {
  console.log('\n🔍 DETAILED COMPARISON REPORT:');
  console.log('═'.repeat(120));

  const devRefs = new Set(devBordereaux.map(b => b.reference));
  const prodRefs = new Set(prodBordereaux.map(b => b.reference));

  // Missing in dev
  const missingInDev = [...prodRefs].filter(r => !devRefs.has(r));
  if (missingInDev.length > 0) {
    console.log(`\n❌ In PROD but NOT in DEV (${missingInDev.length}):`);
    missingInDev.forEach(r => console.log(`   - ${r}`));
  } else {
    console.log('\n✅ All PROD bordereaux exist in DEV');
  }

  // Missing in prod
  const missingInProd = [...devRefs].filter(r => !prodRefs.has(r));
  if (missingInProd.length > 0) {
    console.log(`\n❌ In DEV but NOT in PROD (${missingInProd.length}):`);
    missingInProd.forEach(r => console.log(`   - ${r}`));
  } else {
    console.log('\n✅ All DEV bordereaux exist in PROD');
  }

  // Compare matching bordereaux in detail
  console.log('\n📊 DETAILED comparison for matching bordereaux:');
  console.log('═'.repeat(120));

  for (const ref of [...devRefs]) {
    if (!prodRefs.has(ref)) continue;

    const dev = devBordereaux.find(b => b.reference === ref);
    const prod = prodBordereaux.find(b => b.reference === ref);

    console.log(`\n🔹 ${ref}`);
    console.log('─'.repeat(120));

    // Status comparison
    const statusMatch = dev.statut === prod.statut;
    console.log(`   Statut:        DEV: ${dev.statut.padEnd(20)} | PROD: ${prod.statut.padEnd(20)} ${statusMatch ? '✅' : '❌ MISMATCH'}`);

    // dateCloture comparison
    const devCloture = dev.dateCloture ? new Date(dev.dateCloture).toISOString() : 'NULL';
    const prodCloture = prod.dateCloture ? new Date(prod.dateCloture).toISOString() : 'NULL';
    const clotureMatch = devCloture === prodCloture;
    console.log(`   dateCloture:   DEV: ${devCloture.padEnd(20)} | PROD: ${prodCloture.padEnd(20)} ${clotureMatch ? '✅' : '❌ MISMATCH'}`);

    // updatedAt comparison
    const devUpdated = dev.updatedAt ? new Date(dev.updatedAt).toISOString() : 'NULL';
    const prodUpdated = prod.updatedAt ? new Date(prod.updatedAt).toISOString() : 'NULL';
    console.log(`   updatedAt:     DEV: ${devUpdated.padEnd(20)} | PROD: ${prodUpdated.padEnd(20)}`);

    // Documents comparison
    const devDocs = dev.documents.length;
    const devTraited = dev.documents.filter(d => d.status === 'TRAITE').length;
    const prodDocs = prod.documents.length;
    const prodTraited = prod.documents.filter(d => d.status === 'TRAITE').length;
    const docsMatch = devDocs === prodDocs && devTraited === prodTraited;
    console.log(`   Documents:     DEV: ${devTraited}/${devDocs} TRAITE        | PROD: ${prodTraited}/${prodDocs} TRAITE        ${docsMatch ? '✅' : '❌ MISMATCH'}`);

    // Document-by-document comparison
    if (devDocs !== prodDocs) {
      console.log(`   ⚠️  Document count mismatch!`);
    } else {
      const devDocMap = new Map(dev.documents.map(d => [d.name, d]));
      const prodDocMap = new Map(prod.documents.map(d => [d.name, d]));
      
      let docMismatches = 0;
      for (const [name, devDoc] of devDocMap) {
        const prodDoc = prodDocMap.get(name);
        if (!prodDoc) {
          console.log(`      ❌ ${name}: EXISTS in DEV, MISSING in PROD`);
          docMismatches++;
        } else if (devDoc.status !== prodDoc.status) {
          console.log(`      ❌ ${name}: DEV=${devDoc.status}, PROD=${prodDoc.status}`);
          docMismatches++;
        }
      }
      
      for (const [name, prodDoc] of prodDocMap) {
        if (!devDocMap.has(name)) {
          console.log(`      ❌ ${name}: MISSING in DEV, EXISTS in PROD`);
          docMismatches++;
        }
      }
      
      if (docMismatches === 0) {
        console.log(`      ✅ All documents match in name and status`);
      }
    }

    // BulletinSoin comparison
    const devBS = dev.BulletinSoin.length;
    const devBSTraited = dev.BulletinSoin.filter(bs => bs.etat === 'TRAITE').length;
    const prodBS = prod.BulletinSoin.length;
    const prodBSTraited = prod.BulletinSoin.filter(bs => bs.etat === 'TRAITE').length;
    const bsMatch = devBS === prodBS && devBSTraited === prodBSTraited;
    console.log(`   BulletinSoin:  DEV: ${devBSTraited}/${devBS} TRAITE        | PROD: ${prodBSTraited}/${prodBS} TRAITE        ${bsMatch ? '✅' : '❌ MISMATCH'}`);
  }

  console.log('\n' + '═'.repeat(120));
}

async function main() {
  if (!process.env.PROD_DATABASE_URL) {
    console.error('❌ PROD_DATABASE_URL environment variable is required!');
    console.error('Usage: PROD_DATABASE_URL="postgresql://user:pass@host/db" node scripts/compare-siwar-prod-dev.js');
    process.exit(1);
  }

  console.log('🚀 Comparing Siwar Ayari data between PROD and DEV...\n');

  try {
    const [devData, prodData] = await Promise.all([
      getSiwarData(devPrisma, 'DEV'),
      getSiwarData(prodPrisma, 'PROD')
    ]);

    if (!devData || !prodData) {
      console.error('❌ Could not fetch data from one or both databases');
      return;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   DEV  - Contracts: ${devData.contracts.length}, Bordereaux: ${devData.bordereaux.length}`);
    console.log(`   PROD - Contracts: ${prodData.contracts.length}, Bordereaux: ${prodData.bordereaux.length}`);

    printBordereaux(devData.bordereaux, 'DEV');
    printBordereaux(prodData.bordereaux, 'PROD');
    compareBordereaux(devData.bordereaux, prodData.bordereaux);

  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

main().catch(console.error);
