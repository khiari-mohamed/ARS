import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTeamWorkload() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     VERIFICATION SCRIPT - TEAM WORKLOAD CALCULATION            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const now = new Date();

  // Get all CHEF_EQUIPE with their team members
  const chefEquipes = await prisma.user.findMany({
    where: {
      role: 'CHEF_EQUIPE',
      active: true
    },
    include: {
      teamMembers: {
        where: { active: true },
        include: {
          assignedDocuments: {
            include: {
              bordereau: {
                select: {
                  dateReception: true,
                  delaiReglement: true,
                  contract: {
                    select: { delaiReglement: true }
                  }
                }
              }
            }
          }
        }
      },
      assignedDocuments: {
        include: {
          bordereau: {
            select: {
              dateReception: true,
              delaiReglement: true,
              contract: {
                select: { delaiReglement: true }
              }
            }
          }
        }
      }
    }
  });

  // Get GESTIONNAIRE_SENIOR and RESPONSABLE_DEPARTEMENT
  const individualTeams = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'] },
      active: true
    },
    include: {
      assignedDocuments: {
        include: {
          bordereau: {
            select: {
              dateReception: true,
              delaiReglement: true,
              contract: {
                select: { delaiReglement: true }
              }
            }
          }
        }
      },
      contractsAsTeamLeader: {
        include: {
          bordereaux: {
            where: { archived: false },
            include: {
              documents: true,
              contract: true
            }
          }
        }
      }
    }
  });

  // Helper function: TIME-BASED CALCULATION
  const calculateTimeBasedUtilization = (documents: any[], capacity: number) => {
    let totalRequiredPerDay = 0;
    const docDetails: any[] = [];
    
    for (const doc of documents) {
      const bordereau = doc.bordereau || doc;
      const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
      const dateReception = bordereau?.dateReception || now;
      
      const deadlineDate = new Date(dateReception);
      deadlineDate.setDate(deadlineDate.getDate() + delaiReglement);
      
      const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const requiredPerDay = 1 / remainingDays;
      
      totalRequiredPerDay += requiredPerDay;
      
      docDetails.push({
        delaiReglement,
        remainingDays,
        requiredPerDay: requiredPerDay.toFixed(4)
      });
    }
    
    const utilizationRate = capacity > 0 ? Math.round((totalRequiredPerDay / capacity) * 100) : 0;
    return { utilizationRate, requiredPerDay: totalRequiredPerDay, docDetails };
  };

  console.log('📊 CHEF D\'ÉQUIPE TEAMS:\n');
  console.log('═'.repeat(80));

  for (const chef of chefEquipes) {
    const teamMembers = chef.teamMembers || [];
    const allDocs = [...chef.assignedDocuments, ...teamMembers.flatMap(m => m.assignedDocuments)];
    const totalCapacity = chef.capacity + teamMembers.reduce((sum, member) => sum + member.capacity, 0);
    
    const { utilizationRate, requiredPerDay, docDetails } = calculateTimeBasedUtilization(allDocs, totalCapacity);
    
    let level = '🟢 NORMAL';
    if (utilizationRate >= 90) {
      level = '🔴 SURCHARGÉ';
    } else if (utilizationRate >= 70) {
      level = '🟠 OCCUPÉ';
    }

    console.log(`\n👤 ${chef.fullName}`);
    console.log(`   Role: CHEF_EQUIPE`);
    console.log(`   Team Size: ${teamMembers.length + 1} (Chef + ${teamMembers.length} membres)`);
    console.log(`   Documents: ${allDocs.length}`);
    console.log(`   Capacity: ${totalCapacity}`);
    console.log(`   Required Per Day: ${requiredPerDay.toFixed(4)}`);
    console.log(`   Utilization: ${utilizationRate}%`);
    console.log(`   Status: ${level}`);
    
    if (allDocs.length > 0 && allDocs.length <= 5) {
      console.log(`\n   📄 Document Details:`);
      docDetails.forEach((doc, i) => {
        console.log(`      Doc ${i+1}: ${doc.remainingDays}j restants, délai=${doc.delaiReglement}j, charge=${doc.requiredPerDay}/jour`);
      });
    }
    
    console.log('   ' + '─'.repeat(76));
  }

  console.log('\n\n📊 INDIVIDUAL TEAMS (GESTIONNAIRE_SENIOR / RESPONSABLE_DEPARTEMENT):\n');
  console.log('═'.repeat(80));

  for (const user of individualTeams) {
    let allDocs = user.assignedDocuments;
    
    if (user.role === 'GESTIONNAIRE_SENIOR' && user.contractsAsTeamLeader) {
      allDocs = user.contractsAsTeamLeader.flatMap(contract => 
        contract.bordereaux.flatMap(bordereau => 
          bordereau.documents.map(doc => ({ ...doc, bordereau }))
        )
      );
    }
    
    const { utilizationRate, requiredPerDay, docDetails } = calculateTimeBasedUtilization(allDocs, user.capacity);
    
    let level = '🟢 NORMAL';
    if (utilizationRate >= 90) {
      level = '🔴 SURCHARGÉ';
    } else if (utilizationRate >= 70) {
      level = '🟠 OCCUPÉ';
    }

    console.log(`\n👤 ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Documents: ${allDocs.length}`);
    console.log(`   Capacity: ${user.capacity}`);
    console.log(`   Required Per Day: ${requiredPerDay.toFixed(4)}`);
    console.log(`   Utilization: ${utilizationRate}%`);
    console.log(`   Status: ${level}`);
    
    if (allDocs.length > 0 && allDocs.length <= 5) {
      console.log(`\n   📄 Document Details:`);
      docDetails.forEach((doc, i) => {
        console.log(`      Doc ${i+1}: ${doc.remainingDays}j restants, délai=${doc.delaiReglement}j, charge=${doc.requiredPerDay}/jour`);
      });
    }
    
    console.log('   ' + '─'.repeat(76));
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allTeams: any[] = [...chefEquipes, ...individualTeams];
  const overloaded = allTeams.filter((t: any) => {
    const docs = t.role === 'CHEF_EQUIPE' 
      ? [...t.assignedDocuments, ...(t.teamMembers || []).flatMap((m: any) => m.assignedDocuments)]
      : t.role === 'GESTIONNAIRE_SENIOR' && t.contractsAsTeamLeader
        ? t.contractsAsTeamLeader.flatMap((c: any) => c.bordereaux.flatMap((b: any) => b.documents.map((d: any) => ({ ...d, bordereau: b }))))
        : t.assignedDocuments;
    const capacity = t.role === 'CHEF_EQUIPE' 
      ? t.capacity + (t.teamMembers || []).reduce((sum: number, m: any) => sum + m.capacity, 0)
      : t.capacity;
    const { utilizationRate } = calculateTimeBasedUtilization(docs, capacity);
    return utilizationRate >= 90;
  });

  const busy = allTeams.filter((t: any) => {
    const docs = t.role === 'CHEF_EQUIPE' 
      ? [...t.assignedDocuments, ...(t.teamMembers || []).flatMap((m: any) => m.assignedDocuments)]
      : t.role === 'GESTIONNAIRE_SENIOR' && t.contractsAsTeamLeader
        ? t.contractsAsTeamLeader.flatMap((c: any) => c.bordereaux.flatMap((b: any) => b.documents.map((d: any) => ({ ...d, bordereau: b }))))
        : t.assignedDocuments;
    const capacity = t.role === 'CHEF_EQUIPE' 
      ? t.capacity + (t.teamMembers || []).reduce((sum: number, m: any) => sum + m.capacity, 0)
      : t.capacity;
    const { utilizationRate } = calculateTimeBasedUtilization(docs, capacity);
    return utilizationRate >= 70 && utilizationRate < 90;
  });

  console.log(`Total Teams: ${allTeams.length}`);
  console.log(`🔴 Surchargé (≥90%): ${overloaded.length}`);
  console.log(`🟠 Occupé (70-89%): ${busy.length}`);
  console.log(`🟢 Normal (<70%): ${allTeams.length - overloaded.length - busy.length}`);

  console.log('\n✅ Verification complete!\n');
  
  await prisma.$disconnect();
}

verifyTeamWorkload().catch(console.error);
