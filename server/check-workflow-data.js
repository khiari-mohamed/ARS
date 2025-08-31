const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWorkflowData() {
  try {
    console.log('🔍 Checking Workflow Data in Database...\n');

    // Check Documents by status for workflow eligibility
    const documentsByStatus = await prisma.document.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    console.log('📊 Documents by Status:');
    documentsByStatus.forEach(group => {
      console.log(`  - ${group.status || 'NULL'}: ${group._count.id}`);
    });

    // Check documents that should appear in workflow tasks (EN_COURS status)
    const workflowDocuments = await prisma.document.findMany({
      where: {
        status: 'EN_COURS'
      },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        bordereau: {
          select: {
            reference: true,
            client: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    console.log(`\n🔄 Documents in Workflow (EN_COURS): ${workflowDocuments.length}`);
    
    if (workflowDocuments.length > 0) {
      console.log('\nWorkflow Documents:');
      workflowDocuments.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name}`);
        console.log(`     - ID: ${doc.id}`);
        console.log(`     - Type: ${doc.type}`);
        console.log(`     - Status: ${doc.status}`);
        console.log(`     - Uploaded by: ${doc.uploader.fullName} (${doc.uploader.role})`);
        console.log(`     - Client: ${doc.bordereau?.client?.name || 'No client'}`);
        console.log(`     - Uploaded at: ${doc.uploadedAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️ No documents with EN_COURS status found!');
      console.log('\n💡 To see workflow tasks, you need documents with EN_COURS status.');
      console.log('You can:');
      console.log('1. Start a workflow on an UPLOADED document (changes status to EN_COURS)');
      console.log('2. Or manually update document status to EN_COURS in database');
    }

    // Check audit logs for workflow activities
    const workflowLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['START_WORKFLOW', 'COMPLETE_WORKFLOW_STEP']
        }
      },
      include: {
        user: {
          select: {
            fullName: true,
            role: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    console.log(`\n📋 Workflow Audit Logs: ${workflowLogs.length}`);
    
    if (workflowLogs.length > 0) {
      console.log('\nRecent Workflow Activities:');
      workflowLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.action}`);
        console.log(`     - User: ${log.user.fullName} (${log.user.role})`);
        console.log(`     - Time: ${log.timestamp.toISOString()}`);
        console.log(`     - Details: ${JSON.stringify(log.details)}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️ No workflow activities found in audit logs!');
      console.log('This means no workflows have been started or completed yet.');
    }

    // Check users who can access workflows
    const workflowUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'GESTIONNAIRE' },
          { role: 'CHEF_EQUIPE' },
          { role: 'SUPER_ADMIN' },
          { role: 'ADMINISTRATEUR' }
        ],
        active: true
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        active: true
      }
    });

    console.log(`\n👥 Users who can access Workflows: ${workflowUsers.length}`);
    workflowUsers.forEach(user => {
      console.log(`  - ${user.fullName} (${user.role}) - ${user.active ? 'Active' : 'Inactive'}`);
    });

    // Summary and recommendations
    console.log('\n📝 Summary:');
    console.log(`  - Total Documents: ${documentsByStatus.reduce((sum, group) => sum + group._count.id, 0)}`);
    console.log(`  - Documents in Workflow: ${workflowDocuments.length}`);
    console.log(`  - Workflow Activities: ${workflowLogs.length}`);
    console.log(`  - Workflow Users: ${workflowUsers.length}`);

    if (workflowDocuments.length === 0) {
      console.log('\n🎯 To test workflows:');
      console.log('1. Go to GED > Workflows tab');
      console.log('2. Click "Démarrer" on a workflow');
      console.log('3. Select an UPLOADED document');
      console.log('4. Start the workflow (document status changes to EN_COURS)');
      console.log('5. The document will then appear in "Mes Tâches en Attente"');
    }

  } catch (error) {
    console.error('❌ Error checking workflow data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkWorkflowData();