// Quick compilation test
const { execSync } = require('child_process');

try {
  console.log('🔍 Testing TypeScript compilation...');
  execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}