"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class FacultyProfile extends sequelize_1.Model {
}
FacultyProfile.init({
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
    expertise: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    availability: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'faculty_profiles',
    timestamps: true,
});
exports.default = FacultyProfile;
//# sourceMappingURL=FacultyProfile.js.map