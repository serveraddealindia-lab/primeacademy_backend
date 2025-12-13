import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('roles', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      await queryInterface.addIndex('roles', ['name'], { unique: true, name: 'idx_role_name' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
    try {
      await queryInterface.addIndex('roles', ['isActive'], { name: 'idx_isActive' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('roles');
  },
};










