import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    // Add batch status columns to student_profiles table
    await queryInterface.addColumn('student_profiles', 'finishedBatches', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of software names from finished batches',
    });

    await queryInterface.addColumn('student_profiles', 'currentBatches', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of software names from current/active batches',
    });

    await queryInterface.addColumn('student_profiles', 'pendingBatches', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of software names from pending/upcoming batches',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    // Remove the columns if migration is rolled back
    await queryInterface.removeColumn('student_profiles', 'finishedBatches');
    await queryInterface.removeColumn('student_profiles', 'currentBatches');
    await queryInterface.removeColumn('student_profiles', 'pendingBatches');
  },
};









