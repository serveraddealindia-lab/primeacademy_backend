"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchMode = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var BatchMode;
(function (BatchMode) {
    BatchMode["ONLINE"] = "online";
    BatchMode["OFFLINE"] = "offline";
    BatchMode["HYBRID"] = "hybrid";
})(BatchMode || (exports.BatchMode = BatchMode = {}));
class Batch extends sequelize_1.Model {
}
Batch.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    software: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    mode: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(BatchMode)),
        allowNull: false,
    },
    startDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    endDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    maxCapacity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    schedule: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    createdByAdminId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'batches',
    timestamps: true,
});
exports.default = Batch;
//# sourceMappingURL=Batch.js.map