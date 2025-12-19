import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('batch_extensions', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      requestedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      numberOfSessions: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add indexes only if they don't exist
    try {
      await queryInterface.addIndex('batch_extensions', ['batchId'], { name: 'idx_batchId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
    
    try {
      await queryInterface.addIndex('batch_extensions', ['requestedBy'], { name: 'idx_requestedBy' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
    
    try {
      await queryInterface.addIndex('batch_extensions', ['status'], { name: 'idx_status' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('batch_extensions');
  },
};






