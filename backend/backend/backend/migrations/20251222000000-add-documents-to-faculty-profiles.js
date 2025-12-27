'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add JSON documents column to faculty_profiles to store personal/employment/bank/emergency info
    await queryInterface.addColumn('faculty_profiles', 'documents', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('faculty_profiles', 'documents');
  },
};




