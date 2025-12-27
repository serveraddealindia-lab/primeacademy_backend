import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable('user_roles', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      await queryInterface.addIndex('user_roles', ['userId', 'roleId'], {
        unique: true,
        name: 'unique_user_role',
      });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
    try {
      await queryInterface.addIndex('user_roles', ['userId'], { name: 'idx_userId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
    try {
      await queryInterface.addIndex('user_roles', ['roleId'], { name: 'idx_roleId' });
    } catch (error: any) {
      if (error.original?.code !== 'ER_DUP_KEYNAME') throw error;
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('user_roles');
  },
};










