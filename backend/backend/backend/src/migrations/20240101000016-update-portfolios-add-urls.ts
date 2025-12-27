import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Add pdfUrl and youtubeUrl columns to portfolios table if they don't exist
    const tableDescription = await queryInterface.describeTable('portfolios');
    
    if (!tableDescription.pdfUrl) {
      await queryInterface.addColumn('portfolios', 'pdfUrl', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }
    
    if (!tableDescription.youtubeUrl) {
      await queryInterface.addColumn('portfolios', 'youtubeUrl', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('portfolios', 'pdfUrl');
    await queryInterface.removeColumn('portfolios', 'youtubeUrl');
  },
};






