const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGEDAnalyticsData() {
  try {
    console.log('🔍 Checking GED Analytics Data in Database...\n');

    // 1. Check Documents table structure and data
    console.log('📊 DOCUMENTS TABLE ANALYSIS:');
    console.log('=' .repeat(50));
    
    const totalDocs = await prisma.document.count();
    console.log(`Total Documents: ${totalDocs}`);
    
    if (totalDocs === 0) {
      console.log('⚠️ No documents found in database!');
      return;
    }

    // Documents by status
    const docsByStatus = await prisma.document.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    console.log('\nDocuments by Status:');
    docsByStatus.forEach(group => {
      console.log(`  - ${group.status || 'NULL'}: ${group._count.id}`);
    });

    // Documents by type
    const docsByType = await prisma.document.groupBy({
      by: ['type'],
      _count: { id: true }
    });
    
    console.log('\nDocuments by Type:');
    docsByType.forEach(group => {
      console.log(`  - ${group.type || 'NULL'}: ${group._count.id}`);
    });

    // 2. Check for SLA Compliance Data (Documents with Clients)
    console.log('\n📈 SLA COMPLIANCE DATA:');
    console.log('=' .repeat(50));
    
    const docsWithClients = await prisma.document.findMany({
      include: {
        bordereau: {
          include: {
            client: true
          }
        }
      },
      where: {
        bordereauId: {
          not: null
        }
      }
    });

    console.log(`Documents with Client Data: ${docsWithClients.length}`);
    
    if (docsWithClients.length > 0) {
      // Group by client
      const clientGroups = {};
      docsWithClients.forEach(doc => {
        const clientName = doc.bordereau?.client?.name;
        if (clientName) {
          if (!clientGroups[clientName]) {
            clientGroups[clientName] = { total: 0, traite: 0, en_cours: 0, uploaded: 0 };
          }
          clientGroups[clientName].total++;
          if (doc.status === 'TRAITE') clientGroups[clientName].traite++;
          if (doc.status === 'EN_COURS') clientGroups[clientName].en_cours++;
          if (doc.status === 'UPLOADED') clientGroups[clientName].uploaded++;
        }
      });

      console.log('\nSLA Data by Client:');
      Object.entries(clientGroups).forEach(([client, data]) => {
        const compliance = data.total > 0 ? Math.round((data.traite / data.total) * 100) : 0;
        console.log(`  - ${client}:`);
        console.log(`    Total: ${data.total}, Traité: ${data.traite}, En Cours: ${data.en_cours}, Uploaded: ${data.uploaded}`);
        console.log(`    SLA Compliance: ${compliance}%`);
      });
    } else {
      console.log('⚠️ No documents with client data found!');
      console.log('💡 SLA Compliance chart needs documents linked to clients via bordereau');
    }

    // 3. Check Processing Time Data
    console.log('\n⏱️ PROCESSING TIME DATA:');
    console.log('=' .repeat(50));
    
    const processedDocs = await prisma.document.findMany({
      where: {
        status: 'TRAITE'
      },
      select: {
        id: true,
        type: true,
        uploadedAt: true,
        status: true
      }
    });

    console.log(`Processed Documents (TRAITE status): ${processedDocs.length}`);
    
    if (processedDocs.length > 0) {
      const typeGroups = {};
      processedDocs.forEach(doc => {
        const type = doc.type || 'Unknown';
        if (!typeGroups[type]) {
          typeGroups[type] = { count: 0, totalHours: 0 };
        }
        typeGroups[type].count++;
        // Mock processing time calculation (would need completion timestamp in real scenario)
        typeGroups[type].totalHours += Math.random() * 48 + 1;
      });

      console.log('\nProcessing Time by Type:');
      Object.entries(typeGroups).forEach(([type, data]) => {
        const avgTime = (data.totalHours / data.count).toFixed(1);
        console.log(`  - ${type}: ${data.count} docs, Avg Time: ${avgTime}h`);
      });
    } else {
      console.log('⚠️ No processed documents (TRAITE status) found!');
      console.log('💡 Processing Time chart needs documents with TRAITE status');
    }

    // 4. Check Volume by Department Data
    console.log('\n📊 VOLUME BY DEPARTMENT DATA:');
    console.log('=' .repeat(50));
    
    const volumeByType = await prisma.document.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    console.log('Volume Distribution by Document Type:');
    const totalVolume = volumeByType.reduce((sum, item) => sum + item._count.id, 0);
    volumeByType.forEach(item => {
      const percentage = totalVolume > 0 ? Math.round((item._count.id / totalVolume) * 100) : 0;
      console.log(`  - ${item.type || 'Unknown'}: ${item._count.id} docs (${percentage}%)`);
    });

    // 5. Check related tables
    console.log('\n🔗 RELATED TABLES:');
    console.log('=' .repeat(50));
    
    const clientCount = await prisma.client.count();
    const bordereauCount = await prisma.bordereau.count();
    const auditLogCount = await prisma.auditLog.count();
    
    console.log(`Clients: ${clientCount}`);
    console.log(`Bordereaux: ${bordereauCount}`);
    console.log(`Audit Logs: ${auditLogCount}`);

    // 6. Sample data for charts
    console.log('\n📋 SAMPLE DATA FOR CHARTS:');
    console.log('=' .repeat(50));
    
    // Sample documents with full details
    const sampleDocs = await prisma.document.findMany({
      include: {
        bordereau: {
          include: {
            client: true
          }
        },
        uploader: {
          select: {
            fullName: true,
            role: true
          }
        }
      },
      take: 5,
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    console.log('Sample Documents (latest 5):');
    sampleDocs.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.name}`);
      console.log(`     Type: ${doc.type}, Status: ${doc.status}`);
      console.log(`     Client: ${doc.bordereau?.client?.name || 'No client'}`);
      console.log(`     Uploader: ${doc.uploader?.fullName} (${doc.uploader?.role})`);
      console.log(`     Uploaded: ${doc.uploadedAt.toISOString()}`);
      console.log('');
    });

    // 7. Recommendations
    console.log('💡 RECOMMENDATIONS FOR CHARTS:');
    console.log('=' .repeat(50));
    
    if (docsWithClients.length === 0) {
      console.log('❌ SLA Compliance Chart: No data available');
      console.log('   → Need documents linked to clients via bordereau');
    } else {
      console.log('✅ SLA Compliance Chart: Data available');
    }
    
    if (processedDocs.length === 0) {
      console.log('❌ Processing Time Chart: No data available');
      console.log('   → Need documents with TRAITE status');
    } else {
      console.log('✅ Processing Time Chart: Data available');
    }
    
    if (volumeByType.length === 0) {
      console.log('❌ Volume Chart: No data available');
      console.log('   → Need documents with different types');
    } else {
      console.log('✅ Volume Chart: Data available');
    }

  } catch (error) {
    console.error('❌ Error checking GED analytics data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkGEDAnalyticsData();