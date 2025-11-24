"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('employee_leaves', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            employeeId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            startDate: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending',
            },
            approvedBy: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            approvedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            rejectionReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        });
        await queryInterface.addIndex('employee_leaves', ['employeeId'], { name: 'idx_employeeId' });
        await queryInterface.addIndex('employee_leaves', ['status'], { name: 'idx_status' });
        await queryInterface.addIndex('employee_leaves', ['startDate', 'endDate'], { name: 'idx_dates' });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('employee_leaves');
    },
};
//# sourceMappingURL=20240101000017-create-employee-leaves.js.map