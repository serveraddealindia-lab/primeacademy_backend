import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('role_permissions', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      module: {
        type: DataTypes.ENUM('batches', 'students', 'faculty', 'employees', 'sessions', 'attendance', 'payments', 'portfolios', 'reports', 'approvals', 'users', 'software_completions', 'student_leaves', 'batch_extensions', 'employee_leaves', 'faculty_leaves'),
        allowNull: false,
      },
      canView: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      canAdd: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      canEdit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      canDelete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      await queryInterface.addIndex('role_permissions', ['roleId', 'module'], {
        unique: true,
        name: 'unique_role_module',
      });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
    try {
      await queryInterface.addIndex('role_permissions', ['roleId'], { name: 'idx_roleId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('role_permissions');
  },
};










