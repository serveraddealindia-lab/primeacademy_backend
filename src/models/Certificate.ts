import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CertificateAttributes {
  id: number;
  studentId: number;
  courseName: string;
  softwareCovered: string[]; // Array of software names
  grade: string;
  monthOfCompletion: string; // Format: "Sept - 2025"
  certificateNumber: string; // Unique certificate ID like "PA/A/MP/20251120"
  pdfUrl?: string; // URL to the generated PDF
  issuedBy?: number; // User ID of the issuer (admin/superadmin)
  issuedAt?: Date;
  studentDeclarationAccepted?: boolean; // Whether student accepted declaration for certificate without portfolio
  studentDeclarationDate?: Date; // Date when declaration was accepted
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CertificateCreationAttributes extends Optional<CertificateAttributes, 'id' | 'pdfUrl' | 'issuedBy' | 'issuedAt' | 'studentDeclarationAccepted' | 'studentDeclarationDate' | 'createdAt' | 'updatedAt'> {}

class Certificate extends Model<CertificateAttributes, CertificateCreationAttributes> implements CertificateAttributes {
  public id!: number;
  public studentId!: number;
  public courseName!: string;
  public softwareCovered!: string[];
  public grade!: string;
  public monthOfCompletion!: string;
  public certificateNumber!: string;
  public pdfUrl?: string;
  public issuedBy?: number;
  public issuedAt?: Date;
  public studentDeclarationAccepted?: boolean;
  public studentDeclarationDate?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Certificate.init(
  {
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    monthOfCompletion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    pdfUrl: {
      type: DataTypes.STRING,
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
    studentDeclarationAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    studentDeclarationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'certificates',
    timestamps: true,
  }
);

export default Certificate;



