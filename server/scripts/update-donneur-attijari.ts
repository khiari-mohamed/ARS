import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDonneurToAttijari() {
  try {
    console.log('🔄 Starting update...');

    // Create or update Attijari donneur first
    const attijari = await prisma.donneurOrdre.upsert({
      where: { id: 'attijari-default' },
      update: {
        nom: 'ARS TUNISIE',
        rib: '04001007404700411649',
        banque: 'ATTIJARI BANK',
        agence: 'ARIANA',
        address: '89 Bis Avenue Habib Bourguiba 2080 Nouvelle Ariana',
        structureTxt: 'ATTIJARI',
        formatTxtType: 'ATTIJARI',
        statut: 'ACTIF'
      },
      create: {
        id: 'attijari-default',
        nom: 'ARS TUNISIE',
        rib: '04001007404700411649',
        banque: 'ATTIJARI BANK',
        agence: 'ARIANA',
        address: '89 Bis Avenue Habib Bourguiba 2080 Nouvelle Ariana',
        structureTxt: 'ATTIJARI',
        formatTxtType: 'ATTIJARI',
        statut: 'ACTIF'
      }
    });
    console.log('✅ Attijari donneur created/updated:', attijari.nom);

    // Update all OrdreVirement to use Attijari
    const updated = await prisma.ordreVirement.updateMany({
      where: {
        donneurOrdreId: { not: attijari.id }
      },
      data: {
        donneurOrdreId: attijari.id
      }
    });
    console.log(`✅ Updated ${updated.count} OrdreVirement records to use Attijari`);

    // Now delete old BTK/COMAR donneurs
    const deleted = await prisma.donneurOrdre.deleteMany({
      where: {
        id: { not: attijari.id },
        OR: [
          { formatTxtType: 'BTK_COMAR' },
          { formatTxtType: 'BTK_ASTREE' },
          { rib: { startsWith: '08' } },
          { rib: { startsWith: '20' } }
        ]
      }
    });
    console.log(`✅ Deleted ${deleted.count} old BTK/COMAR donneurs`);

    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDonneurToAttijari();
