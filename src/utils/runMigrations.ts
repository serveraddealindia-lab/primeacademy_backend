import { SequelizeStorage, Umzug } from 'umzug';
import path from 'path';
import fs from 'fs';
import sequelize from '../config/database';
import { logger } from './logger';

// __dirname is available in CommonJS

const resolveMigrationsPath = (): { path: string; usesTsFiles: boolean } => {
  const distPath = path.join(__dirname, '../migrations');
  if (fs.existsSync(distPath)) {
    return { path: distPath, usesTsFiles: false };
  }

  const srcPath = path.join(__dirname, '../../src/migrations');
  if (fs.existsSync(srcPath)) {
    return { path: srcPath, usesTsFiles: true };
  }

  throw new Error('Migrations directory not found in dist or src');
};

export const runPendingMigrations = async () => {
  let migrationsInfo: { path: string; usesTsFiles: boolean };

  try {
    migrationsInfo = resolveMigrationsPath();
  } catch (error) {
    logger.warn(`Skipping migrations: ${(error as Error).message}`);
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
    await migrator.up();
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
};

