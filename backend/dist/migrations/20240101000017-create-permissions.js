"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = void 0;
const sequelize_1 = require("sequelize");
const up = async (queryInterface) => {
    await queryInterface.createTable('permissions', {
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
            onDelete: 'CASCADE',
        },
        module: {
            type: sequelize_1.DataTypes.ENUM('batches', 'students', 'faculty', 'employees', 'sessions', 'attendance', 'payments', 'portfolios', 'reports', 'approvals', 'users', 'software_completions', 'student_leaves', 'batch_extensions'),
            allowNull: false,
        },
        canView: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
        },
        canAdd: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
        },
        canEdit: {
            type: sequelize_1.DataTypes.BOOLEAN,
            defaultValue: false,
        },
        canDelete: {
            type: sequelize_1.DataTypes.BOOLEAN,
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
    await queryInterface.addIndex('permissions', ['userId', 'module'], {
        unique: true,
        name: 'unique_user_module',
    });
};
exports.up = up;
const down = async (queryInterface) => {
    await queryInterface.dropTable('permissions');
};
exports.down = down;
//# sourceMappingURL=20240101000017-create-permissions.js.map