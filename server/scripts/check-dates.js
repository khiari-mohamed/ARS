const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDocumentDates() {
  try {
    console.log('🔍 Checking document dates in database...\n');

    // Get all documents with their upload dates
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        uploadedAt: true,
        assignedToUserId: true,
        type: true,
        status: true
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: 50
    });

    if (documents.length === 0) {
      console.log('❌ No documents found in database');
      return;
    }

    console.log(`✅ Found ${documents.length} documents\n`);

    // Group by date
    const dateMap = new Map();
    documents.forEach(doc => {
      if (doc.uploadedAt) {
        const dateStr = new Date(doc.uploadedAt).toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, []);
        }
        dateMap.get(dateStr).push(doc);
      }
    });

    console.log('📅 Documents by date:\n');
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    
    sortedDates.forEach(([date, docs]) => {
      const [year, month, day] = date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      console.log(`   ${formattedDate} - ${docs.length} documents`);
    });

    console.log('\n📊 Suggested test dates (with most documents):\n');
    const topDates = sortedDates.slice(0, 5);
    topDates.forEach(([date, docs], index) => {
      const [year, month, day] = date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      console.log(`   ${index + 1}. ${formattedDate} (${docs.length} documents)`);
    });

    // Check gestionnaires with documents
    console.log('\n👥 Gestionnaires with documents:\n');
    const gestionnaires = await prisma.user.findMany({
      where: {
        role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'] },
        active: true
      },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    for (const gest of gestionnaires) {
      const docCount = await prisma.document.count({
        where: { assignedToUserId: gest.id }
      });
      console.log(`   ${gest.fullName || gest.email}: ${docCount} documents`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentDates();
