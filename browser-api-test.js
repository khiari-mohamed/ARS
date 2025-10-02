// Run this in browser console on the chef d'équipe dashboard page
// This will test all the API endpoints and show the data structure

async function testAllChefAPIs() {
  const token = localStorage.getItem('token');
  const baseURL = 'http://localhost:5000/api';
  
  const endpoints = [
    // Current working endpoints from ChefEquipeDashboard
    '/bordereaux/chef-equipe/dashboard-stats',
    '/bordereaux/chef-equipe/tableau-bord',
    '/bordereaux/chef-equipe/gestionnaire-assignments-dossiers',
    
    // ChefEquipeTableauBordNew endpoints
    '/bordereaux/chef-equipe/tableau-bord/stats',
    '/bordereaux/chef-equipe/tableau-bord/types-detail',
    '/bordereaux/chef-equipe/tableau-bord/derniers-dossiers',
    '/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours',
    
    // Workflow endpoints
    '/workflow/chef-equipe/dashboard-stats',
    '/workflow/chef-equipe/corbeille'
  ];

  console.log('🔍 Testing Chef d\'équipe Dashboard APIs...\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Data:`, data);
        
        // Analyze data structure
        if (data && typeof data === 'object') {
          console.log(`🔍 Keys:`, Object.keys(data));
          if (data.dossiers) console.log(`📄 Dossiers count:`, data.dossiers.length);
          if (data.assignedItems) console.log(`📋 Assigned items:`, data.assignedItems.length);
          if (data.prestation) console.log(`💊 Prestation total:`, data.prestation.total);
        }
      } else {
        console.log(`❌ Status: ${response.status}`);
        const errorData = await response.text();
        console.log(`💬 Error:`, errorData);
      }
      
      console.log('─'.repeat(80));
      
    } catch (error) {
      console.log(`❌ Network Error:`, error.message);
      console.log('─'.repeat(80));
    }
  }
  
  console.log('🏁 API Testing Complete!');
}

// Run the test
testAllChefAPIs();