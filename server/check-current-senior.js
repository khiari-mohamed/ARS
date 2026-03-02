const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentSenior() {
  try {
    // Check which senior can see UTSS
    const seniors = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE_SENIOR' },
      select: { id: true, fullName: true, email: true }
    });

    console.log('\n=== Checking which senior can see UTSS ===\n');
    
    for (const senior of seniors) {
      const bordereaux = await prisma.bordereau.count({
        where: {
          archived: false,
          contract: { teamLeaderId: senior.id }
        }
      });

      const utssCount = await prisma.bordereau.count({
        where: {
          archived: false,
          contract: { 
            teamLeaderId: senior.id,
            client: { name: 'UTSS' }
          }
        }
      });

      console.log(`${senior.fullName}:`);
      console.log(`  Total Bordereaux: ${bordereaux}`);
      console.log(`  UTSS Bordereaux: ${utssCount}`);
      
      if (utssCount > 0) {
        const utss = await prisma.bordereau.findMany({
          where: {
            archived: false,
            contract: { 
              teamLeaderId: senior.id,
              client: { name: 'UTSS' }
            }
          },
          select: { reference: true }
        });
        console.log(`  UTSS References:`, utss.map(b => b.reference).join(', '));
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentSenior();
