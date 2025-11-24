"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const seed_1 = require("../utils/seed");
const database_1 = __importDefault(require("../config/database"));
const main = async () => {
    try {
        // Test database connection
        await database_1.default.authenticate();
        console.log('✓ Database connection established successfully.\n');
        // Run seeders
        await (0, seed_1.runSeeders)();
        console.log('\n✓ All seeders completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('\n✗ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await database_1.default.close();
    }
};
main();
//# sourceMappingURL=run-seeders.js.map