import { QueryInterface } from 'sequelize';

const TABLE_NAME = 'payment_transactions';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Update ENUM to include all possible payment statuses
    await queryInterface.sequelize.query(
      `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('unpaid', 'pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'unpaid';`
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Revert to previous ENUM values
    await queryInterface.sequelize.query(
      `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid';`
    );
  },
};