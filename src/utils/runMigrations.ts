import { SequelizeStorage, Umzug } from 'umzug';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sequelize from '../config/database';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

