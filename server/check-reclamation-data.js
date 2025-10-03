const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkReclamationData() {
  try {
    console.log('🔍 Checking Reclamation data structure...\n');
    
    // Get all reclamations with full data
    const reclamations = await prisma.reclamation.findMany({
      include: {
        client: true,
        assignedTo: true,
        createdBy: true,
        contract: true,
        bordereau: true,
        document: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`📊 Found ${reclamations.length} reclamations\n`);
    
    reclamations.forEach((rec, index) => {
      console.log(`--- RECLAMATION ${index + 1} ---`);
      console.log(`ID: ${rec.id}`);
      console.log(`Client ID: ${rec.clientId}`);
      console.log(`Client Name: ${rec.client?.name || 'NULL'}`);
      console.log(`Type: ${rec.type}`);
      console.log(`Typologie: ${rec.typologie || 'NULL'}`);
      console.log(`Bordereau ID: ${rec.bordereauId || 'NULL'}`);
      console.log(`Contract ID: ${rec.contractId || 'NULL'}`);
      console.log(`Conformite: ${rec.conformite || 'NULL'}`);
      console.log(`Severity: ${rec.severity}`);
      console.log(`Status: ${rec.status}`);
      console.log(`Description: ${rec.description.substring(0, 50)}...`);
      console.log(`Created At: ${rec.createdAt}`);
      console.log(`Updated At: ${rec.updatedAt}`);
      console.log(`Assigned To ID: ${rec.assignedToId || 'NULL'}`);
      console.log(`Assigned To Name: ${rec.assignedTo?.fullName || 'NULL'}`);
      console.log(`Created By ID: ${rec.createdById}`);
      console.log(`Created By Name: ${rec.createdBy?.fullName || 'NULL'}`);
      console.log(`Department: ${rec.department || 'NULL'}`);
      console.log(`Process ID: ${rec.processId || 'NULL'}`);
      console.log(`Evidence Path: ${rec.evidencePath || 'NULL'}`);
      console.log(`Priority: ${rec.priority}`);
      console.log(`Conformite Updated By: ${rec.conformiteUpdatedBy || 'NULL'}`);
      console.log(`Conformite Updated At: ${rec.conformiteUpdatedAt || 'NULL'}`);
      console.log('');
    });
    
    // Check the schema structure
    console.log('📋 Raw database fields for first reclamation:');
    if (reclamations.length > 0) {
      const firstRec = reclamations[0];
      console.log(JSON.stringify(firstRec, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error checking reclamation data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReclamationData();