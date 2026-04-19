import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseAmarisBodereau() {
  console.log('================================================================================');
  console.log('DIAGNOSTIC: AMARIS BORD 6-26 Status Mismatch');
  console.log('================================================================================\n');

  try {
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'AMARIS BORD 6-26' },
      include: {
        client: { select: { name: true } },
        currentHandler: { select: { id: true, fullName: true, role: true } },
        contract: {
          select: {
            teamLeaderId: true,
            teamLeader: { select: { id: true, fullName: true, role: true } }
          }
        },
        virement: { select: { id: true, confirmed: true, dateDepot: true } },
        documents: {
          select: { id: true, type: true, status: true },
          take: 5
        }
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau not found!');
      return;
    }

    console.log('📋 BORDEREAU INFORMATION:');
    console.log('--------------------------------------------------------------------------------');
    console.log('Reference:', bordereau.reference);
    console.log('Client:', bordereau.client?.name);
    console.log('');
    
    console.log('🔴 CRITICAL FIELDS:');
    console.log('--------------------------------------------------------------------------------');
    console.log('statut:', bordereau.statut);
    console.log('scanStatus:', bordereau.scanStatus);
    console.log('archived:', bordereau.archived);
    console.log('');
    
    console.log('👤 ASSIGNMENT:');
    console.log('--------------------------------------------------------------------------------');
    console.log('currentHandlerId:', bordereau.currentHandlerId);
    console.log('currentHandler:', bordereau.currentHandler?.fullName || 'None');
    console.log('currentHandler role:', bordereau.currentHandler?.role || 'N/A');
    console.log('');
    console.log('contract.teamLeaderId:', bordereau.contract?.teamLeaderId);
    console.log('contract.teamLeader:', bordereau.contract?.teamLeader?.fullName || 'None');
    console.log('contract.teamLeader role:', bordereau.contract?.teamLeader?.role || 'N/A');
    console.log('');
    
    console.log('💰 VIREMENT:');
    console.log('--------------------------------------------------------------------------------');
    if (bordereau.virement) {
      console.log('Virement exists: YES');
      console.log('Confirmed:', bordereau.virement.confirmed);
      console.log('Date depot:', bordereau.virement.dateDepot);
    } else {
      console.log('Virement exists: NO');
    }
    console.log('');
    
    console.log('📄 DOCUMENTS (sample):');
    console.log('--------------------------------------------------------------------------------');
    bordereau.documents.slice(0, 5).forEach((doc, idx) => {
      console.log(`${idx + 1}. Type: ${doc.type}, Status: ${doc.status}`);
    });
    console.log(`Total documents: ${bordereau.documents.length}`);
    console.log('');
    
    console.log('📊 DATES:');
    console.log('--------------------------------------------------------------------------------');
    console.log('dateReception:', bordereau.dateReception);
    console.log('dateDebutScan:', bordereau.dateDebutScan);
    console.log('dateFinScan:', bordereau.dateFinScan);
    console.log('dateReceptionSante:', bordereau.dateReceptionSante);
    console.log('dateCloture:', bordereau.dateCloture);
    console.log('dateExecutionVirement:', bordereau.dateExecutionVirement);
    console.log('');
    
    console.log('🔍 ANALYSIS:');
    console.log('================================================================================');
    console.log('Expected behavior:');
    console.log('  - If statut = VIREMENT_EXECUTE → should show "VIREMENT_EXECUTE" not "A scanner"');
    console.log('  - If virement exists and confirmed → statut should be VIREMENT_EXECUTE');
    console.log('');
    console.log('Current state:');
    console.log(`  - statut: ${bordereau.statut}`);
    console.log(`  - scanStatus: ${bordereau.scanStatus}`);
    console.log(`  - virement: ${bordereau.virement ? 'EXISTS' : 'NONE'}`);
    console.log('');
    
    if (bordereau.statut === 'VIREMENT_EXECUTE' && bordereau.scanStatus === 'A_SCANNER') {
      console.log('⚠️  MISMATCH DETECTED:');
      console.log('   statut = VIREMENT_EXECUTE but scanStatus = A_SCANNER');
      console.log('   This could cause display issues in the dashboard!');
    } else if (bordereau.statut === 'VIREMENT_EXECUTE') {
      console.log('✅ Status is correct: VIREMENT_EXECUTE');
    } else {
      console.log('ℹ️  Status:', bordereau.statut);
    }
    
    console.log('');
    console.log('🔎 CHECKING WHO CAN SEE THIS BORDEREAU:');
    console.log('--------------------------------------------------------------------------------');
    console.log('Cyrine Chouk (Gestionnaire Senior) can see if:');
    console.log('  - contract.teamLeaderId matches Cyrine\'s ID');
    console.log('  - OR currentHandlerId matches Cyrine\'s ID');
    console.log('');
    
    // Check Cyrine's ID
    const cyrine = await prisma.user.findFirst({
      where: { fullName: { contains: 'Cyrine' } },
      select: { id: true, fullName: true, role: true }
    });
    
    if (cyrine) {
      console.log('Cyrine Chouk found:');
      console.log('  ID:', cyrine.id);
      console.log('  Role:', cyrine.role);
      console.log('');
      console.log('Can Cyrine see this bordereau?');
      const canSeeViaTeamLeader = bordereau.contract?.teamLeaderId === cyrine.id;
      const canSeeViaCurrentHandler = bordereau.currentHandlerId === cyrine.id;
      console.log('  Via teamLeaderId:', canSeeViaTeamLeader ? '✅ YES' : '❌ NO');
      console.log('  Via currentHandlerId:', canSeeViaCurrentHandler ? '✅ YES' : '❌ NO');
      console.log('  Overall:', (canSeeViaTeamLeader || canSeeViaCurrentHandler) ? '✅ CAN SEE' : '❌ CANNOT SEE');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseAmarisBodereau();
