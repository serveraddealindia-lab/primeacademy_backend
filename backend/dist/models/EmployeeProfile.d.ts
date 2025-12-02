import { Model, Optional, BelongsToGetAssociationMixin, Association } from 'sequelize';
import User from './User';
export interface EmployeeProfileAttributes {
    id: number;
    userId: number;
    employeeId: string;
    gender: 'Male' | 'Female' | 'Other' | null;
    dateOfBirth: Date | null;
    nationality: string | null;
    maritalStatus: 'Single' | 'Married' | 'Other' | null;
    department: string | null;
    designation: string | null;
    dateOfJoining: Date | null;
    employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | null;
    reportingManager: string | null;
    workLocation: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    branch: string | null;
    panNumber: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface EmployeeProfileCreationAttributes extends Optional<EmployeeProfileAttributes, 'id' | 'gender' | 'dateOfBirth' | 'nationality' | 'maritalStatus' | 'department' | 'designation' | 'dateOfJoining' | 'employmentType' | 'reportingManager' | 'workLocation' | 'bankName' | 'accountNumber' | 'ifscCode' | 'branch' | 'panNumber' | 'city' | 'state' | 'postalCode' | 'createdAt' | 'updatedAt'> {
}
declare class EmployeeProfile extends Model<EmployeeProfileAttributes, EmployeeProfileCreationAttributes> implements EmployeeProfileAttributes {
    id: number;
    userId: number;
    employeeId: string;
    gender: 'Male' | 'Female' | 'Other' | null;
    dateOfBirth: Date | null;
    nationality: string | null;
    maritalStatus: 'Single' | 'Married' | 'Other' | null;
    department: string | null;
    designation: string | null;
    dateOfJoining: Date | null;
    employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | null;
    reportingManager: string | null;
    workLocation: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    branch: string | null;
    panNumber: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    getUser: BelongsToGetAssociationMixin<User>;
    static associations: {
        user: Association<EmployeeProfile, User>;
    };
}
export default EmployeeProfile;
//# sourceMappingURL=EmployeeProfile.d.ts.map