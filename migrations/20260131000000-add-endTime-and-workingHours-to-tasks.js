'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tasks', 'endTime', {
      type: Sequelize.STRING(5),
      allowNull: true,
      comment: 'End time in HH:MM format'
    });

    await queryInterface.addColumn('Tasks', 'workingHours', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Working hours in minutes (calculated from startTime to endTime)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tasks', 'workingHours');
    await queryInterface.removeColumn('Tasks', 'endTime');
  }
};
