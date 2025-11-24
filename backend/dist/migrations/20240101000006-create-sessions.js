"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('sessions', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            batchId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'batches',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            facultyId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            startTime: {
                type: sequelize_1.DataTypes.TIME,
                allowNull: false,
            },
            endTime: {
                type: sequelize_1.DataTypes.TIME,
                allowNull: false,
            },
            topic: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            isBackup: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM('scheduled', 'ongoing', 'completed'),
                allowNull: false,
                defaultValue: 'scheduled',
            },
            actualStartAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            actualEndAt: {
                type: sequelize_1.DataTypes.DATE,
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
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('sessions');
    },
};
//# sourceMappingURL=20240101000006-create-sessions.js.map