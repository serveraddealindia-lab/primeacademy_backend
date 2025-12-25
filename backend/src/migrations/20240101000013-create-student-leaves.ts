import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('student_leaves', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
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
      await queryInterface.addIndex('student_leaves', ['studentId'], { name: 'idx_studentId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
    
    try {
      await queryInterface.addIndex('student_leaves', ['batchId'], { name: 'idx_batchId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
    
    try {
      await queryInterface.addIndex('student_leaves', ['status'], { name: 'idx_status' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
    
    try {
      await queryInterface.addIndex('student_leaves', ['startDate', 'endDate'], { name: 'idx_dates' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      // Index already exists, skip
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('student_leaves');
  },
};






