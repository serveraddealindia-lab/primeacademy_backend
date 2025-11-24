"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class StudentProfile extends sequelize_1.Model {
}
StudentProfile.init({
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
}, {
    sequelize: database_1.default,
    tableName: 'student_profiles',
    timestamps: true,
});
exports.default = StudentProfile;
//# sourceMappingURL=StudentProfile.js.map