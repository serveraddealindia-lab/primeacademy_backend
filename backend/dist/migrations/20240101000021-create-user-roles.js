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
        // Add indexes only if they don't exist
        try {
            await queryInterface.addIndex('user_roles', ['userId', 'roleId'], {
                unique: true,
                name: 'unique_user_role',
            });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME')
                throw error;
        }
        try {
            await queryInterface.addIndex('user_roles', ['userId'], { name: 'idx_userId' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME')
                throw error;
        }
        try {
            await queryInterface.addIndex('user_roles', ['roleId'], { name: 'idx_roleId' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME')
                throw error;
        }
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('user_roles');
    },
};
//# sourceMappingURL=20240101000021-create-user-roles.js.map