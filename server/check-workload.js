const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkload() {
  console.log('\n📊 VÉRIFICATION DE LA CHARGE DE TRAVAIL\n');
  console.log('='.repeat(80));

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE'] },
      active: true
    },
    orderBy: [
      { role: 'asc' },
      { fullName: 'asc' }
    ]
  });

  console.log(`\n👥 Total users: ${users.length}\n`);

  for (const user of users) {
    // Count bordereaux where user is currentHandler
    const asHandler = await prisma.bordereau.count({
      where: {
        currentHandlerId: user.id,
        statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
      }
    });

    // Count bordereaux where user is team member
    const asTeam = await prisma.bordereau.count({
      where: {
        teamId: user.id,
        statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
      }
    });

    // For CHEF_EQUIPE: count team members' bordereaux
    let teamTotal = 0;
    if (user.role === 'CHEF_EQUIPE') {
      teamTotal = await prisma.bordereau.count({
        where: {
          OR: [
            { currentHandlerId: user.id },
            { teamId: user.id },
            {
              currentHandler: {
                teamLeaderId: user.id
              }
            }
          ],
          statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
        }
      });
    }

    const workload = Math.max(asHandler, asTeam, teamTotal);
    const utilization = user.capacity > 0 ? Math.round((workload / user.capacity) * 100) : 0;

    console.log(`\n${user.fullName} (${user.role})`);
    console.log(`  Capacité: ${user.capacity}`);
    console.log(`  📋 Bordereaux (currentHandler): ${asHandler}`);
    console.log(`  👥 Bordereaux (team): ${asTeam}`);
    if (user.role === 'CHEF_EQUIPE') {
      console.log(`  🏢 Bordereaux (équipe totale): ${teamTotal}`);
    }
    console.log(`  📊 Charge totale: ${workload}`);
    console.log(`  📈 Utilisation: ${utilization}%`);
    
    if (utilization >= 90) {
      console.log(`  🔴 SURCHARGÉ!`);
    } else if (utilization >= 70) {
      console.log(`  🟠 OCCUPÉ`);
    } else {
      console.log(`  🟢 NORMAL`);
    }
  }

  console.log('\n' + '='.repeat(80));
  
  // Summary
  const totalBordereaux = await prisma.bordereau.count({
    where: {
      statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
    }
  });
  
  const withHandler = await prisma.bordereau.count({
    where: {
      currentHandlerId: { not: null },
      statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
    }
  });
  
  const withTeam = await prisma.bordereau.count({
    where: {
      teamId: { not: null },
      statut: { in: ['ASSIGNE', 'EN_COURS', 'A_AFFECTER', 'SCANNE', 'TRAITE'] }
    }
  });
  
  console.log(`\n📊 RÉSUMÉ GLOBAL:`);
  console.log(`   Total bordereaux actifs: ${totalBordereaux}`);
  console.log(`   Avec currentHandler: ${withHandler}`);
  console.log(`   Avec team: ${withTeam}`);
  console.log(`   Non assignés: ${totalBordereaux - Math.max(withHandler, withTeam)}`);

  await prisma.$disconnect();
}

checkWorkload().catch(console.error);
