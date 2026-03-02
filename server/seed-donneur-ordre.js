const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDonneurOrdre() {
  console.log('🏦 Creating Donneur d\'Ordre...\n');

  try {
    // Find or create society
    let society = await prisma.society.findFirst({ where: { code: 'ATTIJARI' } });
    if (!society) {
      society = await prisma.society.create({
        data: {
          name: 'Attijari Bank',
          code: 'ATTIJARI'
        }
      });
      console.log('✅ Society created: Attijari Bank');
    } else {
      console.log('✅ Society exists: Attijari Bank');
    }

    // Create donneurs d'ordre
    const donneurs = [
      {
        nom: 'ARS TUNISIE - Compte Principal',
        rib: '08104000123456789012',
        banque: 'Attijari Bank',
        agence: 'Tunis Centre',
        structureTxt: 'STRUCTURE_1',
        statut: 'ACTIF',
        societyId: society.id
      },
      {
        nom: 'ARS TUNISIE - Compte Secondaire',
        rib: '08104000987654321098',
        banque: 'Attijari Bank',
        agence: 'Tunis Lac',
        structureTxt: 'STRUCTURE_1',
        statut: 'ACTIF',
        societyId: society.id
      }
    ];

    for (const d of donneurs) {
      const existing = await prisma.donneurOrdre.findFirst({
        where: { rib: d.rib }
      });

      if (!existing) {
        const created = await prisma.donneurOrdre.create({ 
        data: {
          nom: d.nom,
          rib: d.rib,
          banque: d.banque,
          agence: d.agence,
          structureTxt: d.structureTxt,
          statut: d.statut
        }
      });
        console.log(`✅ Donneur créé: ${created.nom} (${created.rib})`);
      } else {
        console.log(`⚠️  Donneur existe déjà: ${d.nom}`);
      }
    }

    console.log('\n✅ Donneurs d\'ordre ready!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedDonneurOrdre();
