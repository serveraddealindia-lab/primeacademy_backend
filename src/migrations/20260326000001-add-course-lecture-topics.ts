import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Add JSON column to store lecture topics (subject/topic list) per course
    // Keep default as [] so reads are consistent.
    try {
      await queryInterface.addColumn('courses', 'lectureTopics', {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      });
    } catch (error: any) {
      // If column already exists, ignore (idempotent for environments that were manually updated)
      const code = error?.original?.code;
      if (code !== 'ER_DUP_FIELDNAME') throw error;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    try {
      await queryInterface.removeColumn('courses', 'lectureTopics');
    } catch {
      // ignore
    }
  },
};

