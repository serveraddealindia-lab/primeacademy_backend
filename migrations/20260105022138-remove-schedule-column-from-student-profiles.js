'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, _Sequelize) {
    await queryInterface.removeColumn('student_profiles', 'schedule');
  },

  async down (queryInterface, _Sequelize) {
    await queryInterface.addColumn('student_profiles', 'schedule', {
      type: _Sequelize.JSON,
      allowNull: true,
    });
  }
};
