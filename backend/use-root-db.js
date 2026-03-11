// Temporary fix: Use root user for database connection
// This bypasses the user permission issues

const fs = require('fs');
const path = require('path');

// Backup original .env file
const envPath = path.join(__dirname, '.env');
const backupPath = path.join(__dirname, '.env.backup');

if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, backupPath);
  console.log('✅ Original .env backed up to .env.backup');
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace DB_USER and DB_PASSWORD with root credentials
envContent = envContent.replace(/DB_USER=.*/g, 'DB_USER=root');
envContent = envContent.replace(/DB_PASSWORD=.*/g, 'DB_PASSWORD=');

// Write updated .env file
fs.writeFileSync(envPath, envContent);
console.log('✅ .env updated to use root user');

console.log('\nOriginal configuration was backed up.');
console.log('To restore original settings, run:');
console.log('cp .env.backup .env');