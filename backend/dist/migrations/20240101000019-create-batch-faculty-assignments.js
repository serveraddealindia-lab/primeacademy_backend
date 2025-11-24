"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('batch_faculty_assignments', {
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
                allowNull: false,
                references: {
                    model: 'users',
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
        await queryInterface.addConstraint('batch_faculty_assignments', {
            type: 'unique',
            fields: ['batchId', 'facultyId'],
            name: 'batch_faculty_assignments_unique_batch_faculty',
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeConstraint('batch_faculty_assignments', 'batch_faculty_assignments_unique_batch_faculty');
        await queryInterface.dropTable('batch_faculty_assignments');
    },
};
//# sourceMappingURL=20240101000019-create-batch-faculty-assignments.js.map