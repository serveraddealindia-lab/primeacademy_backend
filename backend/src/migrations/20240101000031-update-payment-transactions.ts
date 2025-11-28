import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'payment_transactions';
const NEW_STATUS_VALUES = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
const OLD_STATUS_VALUES = ['pending', 'paid'];

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn(TABLE_NAME, 'paidAmount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn(TABLE_NAME, 'enrollmentId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'enrollments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn(TABLE_NAME, 'paymentMethod', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(TABLE_NAME, 'transactionId', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(TABLE_NAME, 'notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    // MySQL requires raw SQL to modify ENUM values
    await queryInterface.sequelize.query(
      `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending';`
    );
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Revert ENUM to original values
    await queryInterface.sequelize.query(
      `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending';`
    );

    await queryInterface.removeColumn(TABLE_NAME, 'notes');
    await queryInterface.removeColumn(TABLE_NAME, 'transactionId');
    await queryInterface.removeColumn(TABLE_NAME, 'paymentMethod');
    await queryInterface.removeColumn(TABLE_NAME, 'enrollmentId');
    await queryInterface.removeColumn(TABLE_NAME, 'paidAmount');
  },
};

