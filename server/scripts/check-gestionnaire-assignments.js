const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGestionnaireAssignments() {
  try {
    console.log('🔍 Analyzing Gestionnaire assignments...\n');

    // Get all gestionnaire users
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: {
        id: true,
        fullName: true,
        email: true,
        active: true,
        department: true
      }
    });

    console.log(`📊 Found ${gestionnaires.length} Gestionnaire users:`);
    gestionnaires.forEach((gest, index) => {
      console.log(`${index + 1}. ${gest.fullName} (${gest.email}) - ${gest.active ? 'Active' : 'Inactive'}`);
      if (gest.department) console.log(`   Department: ${gest.department}`);
    });

    console.log('\n');

    // For each gestionnaire, check their assignments
    for (const gestionnaire of gestionnaires) {
      console.log(`🎯 Analyzing assignments for: ${gestionnaire.fullName}`);
      console.log('==================================================');

      // Check assigned bordereaux
      const assignedBordereaux = await prisma.bordereau.findMany({
        where: { 
          OR: [
            { assignedToUserId: gestionnaire.id },
            { currentHandlerId: gestionnaire.id }
          ]
        },
        include: {
          client: { select: { name: true } },
          documents: true
        }
      });

      console.log(`📄 Bordereaux assigned: ${assignedBordereaux.length}`);
      if (assignedBordereaux.length > 0) {
        console.log('📊 Bordereau status breakdown:');
        const statusBreakdown = {};
        assignedBordereaux.forEach(b => {
          statusBreakdown[b.statut] = (statusBreakdown[b.statut] || 0) + 1;
        });
        Object.entries(statusBreakdown).forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}`);
        });

        console.log('📋 Sample bordereaux:');
        assignedBordereaux.slice(0, 3).forEach(b => {
          console.log(`  • ${b.reference} - ${b.client?.name} (${b.statut}) - ${b.documents.length} docs`);
        });
      }

      // Check assigned documents
      const assignedDocuments = await prisma.document.findMany({
        where: { assignedToUserId: gestionnaire.id },
        include: {
          bordereau: {
            include: { client: { select: { name: true } } }
          }
        }
      });

      console.log(`📑 Documents assigned: ${assignedDocuments.length}`);
      if (assignedDocuments.length > 0) {
        console.log('📊 Document type breakdown:');
        const typeBreakdown = {};
        assignedDocuments.forEach(d => {
          typeBreakdown[d.type] = (typeBreakdown[d.type] || 0) + 1;
        });
        Object.entries(typeBreakdown).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}`);
        });

        console.log('📊 Document status breakdown:');
        const statusBreakdown = {};
        assignedDocuments.forEach(d => {
          const status = d.status || 'UPLOADED';
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });
        Object.entries(statusBreakdown).forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}`);
        });

        console.log('📋 Sample documents:');
        assignedDocuments.slice(0, 3).forEach(d => {
          console.log(`  • ${d.name} - ${d.bordereau?.client?.name} (${d.status || 'UPLOADED'})`);
        });
      }

      // Check bulletin soins assigned
      const assignedBS = await prisma.bulletinSoin.findMany({
        where: { 
          OR: [
            { ownerId: gestionnaire.id },
            { processedById: gestionnaire.id }
          ]
        },
        include: {
          bordereau: {
            include: { client: { select: { name: true } } }
          }
        }
      });

      console.log(`📋 Bulletin Soins assigned: ${assignedBS.length}`);
      if (assignedBS.length > 0) {
        console.log('📊 BS status breakdown:');
        const statusBreakdown = {};
        assignedBS.forEach(bs => {
          statusBreakdown[bs.etat] = (statusBreakdown[bs.etat] || 0) + 1;
        });
        Object.entries(statusBreakdown).forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}`);
        });

        console.log('📋 Sample BS:');
        assignedBS.slice(0, 3).forEach(bs => {
          console.log(`  • ${bs.numBs} - ${bs.nomAssure} (${bs.etat}) - ${bs.totalPec} DT`);
        });
      }

      // Check assignment history
      const assignmentHistory = await prisma.documentAssignmentHistory.findMany({
        where: { assignedToUserId: gestionnaire.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          document: { select: { name: true } },
          assignedBy: { select: { fullName: true } }
        }
      });

      console.log(`📜 Recent assignment history: ${assignmentHistory.length} entries`);
      assignmentHistory.forEach(h => {
        console.log(`  • ${h.document.name} - ${h.action} by ${h.assignedBy?.fullName} (${new Date(h.createdAt).toLocaleDateString()})`);
      });

      console.log('\n');
    }

    // Check unassigned items that could be assigned to gestionnaires
    console.log('🔍 Checking unassigned items...');
    console.log('==================================================');

    const unassignedBordereaux = await prisma.bordereau.count({
      where: { 
        assignedToUserId: null,
        archived: false,
        statut: { in: ['SCANNE', 'A_AFFECTER', 'ASSIGNE'] }
      }
    });

    const unassignedDocuments = await prisma.document.count({
      where: { 
        assignedToUserId: null,
        bordereau: { archived: false }
      }
    });

    console.log(`📄 Unassigned bordereaux: ${unassignedBordereaux}`);
    console.log(`📑 Unassigned documents: ${unassignedDocuments}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('==================================================');
    console.log(`Total Gestionnaire users: ${gestionnaires.length}`);
    console.log(`Active Gestionnaire users: ${gestionnaires.filter(g => g.active).length}`);
    
    const totalAssignedBordereaux = await prisma.bordereau.count({
      where: { 
        OR: [
          { assignedToUserId: { in: gestionnaires.map(g => g.id) } },
          { currentHandlerId: { in: gestionnaires.map(g => g.id) } }
        ]
      }
    });

    const totalAssignedDocuments = await prisma.document.count({
      where: { assignedToUserId: { in: gestionnaires.map(g => g.id) } }
    });

    console.log(`Total bordereaux assigned to gestionnaires: ${totalAssignedBordereaux}`);
    console.log(`Total documents assigned to gestionnaires: ${totalAssignedDocuments}`);
    console.log(`Unassigned bordereaux available: ${unassignedBordereaux}`);
    console.log(`Unassigned documents available: ${unassignedDocuments}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaireAssignments();