"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["SCHEDULED"] = "scheduled";
    SessionStatus["ONGOING"] = "ongoing";
    SessionStatus["COMPLETED"] = "completed";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
class Session extends sequelize_1.Model {
}
Session.init({
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
    facultyId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    startTime: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false,
    },
    endTime: {
        type: sequelize_1.DataTypes.TIME,
        allowNull: false,
    },
    topic: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    isBackup: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(SessionStatus)),
        allowNull: false,
        defaultValue: SessionStatus.SCHEDULED,
    },
    actualStartAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    actualEndAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'sessions',
    timestamps: true,
});
exports.default = Session;
//# sourceMappingURL=Session.js.map