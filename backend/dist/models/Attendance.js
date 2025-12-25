"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["MANUAL_PRESENT"] = "manual_present";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
class Attendance extends sequelize_1.Model {
}
Attendance.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sessionId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sessions',
            key: 'id',
        },
    },
    studentId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(AttendanceStatus)),
        allowNull: false,
    },
    isManual: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    markedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    markedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.default,
    tableName: 'attendances',
    timestamps: true,
});
exports.default = Attendance;
//# sourceMappingURL=Attendance.js.map