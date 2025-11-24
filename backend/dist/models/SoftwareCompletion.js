"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftwareCompletionStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var SoftwareCompletionStatus;
(function (SoftwareCompletionStatus) {
    SoftwareCompletionStatus["IN_PROGRESS"] = "in_progress";
    SoftwareCompletionStatus["COMPLETED"] = "completed";
})(SoftwareCompletionStatus || (exports.SoftwareCompletionStatus = SoftwareCompletionStatus = {}));
class SoftwareCompletion extends sequelize_1.Model {
}
SoftwareCompletion.init({
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
    },
    batchId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'batches',
            key: 'id',
        },
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
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(SoftwareCompletionStatus)),
        allowNull: false,
        defaultValue: SoftwareCompletionStatus.IN_PROGRESS,
    },
    completedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'software_completions',
    timestamps: true,
});
exports.default = SoftwareCompletion;
//# sourceMappingURL=SoftwareCompletion.js.map