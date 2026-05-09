const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkChefBordereaux() {
  console.log('🔍 Checking if bordereaux belong to Chef d\'Équipe...\n');

  const references = [
    'ZIT-BULLETIN-2026-56536',
    'ZOPPAS NC BR 03-2025',
    'ST-BULLETIN-2026-61405'
  ];

  for (const ref of references) {
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: ref },
      include: {
        client: true,
        contract: {
          include: {
            teamLeader: {
              select: { id: true, fullName: true, email: true, role: true }
            }
          }
        },
        chargeCompte: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        currentHandler: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
    });

    if (!bordereau) {
      console.log(`❌ ${ref} - NOT FOUND\n`);
      continue;
    }

    console.log(`📋 ${ref}`);
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Statut: ${bordereau.statut}`);
    console.log(`   delaiReglement: ${bordereau.delaiReglement} jours`);
    
    if (bordereau.contract?.teamLeader) {
      console.log(`   ✅ CHEF D'ÉQUIPE: ${bordereau.contract.teamLeader.fullName} (${bordereau.contract.teamLeader.email})`);
      console.log(`      Role: ${bordereau.contract.teamLeader.role}`);
      console.log(`      ID: ${bordereau.contract.teamLeader.id}`);
    } else {
      console.log(`   ❌ NO CHEF D'ÉQUIPE assigned to contract`);
    }

    if (bordereau.chargeCompte) {
      console.log(`   Chargé Compte: ${bordereau.chargeCompte.fullName}`);
    }

    if (bordereau.currentHandler) {
      console.log(`   Current Handler: ${bordereau.currentHandler.fullName} (${bordereau.currentHandler.role})`);
    }

    console.log('');
  }

  // Also check all Chef d'Équipe users
  console.log('\n👥 ALL CHEF D\'ÉQUIPE USERS:');
  console.log('='.repeat(60));
  const chefs = await prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE' },
    select: { id: true, fullName: true, email: true, department: true }
  });

  chefs.forEach(chef => {
    console.log(`✅ ${chef.fullName} (${chef.email})`);
    console.log(`   Department: ${chef.department || 'N/A'}`);
    console.log(`   ID: ${chef.id}\n`);
  });

  await prisma.$disconnect();
}

checkChefBordereaux().catch(console.error);
