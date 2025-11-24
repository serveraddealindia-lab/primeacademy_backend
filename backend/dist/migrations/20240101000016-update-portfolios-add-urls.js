"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
exports.default = {
    up: async (queryInterface) => {
        // Add pdfUrl and youtubeUrl columns to portfolios table if they don't exist
        const tableDescription = await queryInterface.describeTable('portfolios');
        if (!tableDescription.pdfUrl) {
            await queryInterface.addColumn('portfolios', 'pdfUrl', {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            });
        }
        if (!tableDescription.youtubeUrl) {
            await queryInterface.addColumn('portfolios', 'youtubeUrl', {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            });
        }
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('portfolios', 'pdfUrl');
        await queryInterface.removeColumn('portfolios', 'youtubeUrl');
    },
};
//# sourceMappingURL=20240101000016-update-portfolios-add-urls.js.map