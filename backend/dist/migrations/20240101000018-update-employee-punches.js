"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        // Add new columns to employee_punches table
        await queryInterface.addColumn('employee_punches', 'punchInPhoto', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'punchOutPhoto', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'punchInFingerprint', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'punchOutFingerprint', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'punchInLocation', {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'punchOutLocation', {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn('employee_punches', 'effectiveWorkingHours', {
            type: sequelize_1.DataTypes.DECIMAL(10, 2),
            allowNull: true,
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('employee_punches', 'punchInPhoto');
        await queryInterface.removeColumn('employee_punches', 'punchOutPhoto');
        await queryInterface.removeColumn('employee_punches', 'punchInFingerprint');
        await queryInterface.removeColumn('employee_punches', 'punchOutFingerprint');
        await queryInterface.removeColumn('employee_punches', 'punchInLocation');
        await queryInterface.removeColumn('employee_punches', 'punchOutLocation');
        await queryInterface.removeColumn('employee_punches', 'effectiveWorkingHours');
    },
};
//# sourceMappingURL=20240101000018-update-employee-punches.js.map