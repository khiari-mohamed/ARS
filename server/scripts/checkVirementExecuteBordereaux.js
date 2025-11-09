const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVirementExecuteBordereaux() {
  try {
    console.log('🔍 Checking bordereaux with VIREMENT_EXECUTE status...\n');

    const mohamedBenAli = await prisma.user.findFirst({
      where: {
        fullName: {
          contains: 'Mohamed Ben Ali',
          mode: 'insensitive'
        },
        role: 'CHEF_EQUIPE'
      }
    });

    if (!mohamedBenAli) {
      console.log('❌ Mohamed Ben Ali not found');
      return;
    }

    console.log(`✅ Found: ${mohamedBenAli.fullName} (ID: ${mohamedBenAli.id})\n`);

    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: mohamedBenAli.id },
      select: { id: true, clientId: true }
    });

    console.log(`📋 Contracts: ${contracts.length}\n`);

    const clientIds = contracts.map(c => c.clientId);

    const bordereauxVirementExecute = await prisma.bordereau.findMany({
      where: {
        statut: 'VIREMENT_EXECUTE',
        clientId: { in: clientIds }
      },
      include: {
        client: { select: { name: true } },
        User: { select: { fullName: true } }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log(`\n📊 RESULTS:`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Total VIREMENT_EXECUTE: ${bordereauxVirementExecute.length}\n`);

    if (bordereauxVirementExecute.length === 0) {
      console.log('✅ No bordereaux with VIREMENT_EXECUTE status\n');
    } else {
      bordereauxVirementExecute.forEach((b, i) => {
        console.log(`${i + 1}. ${b.reference}`);
        console.log(`   Client: ${b.client?.name || 'N/A'}`);
        console.log(`   Assigned: ${b.User?.fullName || 'Non assigné'}`);
        console.log(`   Date: ${b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : 'N/A'}`);
        console.log(`   BS: ${b.nombreBS || 0}`);
        console.log(`   ───────────────────────────────────────────────────────────\n`);
      });
    }

    console.log('✅ Script completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVirementExecuteBordereaux();
