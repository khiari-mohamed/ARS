const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Local database credentials
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'ars_db',
  user: 'postgres',
  password: '23044943'
};

const backupDir = 'C:\\Users\\LENOVO\\Desktop\\table_backups';

async function restoreTables() {
  const client = new Client(LOCAL_CONFIG);
  
  try {
    console.log('=== Connecting to local database ===\n');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Get all SQL files
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    console.log(`Found ${files.length} backup files\n`);

    // Disable triggers and constraints temporarily
    await client.query('SET session_replication_role = replica;');

    for (const file of files) {
      const tableName = file.replace('.sql', '');
      const filePath = path.join(backupDir, file);
      
      try {
        console.log(`Restoring "${tableName}"...`);

        // Read SQL file
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        const statements = sqlContent.split('\n').filter(line => 
          line.trim() && !line.startsWith('--')
        );

        if (statements.length === 0) {
          console.log(`  ⊘ ${tableName} - no data\n`);
          continue;
        }

        // Clear existing data
        await client.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);

        // Execute inserts in batches
        let inserted = 0;
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
            inserted++;
          }
        }

        console.log(`  ✓ ${tableName} restored (${inserted} rows)\n`);

      } catch (err) {
        console.log(`  ✗ Failed to restore ${tableName}: ${err.message}\n`);
      }
    }

    // Re-enable triggers and constraints
    await client.query('SET session_replication_role = DEFAULT;');

    console.log(`\n=== Restore completed! ===`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

restoreTables();
