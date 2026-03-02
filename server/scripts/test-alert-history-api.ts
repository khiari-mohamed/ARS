import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAlertHistoryAPI() {
  console.log('🔍 Testing Alert History API for Chef Mohamed Frad...\n');

  try {
    // Login as Mohamed Frad
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'mohamed.frad@ars.tn',
      password: 'azerty'
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Logged in as Mohamed Frad\n');

    // Get alert history
    const historyResponse = await axios.get(`${API_URL}/alerts/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const alerts = historyResponse.data;
    console.log(`📊 API returned ${alerts.length} alerts\n`);

    // Check if all alerts belong to Mohamed Frad
    let belongsToChef = 0;
    let notBelongsToChef = 0;

    alerts.forEach((alert: any, index: number) => {
      const teamLeaderId = alert.bordereau?.contract?.teamLeaderId;
      const belongs = teamLeaderId === '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
      
      if (belongs) {
        belongsToChef++;
      } else {
        notBelongsToChef++;
        console.log(`❌ Alert ${index + 1}: ${alert.bordereau?.reference || alert.id}`);
        console.log(`   Team Leader ID: ${teamLeaderId || 'N/A'}`);
        console.log(`   Message: ${alert.message.substring(0, 60)}...`);
        console.log('');
      }
    });

    console.log('\n📈 SUMMARY:');
    console.log(`✅ Alerts belonging to Mohamed Frad: ${belongsToChef}`);
    console.log(`❌ Alerts NOT belonging to Mohamed Frad: ${notBelongsToChef}`);
    console.log(`📊 Total: ${alerts.length}`);
    console.log(`🎯 Filter working correctly: ${notBelongsToChef === 0 ? 'YES ✅' : 'NO ❌'}`);

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAlertHistoryAPI();
