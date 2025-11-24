"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('users', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            phone: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            role: {
                type: sequelize_1.DataTypes.ENUM('superadmin', 'admin', 'faculty', 'student', 'employee'),
                allowNull: false,
            },
            passwordHash: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            avatarUrl: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: true,
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
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('users');
    },
};
//# sourceMappingURL=20240101000001-create-users.js.map