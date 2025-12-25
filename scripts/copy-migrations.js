const fs = require('fs');
const path = require('path');

const srcMigrationsDir = path.join(__dirname, '../src/migrations');
const distMigrationsDir = path.join(__dirname, '../dist/migrations');

try {
  // Create dist/migrations directory if it doesn't exist
  if (!fs.existsSync(distMigrationsDir)) {
    fs.mkdirSync(distMigrationsDir, { recursive: true });
    console.log('Created dist/migrations directory');
  }

  // Check if src/migrations exists
  if (!fs.existsSync(srcMigrationsDir)) {
    console.log('Warning: src/migrations directory not found. Skipping migration copy.');
    process.exit(0);
  }

  // Copy all migration files (both .ts and .js)
  const files = fs.readdirSync(srcMigrationsDir);
  let copiedCount = 0;

  files.forEach((file) => {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const srcFile = path.join(srcMigrationsDir, file);
      const distFile = path.join(distMigrationsDir, file);
      try {
        fs.copyFileSync(srcFile, distFile);
        copiedCount++;
      } catch (err) {
        console.warn(`Warning: Could not copy ${file}:`, err.message);
      }
    }
  });

  // Also check if TypeScript compiler created .js files in dist/migrations
  // (This happens if migrations are included in tsconfig.json)
  const compiledJsFiles = files
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace('.ts', '.js'))
    .filter(f => {
      const compiledPath = path.join(distMigrationsDir, f);
      return fs.existsSync(compiledPath);
    });

  if (compiledJsFiles.length > 0) {
    console.log(`Found ${compiledJsFiles.length} compiled migration file(s) from TypeScript build`);
  }

  if (copiedCount > 0) {
    console.log(`Successfully copied ${copiedCount} migration file(s) to dist/migrations`);
  } else if (compiledJsFiles.length === 0) {
    console.log('No migration files found to copy (they may be compiled by TypeScript)');
  }
} catch (error) {
  console.error('Error copying migrations:', error.message);
  console.log('Server will attempt to load migrations from src/migrations if needed');
  // Don't exit with error - let the server handle it
  process.exit(0);
}

