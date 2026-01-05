const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeniorDocuments() {
  console.log('=== Checking GESTIONNAIRE_SENIOR Documents ===\n');

  const seniors = await prisma.user.findMany({
    where: {
      role: 'GESTIONNAIRE_SENIOR',
      active: true
    },
    select: {
      id: true,
      fullName: true,
      email: true
    }
  });

  console.log(`Found ${seniors.length} GESTIONNAIRE_SENIOR users:\n`);

  // First, check ALL contracts in the system
  const allContracts = await prisma.contract.findMany({
    select: {
      id: true,
      clientName: true,
      codeAssure: true,
      assignedManagerId: true,
      teamLeaderId: true
    }
  });
  console.log(`\nTotal contracts in system: ${allContracts.length}`);
  console.log('Contracts with assignedManagerId:', allContracts.filter(c => c.assignedManagerId).length);
  console.log('Contracts with teamLeaderId:', allContracts.filter(c => c.teamLeaderId).length);

  // Check if any contracts have codeAssure that might link to seniors
  console.log('\nSample contracts:');
  allContracts.slice(0, 5).forEach(c => {
    console.log(`  - ${c.clientName} | codeAssure: ${c.codeAssure || 'NULL'} | manager: ${c.assignedManagerId || 'NULL'} | teamLeader: ${c.teamLeaderId || 'NULL'}`);
  });

  for (const senior of seniors) {
    console.log(`\n\n--- ${senior.fullName} ---`);
    console.log(`ID: ${senior.id}`);

    // Check direct document assignment
    const directDocs = await prisma.document.count({
      where: { assignedToUserId: senior.id }
    });
    console.log(`Direct documents assigned: ${directDocs}`);

    // Check contracts via assignedManagerId
    const contractsByManager = await prisma.contract.findMany({
      where: { assignedManagerId: senior.id },
      select: { id: true, clientName: true, codeAssure: true }
    });
    console.log(`Contracts via assignedManagerId: ${contractsByManager.length}`);

    // Check contracts via teamLeaderId
    const contractsByTeamLeader = await prisma.contract.findMany({
      where: { teamLeaderId: senior.id },
      select: { id: true, clientName: true, codeAssure: true }
    });
    console.log(`Contracts via teamLeaderId: ${contractsByTeamLeader.length}`);

    // Check if senior's name/email matches any contract codeAssure
    const contractsByCode = await prisma.contract.findMany({
      where: {
        OR: [
          { codeAssure: { contains: senior.fullName, mode: 'insensitive' } },
          { codeAssure: { contains: senior.email.split('@')[0], mode: 'insensitive' } }
        ]
      },
      select: { id: true, clientName: true, codeAssure: true }
    });
    console.log(`Contracts matching name/email in codeAssure: ${contractsByCode.length}`);

    const allSeniorContracts = [...contractsByManager, ...contractsByTeamLeader, ...contractsByCode];
    const uniqueContractIds = [...new Set(allSeniorContracts.map(c => c.id))];

    if (uniqueContractIds.length > 0) {
      console.log(`\nTotal unique contracts: ${uniqueContractIds.length}`);
      
      const bordereaux = await prisma.bordereau.findMany({
        where: { contractId: { in: uniqueContractIds } },
        select: { id: true, reference: true }
      });
      console.log(`Bordereaux from contracts: ${bordereaux.length}`);

      if (bordereaux.length > 0) {
        const bordereauIds = bordereaux.map(b => b.id);
        const docsCount = await prisma.document.count({
          where: { bordereauId: { in: bordereauIds } }
        });
        console.log(`Documents from bordereaux: ${docsCount}`);
      }
    }
  }

  await prisma.$disconnect();
}

checkSeniorDocuments().catch(console.error);
