"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('student_leaves', {
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
        // Add indexes only if they don't exist
        try {
            await queryInterface.addIndex('student_leaves', ['studentId'], { name: 'idx_studentId' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME') {
                throw error;
            }
            // Index already exists, skip
        }
        try {
            await queryInterface.addIndex('student_leaves', ['batchId'], { name: 'idx_batchId' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME') {
                throw error;
            }
            // Index already exists, skip
        }
        try {
            await queryInterface.addIndex('student_leaves', ['status'], { name: 'idx_status' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME') {
                throw error;
            }
            // Index already exists, skip
        }
        try {
            await queryInterface.addIndex('student_leaves', ['startDate', 'endDate'], { name: 'idx_dates' });
        }
        catch (error) {
            if (error.original?.code !== 'ER_DUP_KEYNAME') {
                throw error;
            }
            // Index already exists, skip
        }
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('student_leaves');
    },
};
//# sourceMappingURL=20240101000013-create-student-leaves.js.map