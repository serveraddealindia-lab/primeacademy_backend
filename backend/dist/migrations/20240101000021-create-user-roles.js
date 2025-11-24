"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('user_roles', {
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
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
        await queryInterface.addIndex('user_roles', ['userId', 'roleId'], {
            unique: true,
            name: 'unique_user_role',
        });
        await queryInterface.addIndex('user_roles', ['userId'], { name: 'idx_userId' });
        await queryInterface.addIndex('user_roles', ['roleId'], { name: 'idx_roleId' });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('user_roles');
    },
};
//# sourceMappingURL=20240101000021-create-user-roles.js.map