/**
 * Check Siwar Ayari's data in current database
 * Run: node scripts/check-siwar-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Checking Siwar Ayari data in current database...\n');

  const siwar = await prisma.user.findFirst({
    where: { 
      fullName: { contains: 'Siwar Ayari', mode: 'insensitive' },
      role: 'GESTIONNAIRE_SENIOR'
    }
  });

  if (!siwar) {
    console.log('❌ Siwar not found!');
    return;
  }

  console.log(`✅ Found Siwar Ayari: ${siwar.fullName} (${siwar.id}), Role: ${siwar.role}, Email: ${siwar.email}`);

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

  console.log(`\n📋 Contracts: ${contracts.length}`);
  contracts.forEach(c => {
    console.log(`   - ${c.clientName} (${c.id})`);
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
          uploadedAt: true
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

  console.log(`\n📊 Bordereaux: ${bordereaux.length} total`);
  console.log('═'.repeat(120));

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

  console.log('\n' + '═'.repeat(120));
  console.log('\n✅ Check complete!');

  await prisma.$disconnect();
}

main().catch(console.error);
