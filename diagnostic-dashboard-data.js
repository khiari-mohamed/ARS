const fs = require('fs');
const path = require('path');

// Mock database queries - replace with actual database connections
const getDashboardData = async (userRole, userId = null) => {
  console.log(`\n=== DIAGNOSTIC: ${userRole.toUpperCase()} DASHBOARD ===`);
  
  // Simulate database queries for each role
  const queries = {
    superAdmin: {
      prestations: `SELECT COUNT(*) as total FROM dossiers WHERE type = 'Prestation'`,
      prestationsByClient: `SELECT client_name, COUNT(*) as count FROM dossiers WHERE type = 'Prestation' GROUP BY client_name`,
      prestationsByGestionnaire: `SELECT gestionnaire, COUNT(*) as count FROM dossiers WHERE type = 'Prestation' GROUP BY gestionnaire`,
      allDossiers: `SELECT * FROM dossiers WHERE type = 'Prestation'`,
      bordereaux: `SELECT * FROM bordereaux`,
      bulletinsSoins: `SELECT * FROM bulletins_soins`
    },
    
    chefEquipe: {
      prestations: `SELECT COUNT(*) as total FROM dossiers d 
                   JOIN users u ON d.gestionnaire = u.username 
                   WHERE d.type = 'Prestation' AND u.chef_equipe_id = ?`,
      prestationsByClient: `SELECT client_name, COUNT(*) as count FROM dossiers d 
                           JOIN users u ON d.gestionnaire = u.username 
                           WHERE d.type = 'Prestation' AND u.chef_equipe_id = ? 
                           GROUP BY client_name`,
      prestationsByGestionnaire: `SELECT gestionnaire, COUNT(*) as count FROM dossiers d 
                                 JOIN users u ON d.gestionnaire = u.username 
                                 WHERE d.type = 'Prestation' AND u.chef_equipe_id = ? 
                                 GROUP BY gestionnaire`,
      teamDossiers: `SELECT * FROM dossiers d 
                    JOIN users u ON d.gestionnaire = u.username 
                    WHERE u.chef_equipe_id = ?`
    },
    
    responsable: {
      prestations: `SELECT COUNT(*) as total FROM dossiers d 
                   JOIN users u ON d.gestionnaire = u.username 
                   WHERE d.type = 'Prestation' AND u.departement_id = ?`,
      prestationsByClient: `SELECT client_name, COUNT(*) as count FROM dossiers d 
                           JOIN users u ON d.gestionnaire = u.username 
                           WHERE d.type = 'Prestation' AND u.departement_id = ? 
                           GROUP BY client_name`,
      prestationsByGestionnaire: `SELECT gestionnaire, COUNT(*) as count FROM dossiers d 
                                 JOIN users u ON d.gestionnaire = u.username 
                                 WHERE d.type = 'Prestation' AND u.departement_id = ? 
                                 GROUP BY gestionnaire`
    }
  };

  // Mock data based on the interface screenshots
  const mockData = {
    superAdmin: {
      totalPrestations: 14, // Should be 14 but showing wrong
      prestationsByClient: {
        'ARS Client Tunisie': 12,
        'samir': 2
      },
      prestationsByGestionnaire: {
        'Non assigné': 7,
        'gestion': 7
      },
      rawDossiers: [
        { id: 1, type: 'Prestation', client_name: 'ARS Client Tunisie', gestionnaire: 'gestion', statut: 'Nouveau' },
        { id: 2, type: 'Prestation', client_name: 'ARS Client Tunisie', gestionnaire: 'gestion', statut: 'Traité' },
        // ... more dossiers
      ]
    },
    
    chefEquipe: {
      totalPrestations: 12, // Correct calculation
      prestationsByClient: {
        'ARS Client Tunisie': 12
      },
      prestationsByGestionnaire: {
        'Non assigné': 5,
        'gestion': 7
      },
      rawDossiers: [
        { id: 1, type: 'Prestation', client_name: 'ARS Client Tunisie', gestionnaire: 'gestion', statut: 'Nouveau' },
        // ... team specific dossiers
      ]
    }
  };

  return mockData[userRole] || {};
};

const compareDashboardCalculations = async () => {
  console.log('🔍 DASHBOARD DATA COMPARISON DIAGNOSTIC\n');
  
  // Get data for each role
  const superAdminData = await getDashboardData('superAdmin');
  const chefEquipeData = await getDashboardData('chefEquipe', 'chef1');
  const responsableData = await getDashboardData('responsable', 'resp1');
  
  // Compare calculations
  console.log('📊 PRESTATION TOTALS COMPARISON:');
  console.log(`Super Admin: ${superAdminData.totalPrestations || 'UNDEFINED'}`);
  console.log(`Chef Équipe: ${chefEquipeData.totalPrestations || 'UNDEFINED'}`);
  console.log(`Responsable: ${responsableData.totalPrestations || 'UNDEFINED'}`);
  
  console.log('\n👥 BY CLIENT COMPARISON:');
  console.log('Super Admin:', superAdminData.prestationsByClient);
  console.log('Chef Équipe:', chefEquipeData.prestationsByClient);
  
  console.log('\n🧑‍💼 BY GESTIONNAIRE COMPARISON:');
  console.log('Super Admin:', superAdminData.prestationsByGestionnaire);
  console.log('Chef Équipe:', chefEquipeData.prestationsByGestionnaire);
  
  // Identify discrepancies
  console.log('\n🚨 IDENTIFIED ISSUES:');
  
  if (superAdminData.totalPrestations !== chefEquipeData.totalPrestations) {
    console.log('❌ MISMATCH: Super Admin and Chef Équipe totals differ');
    console.log(`   Super Admin: ${superAdminData.totalPrestations}`);
    console.log(`   Chef Équipe: ${chefEquipeData.totalPrestations}`);
  }
  
  // Check if Super Admin is filtering data incorrectly
  const superAdminTotal = Object.values(superAdminData.prestationsByGestionnaire || {}).reduce((a, b) => a + b, 0);
  console.log(`\n🧮 CALCULATION CHECK:`);
  console.log(`Super Admin - Sum by gestionnaire: ${superAdminTotal}`);
  console.log(`Super Admin - Reported total: ${superAdminData.totalPrestations}`);
  
  if (superAdminTotal !== superAdminData.totalPrestations) {
    console.log('❌ INTERNAL INCONSISTENCY: Super Admin totals don\'t match');
  }
  
  return {
    superAdminData,
    chefEquipeData,
    responsableData,
    discrepancies: {
      totalMismatch: superAdminData.totalPrestations !== chefEquipeData.totalPrestations,
      internalInconsistency: superAdminTotal !== superAdminData.totalPrestations
    }
  };
};

// Simulate actual database queries to identify the issue
const debugActualQueries = () => {
  console.log('\n🔧 DEBUGGING ACTUAL QUERIES:\n');
  
  console.log('SUPER ADMIN QUERY (likely incorrect):');
  console.log(`SELECT COUNT(*) FROM dossiers WHERE type = 'Prestation'`);
  console.log('↳ This might be counting ALL prestations globally\n');
  
  console.log('CHEF ÉQUIPE QUERY (correct):');
  console.log(`SELECT COUNT(*) FROM dossiers d 
JOIN users u ON d.gestionnaire = u.username 
WHERE d.type = 'Prestation' AND u.chef_equipe_id = ?`);
  console.log('↳ This correctly filters by team\n');
  
  console.log('POSSIBLE ISSUES:');
  console.log('1. Super Admin query missing team/department filter');
  console.log('2. Different data sources being used');
  console.log('3. Caching issues between different views');
  console.log('4. Role-based filtering not applied correctly');
  
  console.log('\n💡 RECOMMENDED FIXES:');
  console.log('1. Check dashboard controller logic for Super Admin');
  console.log('2. Ensure consistent data filtering across all roles');
  console.log('3. Verify database query parameters');
  console.log('4. Add logging to track actual query results');
};

// Main diagnostic function
const runDiagnostic = async () => {
  try {
    const results = await compareDashboardCalculations();
    debugActualQueries();
    
    // Save diagnostic results
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      results,
      recommendations: [
        'Check SuperAdminDashboard.js for incorrect query logic',
        'Verify role-based filtering in dashboard controllers',
        'Ensure consistent data source across all dashboard views',
        'Add query logging to identify actual SQL being executed'
      ]
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'diagnostic-report.json'), 
      JSON.stringify(diagnosticReport, null, 2)
    );
    
    console.log('\n📄 Diagnostic report saved to diagnostic-report.json');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
};

// Run the diagnostic
runDiagnostic();

module.exports = {
  getDashboardData,
  compareDashboardCalculations,
  debugActualQueries
};