"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('software_completions', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            studentId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
            softwareName: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            startDate: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
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
            status: {
                type: sequelize_1.DataTypes.ENUM('in_progress', 'completed'),
                allowNull: false,
                defaultValue: 'in_progress',
            },
            completedAt: {
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
        await queryInterface.addIndex('software_completions', ['studentId'], { name: 'idx_studentId' });
        await queryInterface.addIndex('software_completions', ['batchId'], { name: 'idx_batchId' });
        await queryInterface.addIndex('software_completions', ['facultyId'], { name: 'idx_facultyId' });
        await queryInterface.addIndex('software_completions', ['softwareName'], { name: 'idx_softwareName' });
        await queryInterface.addIndex('software_completions', ['status'], { name: 'idx_status' });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('software_completions');
    },
};
//# sourceMappingURL=20240101000015-create-software-completions.js.map