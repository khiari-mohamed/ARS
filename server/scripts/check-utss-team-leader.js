const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUTSSTeamLeader() {
  try {
    const utssBordereau = await prisma.bordereau.findFirst({
      where: { reference: 'U-BULLETIN-2026-72980' },
      include: {
        contract: {
          include: {
            teamLeader: { select: { id: true, fullName: true, role: true } }
          }
        },
        client: { select: { name: true } }
      }
    });

    if (!utssBordereau) {
      console.log('❌ U-BULLETIN bordereau not found');
      return;
    }

    console.log('\n✅ U-BULLETIN Bordereau:');
    console.log('  Reference:', utssBordereau.reference);
    console.log('  Client:', utssBordereau.client?.name);
    console.log('  Contract ID:', utssBordereau.contractId);
    console.log('  Contract Team Leader:', utssBordereau.contract?.teamLeader?.fullName || 'NONE');
    console.log('  Contract Team Leader ID:', utssBordereau.contract?.teamLeaderId || 'NONE');
    console.log('  Contract Team Leader Role:', utssBordereau.contract?.teamLeader?.role || 'NONE');

    console.log('\n📋 Sonia Bouaicha ID: 7c521020-a827-41ca-94f3-9e2ed6f999cb');
    console.log('❓ Does it match?', utssBordereau.contract?.teamLeaderId === '7c521020-a827-41ca-94f3-9e2ed6f999cb' ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUTSSTeamLeader();
