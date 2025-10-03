const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOVStatusUpdate() {
  console.log('🧪 Testing OV Status Update Workflow\n');
  
  try {
    // 1. Get first OV with NON_EXECUTE status
    const ov = await prisma.ordreVirement.findFirst({
      where: { etatVirement: 'NON_EXECUTE' },
      include: { donneurOrdre: true }
    });
    
    if (!ov) {
      console.log('❌ No OV found with NON_EXECUTE status');
      return;
    }
    
    console.log('✅ Found OV:', {
      id: ov.id,
      reference: ov.reference,
      currentStatus: ov.etatVirement,
      montant: ov.montantTotal
    });
    
    // 2. Update to EN_COURS_EXECUTION (Finance sends to bank)
    console.log('\n📤 Step 1: Finance sends to bank...');
    const updated1 = await prisma.ordreVirement.update({
      where: { id: ov.id },
      data: {
        etatVirement: 'EN_COURS_EXECUTION',
        utilisateurFinance: 'demo-finance',
        dateTraitement: new Date(),
        motifObservation: 'Envoyé à la banque pour traitement'
      }
    });
    console.log('✅ Status updated to:', updated1.etatVirement);
    
    // 3. Simulate bank confirmation - Update to EXECUTE
    console.log('\n🏦 Step 2: Bank confirms execution...');
    const updated2 = await prisma.ordreVirement.update({
      where: { id: ov.id },
      data: {
        etatVirement: 'EXECUTE',
        dateEtatFinal: new Date(),
        motifObservation: 'Virement exécuté avec succès par la banque'
      }
    });
    console.log('✅ Status updated to:', updated2.etatVirement);
    console.log('✅ Date final:', updated2.dateEtatFinal);
    
    // 4. Verify final state
    console.log('\n📊 Final State:');
    const final = await prisma.ordreVirement.findUnique({
      where: { id: ov.id }
    });
    
    console.log({
      reference: final.reference,
      status: final.etatVirement,
      dateCreation: final.dateCreation,
      dateTraitement: final.dateTraitement,
      dateEtatFinal: final.dateEtatFinal,
      utilisateurFinance: final.utilisateurFinance,
      motifObservation: final.motifObservation
    });
    
    console.log('\n✅ WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Status Progression:');
    console.log('   NON_EXECUTE → EN_COURS_EXECUTION → EXECUTE');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOVStatusUpdate();
