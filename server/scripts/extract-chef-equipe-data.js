const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function extractChefEquipeData() {
  console.log('🔍 EXTRACTING CHEF D\'ÉQUIPE DATA FOR COMPARISON\n');

  try {
    // 1. Get all Chef d'Équipes
    const chefEquipes = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      select: { id: true, fullName: true, department: true }
    });

    console.log('👥 CHEF D\'ÉQUIPES FOUND:');
    console.log('========================');
    chefEquipes.forEach((chef, index) => {
      console.log(`${index + 1}. ${chef.fullName} (ID: ${chef.id}) - Dept: ${chef.department}`);
    });
    console.log('');

    // 2. Extract data for each Chef d'Équipe
    const allChefData = [];
    
    for (const chef of chefEquipes) {
      console.log(`📊 DATA FOR ${chef.fullName.toUpperCase()}:`);
      console.log('='.repeat(50));

      // Get documents for this chef's team
      const teamDocuments = await prisma.document.findMany({
        where: {
          bordereau: { 
            archived: false,
            OR: [
              { assignedToUserId: chef.id },
              { contract: { teamLeaderId: chef.id } }
            ]
          }
        },
        include: {
          bordereau: { include: { client: true } },
          assignedTo: { select: { fullName: true } }
        }
      });

      // Calculate stats like chef équipe dashboard
      const prestationDocs = teamDocuments.filter(d => d.type === 'BULLETIN_SOIN');
      const adhesionDocs = teamDocuments.filter(d => d.type === 'ADHESION');
      const complementDocs = teamDocuments.filter(d => d.type === 'COMPLEMENT_INFORMATION');
      
      // Client breakdown
      const clientBreakdown = {};
      prestationDocs.forEach(doc => {
        const client = doc.bordereau?.client?.name || 'Inconnu';
        clientBreakdown[client] = (clientBreakdown[client] || 0) + 1;
      });

      // Gestionnaire breakdown
      const gestionnaireBreakdown = {};
      prestationDocs.forEach(doc => {
        const gest = doc.assignedTo?.fullName || 'Non assigné';
        gestionnaireBreakdown[gest] = (gestionnaireBreakdown[gest] || 0) + 1;
      });

      const chefData = {
        chefName: chef.fullName,
        chefId: chef.id,
        totalDocuments: teamDocuments.length,
        prestations: {
          total: prestationDocs.length,
          clientBreakdown,
          gestionnaireBreakdown
        },
        adhesions: adhesionDocs.length,
        complements: complementDocs.length,
        rawDocuments: teamDocuments.map(d => ({
          id: d.id,
          reference: d.name,
          client: d.bordereau?.client?.name,
          type: d.type,
          status: d.status,
          gestionnaire: d.assignedTo?.fullName
        }))
      };

      allChefData.push(chefData);

      console.log(`Total Documents: ${chefData.totalDocuments}`);
      console.log(`Prestations: ${chefData.prestations.total}`);
      console.log(`  Par client:`, chefData.prestations.clientBreakdown);
      console.log(`  Par gestionnaire:`, chefData.prestations.gestionnaireBreakdown);
      console.log(`Adhésions: ${chefData.adhesions}`);
      console.log(`Compléments: ${chefData.complements}`);
      console.log('');
    }

    // 3. Calculate Super Admin totals (sum of all chef équipes)
    console.log('🎯 SUPER ADMIN EXPECTED TOTALS:');
    console.log('===============================');
    
    const superAdminTotals = {
      totalPrestations: allChefData.reduce((sum, chef) => sum + chef.prestations.total, 0),
      totalAdhesions: allChefData.reduce((sum, chef) => sum + chef.adhesions, 0),
      totalComplements: allChefData.reduce((sum, chef) => sum + chef.complements, 0),
      totalDocuments: allChefData.reduce((sum, chef) => sum + chef.totalDocuments, 0)
    };

    // Combined client breakdown
    const combinedClientBreakdown = {};
    allChefData.forEach(chef => {
      Object.entries(chef.prestations.clientBreakdown).forEach(([client, count]) => {
        combinedClientBreakdown[client] = (combinedClientBreakdown[client] || 0) + count;
      });
    });

    // Combined gestionnaire breakdown
    const combinedGestionnaireBreakdown = {};
    allChefData.forEach(chef => {
      Object.entries(chef.prestations.gestionnaireBreakdown).forEach(([gest, count]) => {
        combinedGestionnaireBreakdown[gest] = (combinedGestionnaireBreakdown[gest] || 0) + count;
      });
    });

    console.log(`Total Prestations: ${superAdminTotals.totalPrestations}`);
    console.log(`  Par client:`, combinedClientBreakdown);
    console.log(`  Par gestionnaire:`, combinedGestionnaireBreakdown);
    console.log(`Total Adhésions: ${superAdminTotals.totalAdhesions}`);
    console.log(`Total Compléments: ${superAdminTotals.totalComplements}`);
    console.log(`Total Documents: ${superAdminTotals.totalDocuments}`);
    console.log('');

    // 4. Get all documents for tables
    console.log('📋 TABLE DATA FOR SUPER ADMIN:');
    console.log('==============================');
    
    const allDocuments = [];
    allChefData.forEach(chef => {
      allDocuments.push(...chef.rawDocuments);
    });

    console.log(`Total documents in tables: ${allDocuments.length}`);
    console.log('Sample documents:');
    allDocuments.slice(0, 10).forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.reference} - ${doc.client} - ${doc.type} - ${doc.status} - ${doc.gestionnaire}`);
    });

    console.log('\n🔍 COMPARISON WITH CURRENT INTERFACE:');
    console.log('=====================================');
    console.log('Super Admin should show:');
    console.log(`- Prestation: ${superAdminTotals.totalPrestations}`);
    console.log(`- Client breakdown:`, JSON.stringify(combinedClientBreakdown, null, 2));
    console.log(`- Gestionnaire breakdown:`, JSON.stringify(combinedGestionnaireBreakdown, null, 2));
    console.log(`- Tables should contain ${allDocuments.length} documents total`);

  } catch (error) {
    console.error('❌ Error extracting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractChefEquipeData();