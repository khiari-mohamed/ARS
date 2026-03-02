import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSeniorWorkload() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 GESTIONNAIRE_SENIOR WORKLOAD CHECK');
  console.log('='.repeat(80));

  const seniors = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE_SENIOR', active: true }
  });

  console.log(`\nFound ${seniors.length} GESTIONNAIRE_SENIOR users\n`);

  for (const senior of seniors) {
    console.log(`\n👤 ${senior.fullName} (${senior.id})`);
    console.log('─'.repeat(60));

    // Method 1: Direct assignment
    const directDocs = await prisma.document.count({
      where: { assignedToUserId: senior.id }
    });
    console.log(`📄 Direct assignment (assignedToUserId): ${directDocs}`);

    // Method 2: Via contract.teamLeaderId
    const contractDocs = await prisma.document.count({
      where: {
        bordereau: {
          archived: false,
          contract: {
            teamLeaderId: senior.id
          }
        }
      }
    });
    console.log(`📄 Via contract.teamLeaderId: ${contractDocs}`);

    // Method 3: Check contracts
    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: senior.id },
      select: { id: true, clientName: true }
    });
    console.log(`📋 Contracts managed: ${contracts.length}`);
    if (contracts.length > 0) {
      console.log(`   Clients: ${contracts.map(c => c.clientName).join(', ')}`);
    }

    // Method 4: Check bordereaux via contracts
    const bordereaux = await prisma.bordereau.count({
      where: {
        archived: false,
        contract: {
          teamLeaderId: senior.id
        }
      }
    });
    console.log(`📦 Bordereaux via contracts: ${bordereaux}`);

    // Method 5: Sample documents
    const sampleDocs = await prisma.document.findMany({
      where: {
        bordereau: {
          archived: false,
          contract: {
            teamLeaderId: senior.id
          }
        }
      },
      take: 3,
      include: {
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        }
      }
    });

    if (sampleDocs.length > 0) {
      console.log(`\n   Sample documents:`);
      sampleDocs.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.name} - Client: ${doc.bordereau?.client?.name}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  await prisma.$disconnect();
}

checkSeniorWorkload().catch(console.error);
