import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareWorkloadCalculations() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON: OLD vs NEW WORKLOAD CALCULATION');
  console.log('='.repeat(80));

  const now = new Date();

  // Get GESTIONNAIRE_SENIOR users
  const seniors = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE_SENIOR', active: true },
    include: {
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

  console.log(`\nFound ${seniors.length} GESTIONNAIRE_SENIOR users\n`);

  for (const senior of seniors) {
    console.log(`\n👤 ${senior.fullName}`);
    console.log('─'.repeat(60));

    // Get all documents
    const allDocs = senior.contractsAsTeamLeader.flatMap(contract =>
      contract.bordereaux.flatMap(bordereau =>
        bordereau.documents.map(doc => ({ ...doc, bordereau, contract }))
      )
    );

    const totalDocs = allDocs.length;
    const capacity = senior.capacity;

    // OLD CALCULATION: Simple docs / capacity
    const oldUtilization = capacity > 0 ? Math.round((totalDocs / capacity) * 100) : 0;

    // NEW CALCULATION: Time-based (docs required per day)
    let totalRequiredPerDay = 0;
    const docsByDeadline: Record<number, number> = {};

    for (const doc of allDocs) {
      const bordereau = doc.bordereau;
      const delaiReglement = bordereau?.delaiReglement || bordereau?.contract?.delaiReglement || 30;
      const dateReception = bordereau?.dateReception || now;

      const deadlineDate = new Date(dateReception);
      deadlineDate.setDate(deadlineDate.getDate() + delaiReglement);

      const remainingDays = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      totalRequiredPerDay += 1 / remainingDays;

      // Group by remaining days for display
      docsByDeadline[remainingDays] = (docsByDeadline[remainingDays] || 0) + 1;
    }

    const newUtilization = capacity > 0 ? Math.round((totalRequiredPerDay / capacity) * 100) : 0;

    // Display results
    console.log(`📄 Total Documents: ${totalDocs}`);
    console.log(`⚙️  Capacity: ${capacity} docs/day`);
    console.log('');
    console.log(`OLD METHOD (Simple Count):`);
    console.log(`  Formula: (${totalDocs} / ${capacity}) × 100 = ${oldUtilization}%`);
    console.log(`  Status: ${oldUtilization >= 90 ? '🔴 OVERLOADED' : oldUtilization >= 70 ? '🟠 BUSY' : '🟢 NORMAL'}`);
    console.log('');
    console.log(`NEW METHOD (Time-Based):`);
    console.log(`  Required/Day: ${totalRequiredPerDay.toFixed(2)} docs/day`);
    console.log(`  Formula: (${totalRequiredPerDay.toFixed(2)} / ${capacity}) × 100 = ${newUtilization}%`);
    console.log(`  Status: ${newUtilization >= 90 ? '🔴 OVERLOADED' : newUtilization >= 70 ? '🟠 BUSY' : '🟢 NORMAL'}`);
    console.log('');
    console.log(`📊 Documents by Remaining Days:`);
    
    const sortedDeadlines = Object.keys(docsByDeadline)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 5); // Show top 5

    for (const days of sortedDeadlines) {
      const count = docsByDeadline[days];
      const requiredPerDay = count / days;
      console.log(`  • ${count} docs in ${days} days → ${requiredPerDay.toFixed(2)} docs/day required`);
    }

    if (Object.keys(docsByDeadline).length > 5) {
      console.log(`  ... and ${Object.keys(docsByDeadline).length - 5} more deadline groups`);
    }

    console.log('');
    console.log(`💡 DIFFERENCE: ${Math.abs(newUtilization - oldUtilization)}% ${newUtilization > oldUtilization ? '(NEW is higher)' : '(OLD is higher)'}`);
    
    if (Math.abs(newUtilization - oldUtilization) > 10) {
      console.log(`⚠️  SIGNIFICANT DIFFERENCE! Time-based calculation shows ${newUtilization > oldUtilization ? 'MORE' : 'LESS'} pressure`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log('OLD METHOD: Utilization = (Total Docs / Capacity) × 100');
  console.log('  ❌ Ignores deadlines');
  console.log('  ❌ Treats all documents equally');
  console.log('  ❌ Not realistic');
  console.log('');
  console.log('NEW METHOD: Utilization = (Σ(1/RemainingDays) / Capacity) × 100');
  console.log('  ✅ Considers deadlines');
  console.log('  ✅ Urgent docs count more');
  console.log('  ✅ Realistic workload');
  console.log('');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

compareWorkloadCalculations().catch(console.error);
