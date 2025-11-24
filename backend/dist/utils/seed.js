"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.undoSeeders = exports.runSeeders = void 0;
const database_1 = __importDefault(require("../config/database"));
const seedUsers = __importStar(require("../seeders/20240101000001-seed-users"));
const seedDemoData = __importStar(require("../seeders/20240101000002-seed-demo-data"));
const seeders = [
    seedUsers,
    seedDemoData,
];
const runSeeders = async () => {
    const queryInterface = database_1.default.getQueryInterface();
    try {
        for (const seeder of seeders) {
            await seeder.default.up(queryInterface);
        }
        console.log('All seeders completed successfully.');
    }
    catch (error) {
        console.error('Seeder failed:', error);
        throw error;
    }
};
exports.runSeeders = runSeeders;
const undoSeeders = async () => {
    const queryInterface = database_1.default.getQueryInterface();
    try {
        for (const seeder of [...seeders].reverse()) {
            await seeder.default.down(queryInterface);
        }
        console.log('All seeders undone successfully.');
    }
    catch (error) {
        console.error('Seeder undo failed:', error);
        throw error;
    }
};
exports.undoSeeders = undoSeeders;
//# sourceMappingURL=seed.js.map