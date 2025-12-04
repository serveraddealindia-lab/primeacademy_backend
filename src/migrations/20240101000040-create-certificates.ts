import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'certificates';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      courseName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      softwareCovered: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      grade: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      monthOfCompletion: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      certificateNumber: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      pdfUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      issuedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      issuedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
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

    // Add indexes
    await queryInterface.addIndex(TABLE_NAME, ['studentId'], { name: 'idx_studentId' });
    await queryInterface.addIndex(TABLE_NAME, ['certificateNumber'], { name: 'idx_certificateNumber', unique: true });
    await queryInterface.addIndex(TABLE_NAME, ['issuedBy'], { name: 'idx_issuedBy' });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable(TABLE_NAME);
  },
};




