import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'payment_transactions';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    try {
      // Check if columns exist before adding them to prevent duplicate column errors
      const tableColumns = await queryInterface.describeTable(TABLE_NAME);
      
      if (!tableColumns['paidAmount']) {
        console.log('Adding paidAmount column...');
        await queryInterface.addColumn(TABLE_NAME, 'paidAmount', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        });
      } else {
        console.log('paidAmount column already exists');
      }

      if (!tableColumns['enrollmentId']) {
        console.log('Adding enrollmentId column...');
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
      } else {
        console.log('enrollmentId column already exists');
      }

      if (!tableColumns['paymentMethod']) {
        console.log('Adding paymentMethod column...');
        await queryInterface.addColumn(TABLE_NAME, 'paymentMethod', {
          type: DataTypes.STRING,
          allowNull: true,
        });
      } else {
        console.log('paymentMethod column already exists');
      }

      if (!tableColumns['transactionId']) {
        console.log('Adding transactionId column...');
        await queryInterface.addColumn(TABLE_NAME, 'transactionId', {
          type: DataTypes.STRING,
          allowNull: true,
        });
      } else {
        console.log('transactionId column already exists');
      }

      if (!tableColumns['notes']) {
        console.log('Adding notes column...');
        await queryInterface.addColumn(TABLE_NAME, 'notes', {
          type: DataTypes.TEXT,
          allowNull: true,
        });
      } else {
        console.log('notes column already exists');
      }

      // Update ENUM values if they don't already include all statuses
      const [results] = await queryInterface.sequelize.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = '${TABLE_NAME}' 
         AND COLUMN_NAME = 'status' 
         AND TABLE_SCHEMA = DATABASE();`
      );
      
      const currentEnum = (results as any[])[0]?.COLUMN_TYPE;
      if (currentEnum && !currentEnum.includes('pending') && !currentEnum.includes('overdue') && !currentEnum.includes('cancelled')) {
        console.log('Updating status ENUM values...');
        await queryInterface.sequelize.query(
          `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('unpaid', 'pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'unpaid';`
        );
      } else {
        console.log('Status ENUM already contains all required values');
      }

      // Add bankName column if it doesn't exist
      if (!tableColumns['bankName']) {
        console.log('Adding bankName column...');
        await queryInterface.addColumn(TABLE_NAME, 'bankName', {
          type: DataTypes.STRING,
          allowNull: true,
        });
      } else {
        console.log('bankName column already exists');
      }

      // Add bankAccount column if it doesn't exist
      if (!tableColumns['bankAccount']) {
        console.log('Adding bankAccount column...');
        await queryInterface.addColumn(TABLE_NAME, 'bankAccount', {
          type: DataTypes.STRING,
          allowNull: true,
        });
      } else {
        console.log('bankAccount column already exists');
      }
    } catch (error) {
      console.error('Error in migration up:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    try {
      // Revert ENUM to original values
      await queryInterface.sequelize.query(
        `ALTER TABLE ${TABLE_NAME} MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid';`
      );

      // Check if columns exist before removing them to prevent errors
      const tableColumns = await queryInterface.describeTable(TABLE_NAME);
      
      if (tableColumns['notes']) {
        console.log('Removing notes column...');
        await queryInterface.removeColumn(TABLE_NAME, 'notes');
      }
      if (tableColumns['transactionId']) {
        console.log('Removing transactionId column...');
        await queryInterface.removeColumn(TABLE_NAME, 'transactionId');
      }
      if (tableColumns['paymentMethod']) {
        console.log('Removing paymentMethod column...');
        await queryInterface.removeColumn(TABLE_NAME, 'paymentMethod');
      }
      if (tableColumns['enrollmentId']) {
        console.log('Removing enrollmentId column...');
        await queryInterface.removeColumn(TABLE_NAME, 'enrollmentId');
      }
      if (tableColumns['paidAmount']) {
        console.log('Removing paidAmount column...');
        await queryInterface.removeColumn(TABLE_NAME, 'paidAmount');
      }
      if (tableColumns['bankAccount']) {
        console.log('Removing bankAccount column...');
        await queryInterface.removeColumn(TABLE_NAME, 'bankAccount');
      }
      if (tableColumns['bankName']) {
        console.log('Removing bankName column...');
        await queryInterface.removeColumn(TABLE_NAME, 'bankName');
      }
    } catch (error) {
      console.error('Error in migration down:', error);
      throw error;
    }
  },
};

