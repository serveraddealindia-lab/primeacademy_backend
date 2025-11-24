"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('payment_transactions', 'paidAmount', {
            type: sequelize_1.DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.sequelize.query("ALTER TABLE `payment_transactions` MODIFY `status` ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending';");
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('payment_transactions', 'paidAmount');
        await queryInterface.sequelize.query("ALTER TABLE `payment_transactions` MODIFY `status` ENUM('pending','paid') NOT NULL DEFAULT 'pending';");
    },
};
//# sourceMappingURL=20240101000019-update-payment-transactions.js.map