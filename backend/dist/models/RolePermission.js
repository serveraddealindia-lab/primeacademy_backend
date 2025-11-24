"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var Module;
(function (Module) {
    Module["BATCHES"] = "batches";
    Module["STUDENTS"] = "students";
    Module["FACULTY"] = "faculty";
    Module["EMPLOYEES"] = "employees";
    Module["SESSIONS"] = "sessions";
    Module["ATTENDANCE"] = "attendance";
    Module["PAYMENTS"] = "payments";
    Module["PORTFOLIOS"] = "portfolios";
    Module["REPORTS"] = "reports";
    Module["APPROVALS"] = "approvals";
    Module["USERS"] = "users";
    Module["SOFTWARE_COMPLETIONS"] = "software_completions";
    Module["STUDENT_LEAVES"] = "student_leaves";
    Module["BATCH_EXTENSIONS"] = "batch_extensions";
    Module["EMPLOYEE_LEAVES"] = "employee_leaves";
    Module["FACULTY_LEAVES"] = "faculty_leaves";
})(Module || (exports.Module = Module = {}));
class RolePermission extends sequelize_1.Model {
}
RolePermission.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    roleId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'roles',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    module: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(Module)),
        allowNull: false,
    },
    canView: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    canAdd: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    canEdit: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    canDelete: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize: database_1.default,
    tableName: 'role_permissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['roleId', 'module'],
        },
    ],
});
exports.default = RolePermission;
//# sourceMappingURL=RolePermission.js.map