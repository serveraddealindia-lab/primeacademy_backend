import { SequelizeStorage, Umzug } from 'umzug';
import * as path from 'path';
import * as fs from 'fs';
import sequelize from '../config/database';
import { logger } from './logger';

// __dirname is available in CommonJS

const resolveMigrationsPath = (): { path: string; usesTsFiles: boolean } => {
  // First, try dist/migrations (production build) - look for .js files
  const distPath = path.join(__dirname, '../migrations');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    const hasJsFiles = files.some(f => f.endsWith('.js'));
    const hasTsFiles = files.some(f => f.endsWith('.ts'));
    
    // Prefer .js files in production (compiled)
    if (hasJsFiles) {
      return { path: distPath, usesTsFiles: false };
    }
    // Fallback to .ts if .js not available (development scenario)
    if (hasTsFiles) {
      return { path: distPath, usesTsFiles: true };
    }
  }

  // Fallback to src/migrations (development or if dist doesn't exist)
  const srcPath = path.join(__dirname, '../../src/migrations');
  if (fs.existsSync(srcPath)) {
    return { path: srcPath, usesTsFiles: true };
  }

  // If neither exists, that's OK - migrations might not be needed
  throw new Error('Migrations directory not found in dist or src');
};

export const runPendingMigrations = async () => {
  let migrationsInfo: { path: string; usesTsFiles: boolean };

  try {
    migrationsInfo = resolveMigrationsPath();
  } catch (error) {
    logger.warn(`Skipping migrations: ${(error as Error).message}`);
    logger.warn('Server will continue without running migrations. This is OK if database is already set up.');
    return;
  }

  const { path: migrationsPath, usesTsFiles } = migrationsInfo;
  const globPattern = usesTsFiles ? '*.ts' : '*.js';

  logger.info(`Running migrations from ${migrationsPath} (pattern: ${globPattern})`);

  const migrator = new Umzug({
    migrations: {
      glob: [globPattern, { cwd: migrationsPath }],
      resolve: ({ name, path: migrationPath, context }) => {
        // Handle both CommonJS and ES6 module formats
        if (!migrationPath) {
          throw new Error(`Migration path is undefined for ${name}`);
        }
        const migration = require(migrationPath);
        // If it's a default export (ES6), use .default, otherwise use the module directly
        const migrationModule = migration.default || migration;
        if (!migrationModule || typeof migrationModule.up !== 'function') {
          throw new Error(`Migration ${name} does not have a valid 'up' function`);
        }
        return {
          name,
          up: async () => migrationModule.up(context),
          down: async () => migrationModule.down ? migrationModule.down(context) : Promise.resolve(),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    const pendingMigrations = await migrator.pending();
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations. Database is up to date.');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migration(s)`);
    await migrator.up();
    logger.info('Migrations completed successfully');
  } catch (error: any) {
    // Handle common migration errors gracefully
    const errorMessage = error?.message || String(error);
    const errorCode = error?.parent?.code || error?.code;
    
    // Check for common non-critical errors
    const isNonCriticalError = 
      errorMessage.includes('already exists') ||
      errorMessage.includes('Duplicate column name') ||
      errorMessage.includes('Duplicate key name') ||
      errorMessage.includes('Table') && errorMessage.includes('already exists') ||
      errorCode === 'ER_DUP_FIELDNAME' ||
      errorCode === 'ER_DUP_KEYNAME' ||
      errorCode === '42P07' || // PostgreSQL: relation already exists
      errorCode === '42P16';    // PostgreSQL: invalid table definition

    if (isNonCriticalError) {
      logger.warn(`Migration warning (non-critical): ${errorMessage}`);
      logger.warn('This usually means the migration was already applied. Continuing server startup...');
      return; // Don't crash the server
    }

    // For other errors, log but don't crash in production
    if (process.env.NODE_ENV === 'production') {
      logger.error('Migration error occurred:', errorMessage);
      logger.error('Server will continue to start, but some database changes may not be applied.');
      logger.error('Please check migration logs and fix manually if needed.');
      return; // Continue server startup even with migration errors in production
    }

    // In development, throw the error for debugging
    logger.error('Migration error:', error);
    throw error;
  }
};

