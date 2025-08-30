const { execSync } = require('child_process');

console.log('Installing PaperStream integration dependencies...');

try {
  // Install xml2js for XML parsing
  execSync('npm install xml2js @types/xml2js', { stdio: 'inherit' });
  
  // Install chokidar for advanced file watching (if not already installed)
  execSync('npm install chokidar @types/chokidar', { stdio: 'inherit' });
  
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}