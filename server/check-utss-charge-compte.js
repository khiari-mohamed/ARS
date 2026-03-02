const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUTSSChargeCompte() {
  try {
    const utssClient = await prisma.client.findFirst({
      where: { name: { contains: 'UTSS', mode: 'insensitive' } },
      include: {
        chargeCompte: { select: { id: true, fullName: true, role: true } }
      }
    });

    if (!utssClient) {
      console.log('❌ UTSS client not found');
      return;
    }

    console.log('\n✅ UTSS Client:');
    console.log('  Name:', utssClient.name);
    console.log('  Charge Compte:', utssClient.chargeCompte?.fullName || 'NONE');
    console.log('  Charge Compte ID:', utssClient.chargeCompteId || 'NONE');
    console.log('  Charge Compte Role:', utssClient.chargeCompte?.role || 'NONE');

    console.log('\n📋 Sonia Bouaicha ID: 7c521020-a827-41ca-94f3-9e2ed6f999cb');
    console.log('❓ Does it match?', utssClient.chargeCompteId === '7c521020-a827-41ca-94f3-9e2ed6f999cb' ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUTSSChargeCompte();
