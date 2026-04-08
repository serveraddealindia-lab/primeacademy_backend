'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('session_approval_requests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      facultyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      batchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      requestedSessionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Which session number faculty is trying to start (4, 5, etc.)',
      },
      concurrentSessionIds: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of currently running session IDs',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Faculty reason for requesting additional session',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'SuperAdmin reason for rejection',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('session_approval_requests', ['facultyId']);
    await queryInterface.addIndex('session_approval_requests', ['status']);
    await queryInterface.addIndex('session_approval_requests', ['batchId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('session_approval_requests');
  },
};
