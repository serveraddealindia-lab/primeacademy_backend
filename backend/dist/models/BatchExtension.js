"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var ExtensionStatus;
(function (ExtensionStatus) {
    ExtensionStatus["PENDING"] = "pending";
    ExtensionStatus["APPROVED"] = "approved";
    ExtensionStatus["REJECTED"] = "rejected";
})(ExtensionStatus || (exports.ExtensionStatus = ExtensionStatus = {}));
class BatchExtension extends sequelize_1.Model {
}
BatchExtension.init({
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
    },
    requestedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    numberOfSessions: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ExtensionStatus)),
        allowNull: false,
        defaultValue: ExtensionStatus.PENDING,
    },
    approvedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    approvedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    rejectionReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'batch_extensions',
    timestamps: true,
});
exports.default = BatchExtension;
//# sourceMappingURL=BatchExtension.js.map