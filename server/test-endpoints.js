const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('Testing endpoints...\n');

  // Test 1: Direct Express route
  try {
    console.log('1. Testing POST /api/test-direct');
    const response1 = await axios.post(`${BASE_URL}/api/test-direct`, {
      message: 'Test direct route',
      page: 'test'
    });
    console.log('✅ SUCCESS:', response1.data);
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data || error.message);
  }

  // Test 2: Simple feedback controller
  try {
    console.log('\n2. Testing POST /api/simple-feedback');
    const response2 = await axios.post(`${BASE_URL}/api/simple-feedback`, {
      message: 'Test simple feedback',
      page: 'test'
    });
    console.log('✅ SUCCESS:', response2.data);
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data || error.message);
  }

  // Test 3: App controller feedback
  try {
    console.log('\n3. Testing POST /api/feedback');
    const response3 = await axios.post(`${BASE_URL}/api/feedback`, {
      message: 'Test app feedback',
      page: 'test'
    });
    console.log('✅ SUCCESS:', response3.data);
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data || error.message);
  }

  // Test 4: Dashboard feedback
  try {
    console.log('\n4. Testing POST /api/dashboard/feedback');
    const response4 = await axios.post(`${BASE_URL}/api/dashboard/feedback`, {
      message: 'Test dashboard feedback',
      page: 'test'
    });
    console.log('✅ SUCCESS:', response4.data);
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data || error.message);
  }
}

testEndpoints();