import { Sequelize } from 'sequelize';
import path from 'path';

// Load environment variables
require('dotenv').config();

// Determine environment
const env = process.env.NODE_ENV || 'development';

// Load database configuration from config.json
const configPath = path.resolve(__dirname, 'config.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(configPath)[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: console.log, // Set to false to disable SQL logging
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      // Use connection timeout
      connectTimeout: 60000,
    },
  }
);

export default sequelize;