"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('role_permissions', {
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
                type: sequelize_1.DataTypes.ENUM('batches', 'students', 'faculty', 'employees', 'sessions', 'attendance', 'payments', 'portfolios', 'reports', 'approvals', 'users', 'software_completions', 'student_leaves', 'batch_extensions', 'employee_leaves', 'faculty_leaves'),
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
        await queryInterface.addIndex('role_permissions', ['roleId', 'module'], {
            unique: true,
            name: 'unique_role_module',
        });
        await queryInterface.addIndex('role_permissions', ['roleId'], { name: 'idx_roleId' });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('role_permissions');
    },
};
//# sourceMappingURL=20240101000020-create-role-permissions.js.map