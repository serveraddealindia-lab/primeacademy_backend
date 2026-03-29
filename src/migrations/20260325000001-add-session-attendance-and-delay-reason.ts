import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Backward compatible: all columns nullable with safe defaults
    await queryInterface.addColumn('sessions', 'attendanceSubmittedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('sessions', 'attendanceSubmittedBy', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('sessions', 'delayReason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('sessions', 'delayReason');
    await queryInterface.removeColumn('sessions', 'attendanceSubmittedBy');
    await queryInterface.removeColumn('sessions', 'attendanceSubmittedAt');
  },
};

