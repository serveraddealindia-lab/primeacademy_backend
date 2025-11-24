"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('student_profiles', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            dob: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            address: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            documents: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            photoUrl: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            softwareList: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            enrollmentDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.STRING,
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
        await queryInterface.dropTable('student_profiles');
    },
};
//# sourceMappingURL=20240101000002-create-student-profiles.js.map