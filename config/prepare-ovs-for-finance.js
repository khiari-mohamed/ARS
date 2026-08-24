// Update OVs to VIREMENT_DEPOSE status for Finance testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Updating OVs to VIREMENT_DEPOSE status...\n');

  // Get all existing OVs
  const allOVs = await prisma.ordreVirement.findMany({
    include: {
      bordereau: true,
      donneurOrdre: true
    }
  });

  console.log(`📊 Found ${allOVs.length} OVs\n`);

  if (allOVs.length === 0) {
    console.log('❌ No OVs found. Run generate-finance-test-data.js first.');
    return;
  }

  // Get first user for history
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('❌ No users found.');
    return;
  }

  console.log('📝 Updating OVs to complete validation workflow...\n');

  for (const ov of allOVs) {
    // Update OV to VIREMENT_DEPOSE (approved by Responsable)
    const updated = await prisma.ordreVirement.update({
      where: { id: ov.id },
      data: {
        etatVirement: 'VIREMENT_DEPOSE',
        validationStatus: 'VALIDE',
        validatedBy: user.id,
        validatedAt: new Date(),
        validationComment: 'Validé automatiquement pour test Finance',
        statutGlobal: 'VALIDE_INTERNE',
        dateTraitement: new Date()
      }
    });

    // Add history entry
    await prisma.virementHistory.create({
      data: {
        virementId: ov.id,
        action: 'VALIDATION',
        previousState: 'EN_ATTENTE_VALIDATION',
        newState: 'VIREMENT_DEPOSE',
        comment: 'OV validé et déposé - prêt pour autorisation Finance',
        userId: user.id
      }
    });

    console.log(`   ✓ ${ov.reference}: ${ov.etatVirement} → VIREMENT_DEPOSE`);
  }

  console.log('\n✅ All OVs updated successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - Total OVs: ${allOVs.length}`);
  console.log(`   - Status: VIREMENT_DEPOSE (ready for Finance authorization)`);
  console.log(`   - Validation Status: VALIDE`);
  console.log(`   - Global Status: VALIDE_INTERNE`);
  
  console.log('\n🧪 Now you can:');
  console.log('   1. Login as Finance role');
  console.log('   2. Go to Finance Module → Suivi & Statut');
  console.log('   3. Test the following actions:');
  console.log('      • Virement Autorisé (should work)');
  console.log('      • Virement Bloqué');
  console.log('      • Virement Exécuté');
  console.log('      • Virement Rejeté');
  console.log('   4. Verify "Virement Déposé" appears in status filter');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
