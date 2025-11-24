import { Sequelize } from 'sequelize';
import sequelize from '../config/database';

// Import all models
import User from './User';
import StudentProfile from './StudentProfile';
import FacultyProfile from './FacultyProfile';
import Batch from './Batch';
import Enrollment from './Enrollment';
import Session from './Session';
import Attendance from './Attendance';
import PaymentTransaction from './PaymentTransaction';
import Portfolio from './Portfolio';
import ChangeRequest from './ChangeRequest';
import EmployeePunch from './EmployeePunch';
import EmployeeProfile from './EmployeeProfile';
import StudentLeave from './StudentLeave';
import EmployeeLeave from './EmployeeLeave';
import FacultyLeave from './FacultyLeave';
import BatchExtension from './BatchExtension';
import SoftwareCompletion from './SoftwareCompletion';
import Permission from './Permission';
import BatchFacultyAssignment from './BatchFacultyAssignment';
import Role from './Role';
import RolePermission from './RolePermission';
import UserRole from './UserRole';

const db = {
  sequelize,
  Sequelize,
  User,
  StudentProfile,
  FacultyProfile,
  Batch,
  Enrollment,
  Session,
  Attendance,
  PaymentTransaction,
  Portfolio,
  ChangeRequest,
  EmployeePunch,
  EmployeeProfile,
  StudentLeave,
  EmployeeLeave,
  FacultyLeave,
  BatchExtension,
  SoftwareCompletion,
  Permission,
  BatchFacultyAssignment,
  Role,
  RolePermission,
  UserRole,
};

// Define associations
// User associations
User.hasOne(StudentProfile, { foreignKey: 'userId', as: 'studentProfile' });
User.hasOne(FacultyProfile, { foreignKey: 'userId', as: 'facultyProfile' });
User.hasOne(EmployeeProfile, { foreignKey: 'userId', as: 'employeeProfile' });
User.hasMany(Batch, { foreignKey: 'createdByAdminId', as: 'batches' });
User.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments' });
User.hasMany(Session, { foreignKey: 'facultyId', as: 'sessions' });
User.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendances' });
User.hasMany(Attendance, { foreignKey: 'markedBy', as: 'markedAttendances' });
User.hasMany(PaymentTransaction, { foreignKey: 'studentId', as: 'paymentTransactions' });
User.hasMany(Portfolio, { foreignKey: 'studentId', as: 'portfolios' });
User.hasMany(Portfolio, { foreignKey: 'approvedBy', as: 'approvedPortfolios' });
User.hasMany(ChangeRequest, { foreignKey: 'requestedBy', as: 'changeRequests' });
User.hasMany(ChangeRequest, { foreignKey: 'approverId', as: 'approvedChangeRequests' });
User.hasMany(EmployeePunch, { foreignKey: 'userId', as: 'employeePunches' });
User.hasMany(StudentLeave, { foreignKey: 'studentId', as: 'studentLeaves' });
User.hasMany(StudentLeave, { foreignKey: 'approvedBy', as: 'approvedLeaves' });
User.hasMany(EmployeeLeave, { foreignKey: 'employeeId', as: 'employeeLeaves' });
User.hasMany(EmployeeLeave, { foreignKey: 'approvedBy', as: 'approvedEmployeeLeaves' });
User.hasMany(FacultyLeave, { foreignKey: 'facultyId', as: 'facultyLeaves' });
User.hasMany(FacultyLeave, { foreignKey: 'approvedBy', as: 'approvedFacultyLeaves' });
User.hasMany(BatchExtension, { foreignKey: 'requestedBy', as: 'batchExtensions' });
User.hasMany(BatchExtension, { foreignKey: 'approvedBy', as: 'approvedExtensions' });
User.hasMany(SoftwareCompletion, { foreignKey: 'studentId', as: 'softwareCompletions' });
User.hasMany(SoftwareCompletion, { foreignKey: 'facultyId', as: 'taughtSoftware' });
User.hasMany(Permission, { foreignKey: 'userId', as: 'permissions' });
User.hasMany(BatchFacultyAssignment, { foreignKey: 'facultyId', as: 'facultyAssignments' });
User.belongsToMany(Batch, {
  through: BatchFacultyAssignment,
  as: 'assignedBatches',
  foreignKey: 'facultyId',
  otherKey: 'batchId',
});
User.belongsToMany(Role, {
  through: UserRole,
  as: 'roles',
  foreignKey: 'userId',
  otherKey: 'roleId',
});

// StudentProfile associations
StudentProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// FacultyProfile associations
FacultyProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Batch associations
Batch.belongsTo(User, { foreignKey: 'createdByAdminId', as: 'admin' });
Batch.hasMany(Enrollment, { foreignKey: 'batchId', as: 'enrollments' });
Batch.hasMany(Session, { foreignKey: 'batchId', as: 'sessions' });
Batch.hasMany(Portfolio, { foreignKey: 'batchId', as: 'portfolios' });
Batch.hasMany(StudentLeave, { foreignKey: 'batchId', as: 'studentLeaves' });
Batch.hasMany(BatchExtension, { foreignKey: 'batchId', as: 'batchExtensions' });
Batch.hasMany(SoftwareCompletion, { foreignKey: 'batchId', as: 'softwareCompletions' });
Batch.hasMany(BatchFacultyAssignment, { foreignKey: 'batchId', as: 'facultyAssignments' });
Batch.belongsToMany(User, {
  through: BatchFacultyAssignment,
  as: 'assignedFaculty',
  foreignKey: 'batchId',
  otherKey: 'facultyId',
});

BatchFacultyAssignment.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
BatchFacultyAssignment.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

// Enrollment associations
Enrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Enrollment.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

// Session associations
Session.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Session.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });
Session.hasMany(Attendance, { foreignKey: 'sessionId', as: 'attendances' });

// Attendance associations
Attendance.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });
Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Attendance.belongsTo(User, { foreignKey: 'markedBy', as: 'marker' });

// PaymentTransaction associations
PaymentTransaction.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Portfolio associations
Portfolio.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Portfolio.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Portfolio.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// ChangeRequest associations
ChangeRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
ChangeRequest.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// EmployeePunch associations
EmployeePunch.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// EmployeeProfile associations
EmployeeProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// StudentLeave associations
StudentLeave.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentLeave.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
StudentLeave.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// EmployeeLeave associations
EmployeeLeave.belongsTo(User, { foreignKey: 'employeeId', as: 'employee' });
EmployeeLeave.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// FacultyLeave associations
FacultyLeave.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });
FacultyLeave.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// BatchExtension associations
BatchExtension.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
BatchExtension.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
BatchExtension.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// SoftwareCompletion associations
SoftwareCompletion.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
SoftwareCompletion.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
SoftwareCompletion.belongsTo(User, { foreignKey: 'facultyId', as: 'faculty' });

// Permission associations
Permission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Role associations
Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' });
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });
Role.belongsToMany(User, {
  through: UserRole,
  as: 'users',
  foreignKey: 'roleId',
  otherKey: 'userId',
});

// RolePermission associations
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// UserRole associations
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

export default db;

