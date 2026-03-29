'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      reportType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Type of report (e.g., batch-attendance, pending-payments)',
      },
      reportName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Human-readable report name',
      },
      generatedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User ID who generated the report',
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Query parameters used for generating the report',
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Complete report data',
      },
      summary: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Summary statistics of the report',
      },
      recordCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of records in the report',
      },
      fileUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to exported file if any (CSV, PDF, etc.)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'completed',
        comment: 'Report generation status',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if report generation failed',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('reports', ['reportType']);
    await queryInterface.addIndex('reports', ['generatedBy']);
    await queryInterface.addIndex('reports', ['status']);
    await queryInterface.addIndex('reports', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reports');
  },
};
