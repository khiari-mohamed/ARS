import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCorruptedDates() {
  console.log('🔧 Starting date corruption fix...');
  
  // Find all bordereaux with corrupted dates (before 2020)
  const corruptedBordereaux = await prisma.bordereau.findMany({
    where: {
      dateReception: {
        lt: new Date('2020-01-01')
      }
    },
    select: {
      id: true,
      reference: true,
      dateReception: true,
      dateReceptionBO: true,
      createdAt: true
    }
  });

  console.log(`📊 Found ${corruptedBordereaux.length} bordereaux with corrupted dates`);

  let fixed = 0;
  let skipped = 0;

  for (const bordereau of corruptedBordereaux) {
    // Use createdAt as the correct date (dateReceptionBO is also corrupted)
    const correctDate = bordereau.createdAt;
    
    try {
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { 
          dateReception: correctDate,
          dateReceptionBO: correctDate
        }
      });
      
      console.log(`✅ Fixed ${bordereau.reference}: 1970 → ${correctDate.toISOString().split('T')[0]}`);
      fixed++;
    } catch (error) {
      console.error(`❌ Failed to fix ${bordereau.reference}:`, error);
      skipped++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} bordereaux`);
  console.log(`⚠️ Skipped ${skipped} bordereaux`);
  console.log('🎉 Date corruption fix completed!');
}

fixCorruptedDates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
