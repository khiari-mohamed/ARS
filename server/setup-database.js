const { Client } = require('pg');

async function setupDatabase() {
  try {
    // First connect to postgres database to create ars_db
    console.log('Connecting to PostgreSQL...');
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '23044943'
    });
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Check if ars_db exists
    const result = await client.query("SELECT datname FROM pg_database WHERE datname = 'ars_db'");
    
    if (result.rows.length === 0) {
      console.log('Creating ars_db database...');
      await client.query('CREATE DATABASE ars_db');
      console.log('✅ ars_db database created');
    } else {
      console.log('✅ ars_db database already exists');
    }
    
    await client.end();
    
    // Now test connection to ars_db
    console.log('Testing connection to ars_db...');
    const arsClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'ars_db',
      user: 'postgres',
      password: '23044943'
    });
    
    await arsClient.connect();
    console.log('✅ Connected to ars_db successfully');
    await arsClient.end();
    
    console.log('\n✅ Database setup complete! You can now start the server.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
}

setupDatabase();