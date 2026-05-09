const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findChefBordereaux() {
  console.log('🔍 Finding bordereaux for CHEF_EQUIPE Mohamed Frad...\n');

  const chef = await prisma.user.findFirst({
    where: { role: 'CHEF_EQUIPE' },
    select: { id: true, fullName: true, email: true }
  });

  if (!chef) {
    console.log('❌ No CHEF_EQUIPE found');
    return;
  }

  console.log(`✅ Found CHEF_EQUIPE: ${chef.fullName} (${chef.email})`);
  console.log(`   ID: ${chef.id}\n`);

  // Find bordereaux where contract.teamLeaderId = chef.id
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      contract: {
        teamLeaderId: chef.id
      },
      statut: 'VIREMENT_EXECUTE'
    },
    include: {
      client: true,
      contract: {
        include: {
          teamLeader: { select: { fullName: true } }
        }
      },
      ordresVirement: {
        select: { etatVirement: true }
      }
    },
    take: 5
  });

  console.log(`📊 Found ${bordereaux.length} VIREMENT_EXECUTE bordereaux for Mohamed Frad:\n`);

  if (bordereaux.length === 0) {
    console.log('❌ No VIREMENT_EXECUTE bordereaux found for this chef');
    console.log('\n🔍 Checking ALL statuses...\n');
    
    const allBordereaux = await prisma.bordereau.findMany({
      where: {
        contract: {
          teamLeaderId: chef.id
        }
      },
      include: {
        client: true,
        ordresVirement: true
      },
      take: 5
    });

    console.log(`📊 Found ${allBordereaux.length} total bordereaux (any status):\n`);
    
    allBordereaux.forEach(b => {
      console.log(`📋 ${b.reference}`);
      console.log(`   Client: ${b.client.name}`);
      console.log(`   Statut: ${b.statut}`);
      console.log(`   delaiReglement: ${b.delaiReglement} jours`);
      console.log(`   OV count: ${b.ordresVirement.length}`);
      console.log('');
    });
  } else {
    bordereaux.forEach(b => {
      console.log(`📋 ${b.reference}`);
      console.log(`   Client: ${b.client.name}`);
      console.log(`   Statut: ${b.statut}`);
      console.log(`   delaiReglement: ${b.delaiReglement} jours`);
      console.log(`   OV count: ${b.ordresVirement.length}`);
      if (b.ordresVirement.length > 0) {
        console.log(`   OV status: ${b.ordresVirement[0].etatVirement}`);
      }
      console.log('');
    });
  }

  await prisma.$disconnect();
}

findChefBordereaux().catch(console.error);
