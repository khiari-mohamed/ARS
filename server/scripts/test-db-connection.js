const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_jdwnxUzXe02u@ep-damp-feather-a8qzvu4g-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => {
    console.log('✅ Connected to the database successfully!');
    return client.end();
  })
  .catch(err => {
    console.error('❌ Failed to connect to the database:');
    console.error(err);
    process.exit(1);
  });