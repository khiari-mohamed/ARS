const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_FILE = 'C:\\Users\\LENOVO\\Desktop\\pgadmin_TEST_BACKUP_ARS_12344.backup';
const DB_NAME = 'ars_db';
const DB_USER = 'postgres';
const DB_HOST = 'localhost';
const DB_PORT = '5432';

// Common PostgreSQL installation paths
const PG_PATHS = [
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_restore.exe',
  'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_restore.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_restore.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_restore.exe',
];

// Find pg_restore
let PG_RESTORE = 'pg_restore'; // Default if in PATH
for (const pgPath of PG_PATHS) {
  if (fs.existsSync(pgPath)) {
    PG_RESTORE = `"${pgPath}"`;
    console.log(`✅ Found PostgreSQL at: ${pgPath}\n`);
    break;
  }
}

console.log('🔄 PostgreSQL Backup Restore Script');
console.log('='.repeat(80));
console.log(`📁 Backup File: ${BACKUP_FILE}`);
console.log(`🗄️  Database: ${DB_NAME}`);
console.log(`👤 User: ${DB_USER}`);
console.log('='.repeat(80));

// Check if backup file exists
if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`\n❌ ERROR: Backup file not found at: ${BACKUP_FILE}`);
  process.exit(1);
}

const fileSize = fs.statSync(BACKUP_FILE).size;
console.log(`\n✅ Backup file found (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

// Create log file
const logFile = path.join(__dirname, 'restore-log.txt');
console.log(`📝 Detailed logs will be saved to: ${logFile}\n`);

try {
  console.log('🚀 Starting restore process...\n');
  console.log('⏳ This may take a few minutes. Please wait...\n');

  // Build pg_restore command with verbose output
  const command = `${PG_RESTORE} -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -v --clean --if-exists "${BACKUP_FILE}" 2>&1`;
  
  console.log('📋 Command:', command.replace(/-v/, '-v (verbose)'));
  console.log('\n' + '='.repeat(80));
  console.log('RESTORE OUTPUT:');
  console.log('='.repeat(80) + '\n');

  // Execute restore with real-time output
  const output = execSync(command, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, PGPASSWORD: 'postgres' } // Set password via env
  });

  // Save full output to log file
  fs.writeFileSync(logFile, output);

  // Parse output for statistics
  const lines = output.split('\n');
  const stats = {
    totalTables: 0,
    successfulTables: 0,
    failedTables: 0,
    totalRows: 0,
    errors: [],
    warnings: [],
    tables: []
  };

  let currentTable = null;
  
  lines.forEach(line => {
    // Detect table processing
    if (line.includes('processing data for table')) {
      const match = line.match(/table "public\.(\w+)"/);
      if (match) {
        currentTable = match[1];
        stats.totalTables++;
        stats.tables.push(currentTable);
        console.log(`  📊 Processing table: ${currentTable}`);
      }
    }

    // Detect row counts
    if (line.includes('rows') && currentTable) {
      const match = line.match(/(\d+) rows/);
      if (match) {
        const rows = parseInt(match[1]);
        stats.totalRows += rows;
        console.log(`     ✅ Restored ${rows} rows`);
        stats.successfulTables++;
        currentTable = null;
      }
    }

    // Detect errors
    if (line.toLowerCase().includes('error:')) {
      stats.errors.push(line.trim());
      stats.failedTables++;
      console.log(`     ❌ Error: ${line.trim()}`);
    }

    // Detect warnings
    if (line.toLowerCase().includes('warning:')) {
      stats.warnings.push(line.trim());
      console.log(`     ⚠️  Warning: ${line.trim()}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESTORE STATISTICS:');
  console.log('='.repeat(80));
  console.log(`✅ Total Tables Processed: ${stats.totalTables}`);
  console.log(`✅ Successful Tables: ${stats.successfulTables}`);
  console.log(`❌ Failed Tables: ${stats.failedTables}`);
  console.log(`📈 Total Rows Restored: ${stats.totalRows.toLocaleString()}`);
  console.log(`⚠️  Warnings: ${stats.warnings.length}`);
  console.log(`❌ Errors: ${stats.errors.length}`);

  if (stats.totalTables > 0) {
    const successRate = ((stats.successfulTables / stats.totalTables) * 100).toFixed(2);
    console.log(`\n📊 Success Rate: ${successRate}%`);
  }

  if (stats.tables.length > 0) {
    console.log('\n📋 Tables Restored:');
    stats.tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });
  }

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors (see log file)`);
    }
  }

  if (stats.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    stats.warnings.slice(0, 5).forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    if (stats.warnings.length > 5) {
      console.log(`   ... and ${stats.warnings.length - 5} more warnings (see log file)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ RESTORE COMPLETED!');
  console.log('='.repeat(80));
  console.log(`\n📝 Full log saved to: ${logFile}`);
  console.log('\n💡 Next step: Run "node verify-data.js" to verify the restored data\n');

} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('❌ RESTORE FAILED!');
  console.error('='.repeat(80));
  console.error('\nError details:');
  console.error(error.message);
  
  if (error.stdout) {
    console.error('\nOutput:');
    console.error(error.stdout.toString());
    fs.writeFileSync(logFile, error.stdout.toString());
  }
  
  if (error.stderr) {
    console.error('\nError output:');
    console.error(error.stderr.toString());
    fs.appendFileSync(logFile, '\n\nERROR OUTPUT:\n' + error.stderr.toString());
  }

  console.error(`\n📝 Error log saved to: ${logFile}`);
  console.error('\n💡 Common issues:');
  console.error('   1. PostgreSQL password incorrect (default: postgres)');
  console.error('   2. Database connection refused (check if PostgreSQL is running)');
  console.error('   3. Permission denied (run as administrator)');
  console.error('   4. Backup file corrupted or incompatible\n');
  
  process.exit(1);
}
