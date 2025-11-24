"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.createTable('employee_profiles', {
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
            employeeId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            gender: {
                type: sequelize_1.DataTypes.ENUM('Male', 'Female', 'Other'),
                allowNull: true,
            },
            dateOfBirth: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
            },
            nationality: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            maritalStatus: {
                type: sequelize_1.DataTypes.ENUM('Single', 'Married', 'Other'),
                allowNull: true,
            },
            department: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            designation: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            dateOfJoining: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: true,
            },
            employmentType: {
                type: sequelize_1.DataTypes.ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern'),
                allowNull: true,
            },
            reportingManager: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            workLocation: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            bankName: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            accountNumber: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            ifscCode: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            branch: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            panNumber: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            city: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            state: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            postalCode: {
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
        await queryInterface.dropTable('employee_profiles');
    },
};
//# sourceMappingURL=20240101000012-create-employee-profiles.js.map