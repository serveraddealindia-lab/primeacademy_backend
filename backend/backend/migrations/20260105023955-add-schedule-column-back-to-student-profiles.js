'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('student_profiles', 'schedule', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down (queryInterface, _Sequelize) {
    await queryInterface.removeColumn('student_profiles', 'schedule');
  }
};
