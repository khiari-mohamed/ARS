const bcrypt = require('bcrypt');

async function testPasswords() {
  const hash = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
  
  const commonPasswords = [
    'secret',
    'admin',
    'password',
    'test',
    '123456',
    'admin123',
    'password123',
    'secret123',
    'changeme',
    'default'
  ];
  
  console.log('🔍 Testing common passwords against AI service hash...');
  
  for (const password of commonPasswords) {
    try {
      const isMatch = await bcrypt.compare(password, hash);
      if (isMatch) {
        console.log(`✅ Found password: "${password}"`);
        return password;
      } else {
        console.log(`❌ Not: "${password}"`);
      }
    } catch (error) {
      console.log(`❌ Error testing "${password}":`, error.message);
    }
  }
  
  console.log('❌ No common password found');
  return null;
}

testPasswords().then(result => {
  if (result) {
    console.log(`\n🎉 AI Service Password: "${result}"`);
    console.log('Use this for admin and analyst users');
  } else {
    console.log('\n❌ Could not determine password');
  }
});