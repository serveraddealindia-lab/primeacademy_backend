"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('roles', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            isSystem: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
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
        // Add indexes only if they don't exist
        try {
            await queryInterface.addIndex('roles', ['name'], { unique: true, name: 'idx_role_name' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME')
                throw error;
        }
        try {
            await queryInterface.addIndex('roles', ['isActive'], { name: 'idx_isActive' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME')
                throw error;
        }
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('roles');
    },
};
//# sourceMappingURL=20240101000019-create-roles.js.map