const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUTSSBordereau() {
  try {
    console.log('\n=== Checking UTSS Bordereau ===\n');
    
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'U-BULLETIN-2026-72980' },
      include: {
        client: true,
        contract: {
          include: {
            teamLeader: { select: { id: true, fullName: true, role: true } }
          }
        },
        documents: {
          take: 5,
          include: {
            assignedTo: { select: { fullName: true } }
          }
        }
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau U-BULLETIN-2026-72980 NOT FOUND');
      return;
    }

    console.log('✅ Bordereau Found:');
    console.log('  Reference:', bordereau.reference);
    console.log('  Client:', bordereau.client?.name);
    console.log('  Client ID:', bordereau.clientId);
    console.log('  Contract ID:', bordereau.contractId);
    console.log('  Contract Team Leader:', bordereau.contract?.teamLeader?.fullName);
    console.log('  Contract Team Leader ID:', bordereau.contract?.teamLeaderId);
    console.log('  Total Documents:', bordereau.documents.length);
    console.log('\n  Sample Documents:');
    bordereau.documents.forEach((doc, i) => {
      console.log(`    ${i+1}. ${doc.name} - ${doc.type} - ${doc.status} - Assigned: ${doc.assignedTo?.fullName || 'None'}`);
    });

    // Now check gestionnaire senior users
    console.log('\n=== Checking Gestionnaire Senior Users ===\n');
    const seniors = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE_SENIOR' },
      select: { id: true, fullName: true, email: true }
    });

    console.log('Gestionnaire Seniors:');
    seniors.forEach(s => {
      console.log(`  - ${s.fullName} (${s.email}) - ID: ${s.id}`);
    });

    // Check if any senior is team leader for UTSS contracts
    console.log('\n=== Checking UTSS Contracts ===\n');
    const utssClient = await prisma.client.findFirst({
      where: { name: { contains: 'UTSS', mode: 'insensitive' } }
    });

    if (utssClient) {
      console.log('UTSS Client:', utssClient.name, '- ID:', utssClient.id);
      
      const utssContracts = await prisma.contract.findMany({
        where: { clientId: utssClient.id },
        include: {
          teamLeader: { select: { fullName: true, role: true } }
        }
      });

      console.log('UTSS Contracts:', utssContracts.length);
      utssContracts.forEach(c => {
        console.log(`  - Contract ${c.id}: Team Leader = ${c.teamLeader?.fullName} (${c.teamLeader?.role})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUTSSBordereau();
