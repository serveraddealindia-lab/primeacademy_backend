"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class EmployeePunch extends sequelize_1.Model {
}
EmployeePunch.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    punchInAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    punchOutAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    breaks: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    punchInPhoto: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    punchOutPhoto: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    punchInFingerprint: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    punchOutFingerprint: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    punchInLocation: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    punchOutLocation: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    effectiveWorkingHours: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'employee_punches',
    timestamps: true,
});
exports.default = EmployeePunch;
//# sourceMappingURL=EmployeePunch.js.map