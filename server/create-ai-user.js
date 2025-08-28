const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function createAIUser() {
  try {
    console.log('🔍 Creating AI service user...');
    
    // Try to create a user first (if the service supports it)
    const createEndpoints = ['/register', '/users', '/create-user', '/signup'];
    
    for (const endpoint of createEndpoints) {
      try {
        console.log(`🔄 Trying to create user at ${endpoint}...`);
        const response = await axios.post(`${AI_MICROSERVICE_URL}${endpoint}`, {
          username: 'ars-backend',
          password: 'ars-backend-2025',
          email: 'backend@ars.com'
        });
        console.log(`✅ User created at ${endpoint}:`, response.data);
        
        // Now try to get token
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', 'ars-backend');
        formData.append('password', 'ars-backend-2025');
        
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log('✅ Token obtained:', tokenResponse.data);
        return { username: 'ars-backend', password: 'ars-backend-2025' };
        
      } catch (e) {
        console.log(`❌ ${endpoint} failed:`, e.response?.status);
      }
    }
    
    // If no create endpoint works, try default credentials that might exist
    const defaultCredentials = [
      { username: 'admin', password: 'admin' },
      { username: 'test', password: 'test123' },
      { username: 'user', password: 'user123' },
      { username: 'demo', password: 'demo123' },
      { username: 'ars', password: 'ars2025' }
    ];
    
    console.log('🔄 Trying default credentials...');
    for (const cred of defaultCredentials) {
      try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', cred.username);
        formData.append('password', cred.password);
        
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log(`✅ Working credentials found: ${cred.username}:${cred.password}`);
        console.log('Token:', tokenResponse.data);
        return cred;
        
      } catch (e) {
        console.log(`❌ ${cred.username}:${cred.password} failed`);
      }
    }
    
    console.log('❌ No working credentials found');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

createAIUser().then(result => {
  if (result) {
    console.log('\n🎉 SUCCESS! Use these credentials:');
    console.log(`Username: ${result.username}`);
    console.log(`Password: ${result.password}`);
  } else {
    console.log('\n❌ Could not find or create working credentials');
    console.log('💡 Check the AI service documentation or configuration');
  }
});