"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeRequestStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var ChangeRequestStatus;
(function (ChangeRequestStatus) {
    ChangeRequestStatus["PENDING"] = "pending";
    ChangeRequestStatus["APPROVED"] = "approved";
    ChangeRequestStatus["REJECTED"] = "rejected";
})(ChangeRequestStatus || (exports.ChangeRequestStatus = ChangeRequestStatus = {}));
class ChangeRequest extends sequelize_1.Model {
}
ChangeRequest.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    entityType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    entityId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    requestedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    approverId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ChangeRequestStatus)),
        allowNull: false,
        defaultValue: ChangeRequestStatus.PENDING,
    },
    reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'change_requests',
    timestamps: true,
});
exports.default = ChangeRequest;
//# sourceMappingURL=ChangeRequest.js.map