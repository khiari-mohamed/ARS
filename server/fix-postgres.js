const { Client } = require('pg');

async function tryCommonPasswords() {
  const commonPasswords = [
    'admin',
    'root', 
    'postgres',
    '123456',
    'password123',
    'admin123',
    'root123',
    '1234',
    'qwerty',
    'letmein'
  ];

  for (const password of commonPasswords) {
    try {
      console.log(`Trying password: ${password}`);
      const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: password
      });
      
      await client.connect();
      console.log(`✅ SUCCESS! Password is: ${password}`);
      
      // Create ars_db if it doesn't exist
      try {
        await client.query('CREATE DATABASE ars_db');
        console.log('✅ Created ars_db database');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ ars_db database already exists');
        } else {
          console.log('❌ Failed to create ars_db:', error.message);
        }
      }
      
      await client.end();
      return password;
    } catch (error) {
      console.log(`❌ Failed with password ${password}`);
    }
  }
  
  return null;
}

tryCommonPasswords().then(password => {
  if (password) {
    console.log(`\n✅ Update your .env file with:`);
    console.log(`DATABASE_URL="postgresql://postgres:${password}@localhost:5432/ars_db"`);
  } else {
    console.log('\n❌ Could not find correct password. You may need to:');
    console.log('1. Reset PostgreSQL password using pgAdmin');
    console.log('2. Or reinstall PostgreSQL');
    console.log('3. Or check Windows services for the correct user');
  }
}).catch(console.error);