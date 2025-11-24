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
exports.undoMigrations = exports.runMigrations = void 0;
const database_1 = __importDefault(require("../config/database"));
const createUsers = __importStar(require("../migrations/20240101000001-create-users"));
const createStudentProfiles = __importStar(require("../migrations/20240101000002-create-student-profiles"));
const createFacultyProfiles = __importStar(require("../migrations/20240101000003-create-faculty-profiles"));
const createBatches = __importStar(require("../migrations/20240101000004-create-batches"));
const createEnrollments = __importStar(require("../migrations/20240101000005-create-enrollments"));
const createSessions = __importStar(require("../migrations/20240101000006-create-sessions"));
const createAttendances = __importStar(require("../migrations/20240101000007-create-attendances"));
const createPaymentTransactions = __importStar(require("../migrations/20240101000008-create-payment-transactions"));
const createPortfolios = __importStar(require("../migrations/20240101000009-create-portfolios"));
const createChangeRequests = __importStar(require("../migrations/20240101000010-create-change-requests"));
const createEmployeePunches = __importStar(require("../migrations/20240101000011-create-employee-punches"));
const createEmployeeProfiles = __importStar(require("../migrations/20240101000012-create-employee-profiles"));
const fixForeignKeyConstraints = __importStar(require("../migrations/20240101000016-fix-foreign-key-constraints"));
const updateEmployeePunches = __importStar(require("../migrations/20240101000018-update-employee-punches"));
const createBatchFacultyAssignments = __importStar(require("../migrations/20240101000019-create-batch-faculty-assignments"));
const migrations = [
    createUsers,
    createStudentProfiles,
    createFacultyProfiles,
    createBatches,
    createEnrollments,
    createSessions,
    createAttendances,
    createPaymentTransactions,
    createPortfolios,
    createChangeRequests,
    createEmployeePunches,
    createEmployeeProfiles,
    fixForeignKeyConstraints,
    updateEmployeePunches,
    createBatchFacultyAssignments,
];
const runMigrations = async () => {
    const queryInterface = database_1.default.getQueryInterface();
    try {
        for (const migration of migrations) {
            await migration.default.up(queryInterface);
        }
        console.log('All migrations completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};
exports.runMigrations = runMigrations;
const undoMigrations = async () => {
    const queryInterface = database_1.default.getQueryInterface();
    try {
        for (const migration of [...migrations].reverse()) {
            await migration.default.down(queryInterface);
        }
        console.log('All migrations undone successfully.');
    }
    catch (error) {
        console.error('Migration undo failed:', error);
        throw error;
    }
};
exports.undoMigrations = undoMigrations;
//# sourceMappingURL=migrate.js.map