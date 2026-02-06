'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add address column to employee_profiles table
    await queryInterface.addColumn('employee_profiles', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, _Sequelize) {
    // Remove address column from employee_profiles table
    await queryInterface.removeColumn('employee_profiles', 'address');
  }
};
