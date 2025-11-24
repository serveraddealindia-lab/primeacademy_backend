"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrate_1 = require("../utils/migrate");
const database_1 = __importDefault(require("../config/database"));
const main = async () => {
    try {
        // Test database connection
        await database_1.default.authenticate();
        console.log('✓ Database connection established successfully.\n');
        // Run migrations
        await (0, migrate_1.runMigrations)();
        console.log('\n✓ All migrations completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('\n✗ Migration failed:', error);
        process.exit(1);
    }
    finally {
        await database_1.default.close();
    }
};
main();
//# sourceMappingURL=run-migrations.js.map