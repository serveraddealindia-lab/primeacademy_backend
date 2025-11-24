"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
var PortfolioStatus;
(function (PortfolioStatus) {
    PortfolioStatus["PENDING"] = "pending";
    PortfolioStatus["APPROVED"] = "approved";
    PortfolioStatus["REJECTED"] = "rejected";
})(PortfolioStatus || (exports.PortfolioStatus = PortfolioStatus = {}));
class Portfolio extends sequelize_1.Model {
}
Portfolio.init({
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
    files: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    pdfUrl: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    youtubeUrl: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(PortfolioStatus)),
        allowNull: false,
        defaultValue: PortfolioStatus.PENDING,
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
}, {
    sequelize: database_1.default,
    tableName: 'portfolios',
    timestamps: true,
});
exports.default = Portfolio;
//# sourceMappingURL=Portfolio.js.map