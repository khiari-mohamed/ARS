const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignVirementToGestionnaire() {
  try {
    // Find Mariem
    const mariem = await prisma.user.findFirst({
      where: { email: 'mariem.abessi@arstunisie.com' }
    });

    if (!mariem) {
      console.log('❌ Mariem not found');
      return;
    }

    console.log(`✅ Found: ${mariem.email}\n`);

    // Find 2 TRAITE bordereaux from PGH
    const traiteBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        client: { name: { contains: 'PGH' } }
      },
      include: { client: true },
      take: 2
    });

    if (traiteBordereaux.length === 0) {
      console.log('❌ No TRAITE bordereaux found');
      return;
    }

    console.log('📋 Found 2 TRAITE bordereaux\n');

    // Get first DonneurOrdre
    const donneurOrdre = await prisma.donneurOrdre.findFirst();
    if (!donneurOrdre) {
      console.log('❌ No DonneurOrdre found');
      return;
    }

    for (const bordereau of traiteBordereaux) {
      console.log(`🔄 Processing: ${bordereau.reference}`);
      
      // Assign to Mariem
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { assignedToUserId: mariem.id }
      });
      console.log(`   ✅ Assigned to Mariem`);

      // Create OV
      const ov = await prisma.ordreVirement.create({
        data: {
          reference: `TEST-OV-MARIEM-${Date.now()}-${bordereau.reference.slice(0, 10)}`,
          bordereauId: bordereau.id,
          donneurOrdreId: donneurOrdre.id,
          montantTotal: 1000,
          etatVirement: 'EXECUTE',
          dateCreation: new Date(),
          dateTraitement: new Date(),
          utilisateurSante: mariem.email,
          nombreAdherents: 1
        }
      });
      console.log(`   ✅ Created OV: ${ov.reference}`);

      // Update to VIREMENT_EXECUTE
      const updated = await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: {
          statut: 'VIREMENT_EXECUTE',
          dateExecutionVirement: new Date()
        }
      });
      console.log(`   ✅ Updated to VIREMENT_EXECUTE`);
      console.log(`   📊 Status: ${updated.statut}\n`);
    }

    console.log('🎉 Done! Check UI with mariem.abessi@arstunisie.com');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignVirementToGestionnaire();
