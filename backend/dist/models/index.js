"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
// Import all models
const User_1 = __importDefault(require("./User"));
const StudentProfile_1 = __importDefault(require("./StudentProfile"));
const FacultyProfile_1 = __importDefault(require("./FacultyProfile"));
const Batch_1 = __importDefault(require("./Batch"));
const Enrollment_1 = __importDefault(require("./Enrollment"));
const Session_1 = __importDefault(require("./Session"));
const Attendance_1 = __importDefault(require("./Attendance"));
const PaymentTransaction_1 = __importDefault(require("./PaymentTransaction"));
const Portfolio_1 = __importDefault(require("./Portfolio"));
const ChangeRequest_1 = __importDefault(require("./ChangeRequest"));
const EmployeePunch_1 = __importDefault(require("./EmployeePunch"));
const EmployeeProfile_1 = __importDefault(require("./EmployeeProfile"));
const StudentLeave_1 = __importDefault(require("./StudentLeave"));
const EmployeeLeave_1 = __importDefault(require("./EmployeeLeave"));
const FacultyLeave_1 = __importDefault(require("./FacultyLeave"));
const BatchExtension_1 = __importDefault(require("./BatchExtension"));
const SoftwareCompletion_1 = __importDefault(require("./SoftwareCompletion"));
const Permission_1 = __importDefault(require("./Permission"));
const BatchFacultyAssignment_1 = __importDefault(require("./BatchFacultyAssignment"));
const Role_1 = __importDefault(require("./Role"));
const RolePermission_1 = __importDefault(require("./RolePermission"));
const UserRole_1 = __importDefault(require("./UserRole"));
const db = {
    sequelize: database_1.default,
    Sequelize: sequelize_1.Sequelize,
    User: User_1.default,
    StudentProfile: StudentProfile_1.default,
    FacultyProfile: FacultyProfile_1.default,
    Batch: Batch_1.default,
    Enrollment: Enrollment_1.default,
    Session: Session_1.default,
    Attendance: Attendance_1.default,
    PaymentTransaction: PaymentTransaction_1.default,
    Portfolio: Portfolio_1.default,
    ChangeRequest: ChangeRequest_1.default,
    EmployeePunch: EmployeePunch_1.default,
    EmployeeProfile: EmployeeProfile_1.default,
    StudentLeave: StudentLeave_1.default,
    EmployeeLeave: EmployeeLeave_1.default,
    FacultyLeave: FacultyLeave_1.default,
    BatchExtension: BatchExtension_1.default,
    SoftwareCompletion: SoftwareCompletion_1.default,
    Permission: Permission_1.default,
    BatchFacultyAssignment: BatchFacultyAssignment_1.default,
    Role: Role_1.default,
    RolePermission: RolePermission_1.default,
    UserRole: UserRole_1.default,
};
// Define associations
// User associations
User_1.default.hasOne(StudentProfile_1.default, { foreignKey: 'userId', as: 'studentProfile' });
User_1.default.hasOne(FacultyProfile_1.default, { foreignKey: 'userId', as: 'facultyProfile' });
User_1.default.hasOne(EmployeeProfile_1.default, { foreignKey: 'userId', as: 'employeeProfile' });
User_1.default.hasMany(Batch_1.default, { foreignKey: 'createdByAdminId', as: 'batches' });
User_1.default.hasMany(Enrollment_1.default, { foreignKey: 'studentId', as: 'enrollments' });
User_1.default.hasMany(Session_1.default, { foreignKey: 'facultyId', as: 'sessions' });
User_1.default.hasMany(Attendance_1.default, { foreignKey: 'studentId', as: 'attendances' });
User_1.default.hasMany(Attendance_1.default, { foreignKey: 'markedBy', as: 'markedAttendances' });
User_1.default.hasMany(PaymentTransaction_1.default, { foreignKey: 'studentId', as: 'paymentTransactions' });
User_1.default.hasMany(Portfolio_1.default, { foreignKey: 'studentId', as: 'portfolios' });
User_1.default.hasMany(Portfolio_1.default, { foreignKey: 'approvedBy', as: 'approvedPortfolios' });
User_1.default.hasMany(ChangeRequest_1.default, { foreignKey: 'requestedBy', as: 'changeRequests' });
User_1.default.hasMany(ChangeRequest_1.default, { foreignKey: 'approverId', as: 'approvedChangeRequests' });
User_1.default.hasMany(EmployeePunch_1.default, { foreignKey: 'userId', as: 'employeePunches' });
User_1.default.hasMany(StudentLeave_1.default, { foreignKey: 'studentId', as: 'studentLeaves' });
User_1.default.hasMany(StudentLeave_1.default, { foreignKey: 'approvedBy', as: 'approvedLeaves' });
User_1.default.hasMany(EmployeeLeave_1.default, { foreignKey: 'employeeId', as: 'employeeLeaves' });
User_1.default.hasMany(EmployeeLeave_1.default, { foreignKey: 'approvedBy', as: 'approvedEmployeeLeaves' });
User_1.default.hasMany(FacultyLeave_1.default, { foreignKey: 'facultyId', as: 'facultyLeaves' });
User_1.default.hasMany(FacultyLeave_1.default, { foreignKey: 'approvedBy', as: 'approvedFacultyLeaves' });
User_1.default.hasMany(BatchExtension_1.default, { foreignKey: 'requestedBy', as: 'batchExtensions' });
User_1.default.hasMany(BatchExtension_1.default, { foreignKey: 'approvedBy', as: 'approvedExtensions' });
User_1.default.hasMany(SoftwareCompletion_1.default, { foreignKey: 'studentId', as: 'softwareCompletions' });
User_1.default.hasMany(SoftwareCompletion_1.default, { foreignKey: 'facultyId', as: 'taughtSoftware' });
User_1.default.hasMany(Permission_1.default, { foreignKey: 'userId', as: 'permissions' });
User_1.default.hasMany(BatchFacultyAssignment_1.default, { foreignKey: 'facultyId', as: 'facultyAssignments' });
User_1.default.belongsToMany(Batch_1.default, {
    through: BatchFacultyAssignment_1.default,
    as: 'assignedBatches',
    foreignKey: 'facultyId',
    otherKey: 'batchId',
});
User_1.default.belongsToMany(Role_1.default, {
    through: UserRole_1.default,
    as: 'roles',
    foreignKey: 'userId',
    otherKey: 'roleId',
});
// StudentProfile associations
StudentProfile_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
// FacultyProfile associations
FacultyProfile_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
// Batch associations
Batch_1.default.belongsTo(User_1.default, { foreignKey: 'createdByAdminId', as: 'admin' });
Batch_1.default.hasMany(Enrollment_1.default, { foreignKey: 'batchId', as: 'enrollments' });
Batch_1.default.hasMany(Session_1.default, { foreignKey: 'batchId', as: 'sessions' });
Batch_1.default.hasMany(Portfolio_1.default, { foreignKey: 'batchId', as: 'portfolios' });
Batch_1.default.hasMany(StudentLeave_1.default, { foreignKey: 'batchId', as: 'studentLeaves' });
Batch_1.default.hasMany(BatchExtension_1.default, { foreignKey: 'batchId', as: 'batchExtensions' });
Batch_1.default.hasMany(SoftwareCompletion_1.default, { foreignKey: 'batchId', as: 'softwareCompletions' });
Batch_1.default.hasMany(BatchFacultyAssignment_1.default, { foreignKey: 'batchId', as: 'facultyAssignments' });
Batch_1.default.belongsToMany(User_1.default, {
    through: BatchFacultyAssignment_1.default,
    as: 'assignedFaculty',
    foreignKey: 'batchId',
    otherKey: 'facultyId',
});
BatchFacultyAssignment_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
BatchFacultyAssignment_1.default.belongsTo(User_1.default, { foreignKey: 'facultyId', as: 'faculty' });
// Enrollment associations
Enrollment_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
Enrollment_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
// Session associations
Session_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
Session_1.default.belongsTo(User_1.default, { foreignKey: 'facultyId', as: 'faculty' });
Session_1.default.hasMany(Attendance_1.default, { foreignKey: 'sessionId', as: 'attendances' });
// Attendance associations
Attendance_1.default.belongsTo(Session_1.default, { foreignKey: 'sessionId', as: 'session' });
Attendance_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
Attendance_1.default.belongsTo(User_1.default, { foreignKey: 'markedBy', as: 'marker' });
// PaymentTransaction associations
PaymentTransaction_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
// Portfolio associations
Portfolio_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
Portfolio_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
Portfolio_1.default.belongsTo(User_1.default, { foreignKey: 'approvedBy', as: 'approver' });
// ChangeRequest associations
ChangeRequest_1.default.belongsTo(User_1.default, { foreignKey: 'requestedBy', as: 'requester' });
ChangeRequest_1.default.belongsTo(User_1.default, { foreignKey: 'approverId', as: 'approver' });
// EmployeePunch associations
EmployeePunch_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
// EmployeeProfile associations
EmployeeProfile_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
// StudentLeave associations
StudentLeave_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
StudentLeave_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
StudentLeave_1.default.belongsTo(User_1.default, { foreignKey: 'approvedBy', as: 'approver' });
// EmployeeLeave associations
EmployeeLeave_1.default.belongsTo(User_1.default, { foreignKey: 'employeeId', as: 'employee' });
EmployeeLeave_1.default.belongsTo(User_1.default, { foreignKey: 'approvedBy', as: 'approver' });
// FacultyLeave associations
FacultyLeave_1.default.belongsTo(User_1.default, { foreignKey: 'facultyId', as: 'faculty' });
FacultyLeave_1.default.belongsTo(User_1.default, { foreignKey: 'approvedBy', as: 'approver' });
// BatchExtension associations
BatchExtension_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
BatchExtension_1.default.belongsTo(User_1.default, { foreignKey: 'requestedBy', as: 'requester' });
BatchExtension_1.default.belongsTo(User_1.default, { foreignKey: 'approvedBy', as: 'approver' });
// SoftwareCompletion associations
SoftwareCompletion_1.default.belongsTo(User_1.default, { foreignKey: 'studentId', as: 'student' });
SoftwareCompletion_1.default.belongsTo(Batch_1.default, { foreignKey: 'batchId', as: 'batch' });
SoftwareCompletion_1.default.belongsTo(User_1.default, { foreignKey: 'facultyId', as: 'faculty' });
// Permission associations
Permission_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
// Role associations
Role_1.default.hasMany(RolePermission_1.default, { foreignKey: 'roleId', as: 'rolePermissions' });
Role_1.default.hasMany(UserRole_1.default, { foreignKey: 'roleId', as: 'userRoles' });
Role_1.default.belongsToMany(User_1.default, {
    through: UserRole_1.default,
    as: 'users',
    foreignKey: 'roleId',
    otherKey: 'userId',
});
// RolePermission associations
RolePermission_1.default.belongsTo(Role_1.default, { foreignKey: 'roleId', as: 'role' });
// UserRole associations
UserRole_1.default.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
UserRole_1.default.belongsTo(Role_1.default, { foreignKey: 'roleId', as: 'role' });
exports.default = db;
//# sourceMappingURL=index.js.map