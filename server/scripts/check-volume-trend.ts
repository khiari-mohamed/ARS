import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVolumeTrend() {
  console.log('📊 Checking Volume de Traitement...\n');
  
  try {
    // This is how the backend gets volume data
    const bsPerDay = await prisma.bordereau.groupBy({
      by: ['createdAt'],
      _count: { id: true }
    });
    
    console.log(`📈 Total data points: ${bsPerDay.length}\n`);
    
    // Group by actual date (not timestamp)
    const dateMap = new Map<string, number>();
    
    for (const day of bsPerDay) {
      const date = new Date(day.createdAt).toLocaleDateString('fr-FR');
      dateMap.set(date, (dateMap.get(date) || 0) + (day._count?.id || 0));
    }
    
    console.log('📅 Volume by Date (grouped correctly):');
    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => {
        const dateA = new Date(a[0].split('/').reverse().join('-'));
        const dateB = new Date(b[0].split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
    
    sortedDates.forEach(([date, count]) => {
      console.log(`   ${date}: ${count} bordereaux`);
    });
    
    console.log('\n\n❌ PROBLEM:');
    console.log('   The backend groups by createdAt TIMESTAMP (includes time)');
    console.log('   This creates multiple entries for the same DATE');
    console.log('   Example: 12/12/2025 10:00 and 12/12/2025 14:00 are separate groups');
    
    console.log('\n\n✅ SOLUTION:');
    console.log('   Group by DATE only (not timestamp)');
    console.log('   Use SQL DATE() function or group in code');
    
    // Show raw data sample
    console.log('\n\n🔍 Raw data sample (first 10):');
    bsPerDay.slice(0, 10).forEach((day, i) => {
      const date = new Date(day.createdAt);
      console.log(`   ${i + 1}. ${date.toLocaleString('fr-FR')}: ${day._count?.id || 0} bordereaux`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVolumeTrend();
