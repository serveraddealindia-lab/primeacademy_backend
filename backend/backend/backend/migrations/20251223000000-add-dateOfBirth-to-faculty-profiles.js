'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add dateOfBirth column to faculty_profiles table
    await queryInterface.addColumn('faculty_profiles', 'dateOfBirth', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Date of birth of the faculty member',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('faculty_profiles', 'dateOfBirth');
  },
};

