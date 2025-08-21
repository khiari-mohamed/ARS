const { Client } = require('pg');

async function testConnection() {
  const configs = [
    {
      host: 'localhost',
      port: 5432,
      database: 'ars_db',
      user: 'postgres',
      password: 'password'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'ars_db',
      user: 'postgres',
      password: ''
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'password'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: ''
    }
  ];

  for (const config of configs) {
    try {
      console.log(`Testing: ${config.user}@${config.host}:${config.port}/${config.database}`);
      const client = new Client(config);
      await client.connect();
      console.log('✅ Connection successful!');
      
      // Test if ars_db exists
      const result = await client.query("SELECT datname FROM pg_database WHERE datname = 'ars_db'");
      if (result.rows.length > 0) {
        console.log('✅ ars_db database exists');
      } else {
        console.log('❌ ars_db database does not exist');
      }
      
      await client.end();
      return config;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  return null;
}

testConnection().then(config => {
  if (config) {
    console.log('\n✅ Working configuration found:');
    console.log(`DATABASE_URL="postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}"`);
  } else {
    console.log('\n❌ No working configuration found');
  }
}).catch(console.error);