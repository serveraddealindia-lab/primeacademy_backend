import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

// GET /api/employees/:userId - Get employee profile
export const getEmployeeProfile = async (
  req: AuthRequest & { params: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can view their own profile, or admins can view any profile
    if (req.user.userId !== userId && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own profile unless you are an admin',
      });
      return;
    }

    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: db.EmployeeProfile ? [
        {
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false,
        },
      ] : undefined,
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (user.role !== UserRole.EMPLOYEE) {
      res.status(400).json({
        status: 'error',
        message: 'User is not an employee',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        employeeProfile: user.employeeProfile || null,
      },
    });
  } catch (error) {
    logger.error('Get employee profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching employee profile',
    });
  }
};

// POST /api/employees - Create employee profile
export const createEmployeeProfile = async (
  req: AuthRequest & { body: {
    userId: number;
    employeeId: string;
    gender?: string;
    dateOfBirth?: string;
    nationality?: string;
    maritalStatus?: string;
    department?: string;
    designation?: string;
    dateOfJoining?: string;
    employmentType?: string;
    reportingManager?: string;
    workLocation?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    panNumber?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can create employee profiles
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create employee profiles',
      });
      return;
    }

    const { userId, employeeId, ...profileData } = req.body;

    // Validation - All fields required except documents
    const validationErrors: string[] = [];

    if (!userId) {
      validationErrors.push('User ID is required');
    }

    if (!employeeId || !employeeId.trim()) {
      validationErrors.push('Employee ID is required');
    }

    if (!profileData.gender || !profileData.gender.trim()) {
      validationErrors.push('Gender is required');
    }

    if (!profileData.dateOfBirth || !profileData.dateOfBirth.trim()) {
      validationErrors.push('Date of Birth is required');
    }

    if (!profileData.nationality || !profileData.nationality.trim()) {
      validationErrors.push('Nationality is required');
    }

    if (!profileData.maritalStatus || !profileData.maritalStatus.trim()) {
      validationErrors.push('Marital Status is required');
    }

    if (!profileData.department || !profileData.department.trim()) {
      validationErrors.push('Department is required');
    }

    if (!profileData.designation || !profileData.designation.trim()) {
      validationErrors.push('Designation is required');
    }

    if (!profileData.dateOfJoining || !profileData.dateOfJoining.trim()) {
      validationErrors.push('Date of Joining is required');
    }

    if (!profileData.employmentType || !profileData.employmentType.trim()) {
      validationErrors.push('Employment Type is required');
    }

    if (!profileData.workLocation || !profileData.workLocation.trim()) {
      validationErrors.push('Work Location is required');
    }

    if (!profileData.bankName || !profileData.bankName.trim()) {
      validationErrors.push('Bank Name is required');
    }

    if (!profileData.accountNumber || !profileData.accountNumber.trim()) {
      validationErrors.push('Account Number is required');
    }

    if (!profileData.ifscCode || !profileData.ifscCode.trim()) {
      validationErrors.push('IFSC Code is required');
    }

    if (!profileData.branch || !profileData.branch.trim()) {
      validationErrors.push('Branch is required');
    }

    if (!profileData.panNumber || !profileData.panNumber.trim()) {
      validationErrors.push('PAN Number is required');
    }

    if (!profileData.city || !profileData.city.trim()) {
      validationErrors.push('City is required');
    }

    if (!profileData.state || !profileData.state.trim()) {
      validationErrors.push('State is required');
    }

    if (!profileData.postalCode || !profileData.postalCode.trim()) {
      validationErrors.push('Postal Code is required');
    }

    // Validate PAN format
    if (profileData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(profileData.panNumber.toUpperCase())) {
      validationErrors.push('Invalid PAN Number format. PAN should be 10 characters (e.g., ABCDE1234F)');
    }

    // Validate IFSC format
    if (profileData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profileData.ifscCode.toUpperCase())) {
      validationErrors.push('Invalid IFSC Code format. IFSC should be 11 characters (e.g., ABCD0123456)');
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Check if user exists and is an employee
    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (user.role !== UserRole.EMPLOYEE) {
      res.status(400).json({
        status: 'error',
        message: 'User is not an employee',
      });
      return;
    }

    // Check if EmployeeProfile model exists
    if (!db.EmployeeProfile) {
      res.status(400).json({
        status: 'error',
        message: 'EmployeeProfile model is not available',
      });
      return;
    }

    // Check if profile already exists
    const existingProfile = await db.EmployeeProfile.findOne({ where: { userId } });
    if (existingProfile) {
      res.status(409).json({
        status: 'error',
        message: 'Employee profile already exists for this user',
      });
      return;
    }

    // Check if employeeId is already taken
    const existingEmployeeId = await db.EmployeeProfile.findOne({ where: { employeeId } });
    if (existingEmployeeId) {
      res.status(409).json({
        status: 'error',
        message: 'Employee ID already exists',
      });
      return;
    }

    // Create employee profile
    const employeeProfile = await db.EmployeeProfile.create({
      userId,
      employeeId: employeeId.trim(),
      gender: profileData.gender.trim() as 'Male' | 'Female' | 'Other',
      dateOfBirth: new Date(profileData.dateOfBirth.trim()),
      nationality: profileData.nationality.trim(),
      maritalStatus: profileData.maritalStatus.trim() as 'Single' | 'Married' | 'Other',
      department: profileData.department.trim(),
      designation: profileData.designation.trim(),
      dateOfJoining: new Date(profileData.dateOfJoining.trim()),
      employmentType: profileData.employmentType.trim() as 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern',
      reportingManager: profileData.reportingManager?.trim() || null,
      workLocation: profileData.workLocation.trim(),
      bankName: profileData.bankName.trim(),
      accountNumber: profileData.accountNumber.trim(),
      ifscCode: profileData.ifscCode.trim().toUpperCase(),
      branch: profileData.branch.trim(),
      panNumber: profileData.panNumber.trim().toUpperCase(),
      city: profileData.city.trim(),
      state: profileData.state.trim(),
      postalCode: profileData.postalCode.trim(),
    });

    // Fetch created profile with user
    const createdProfile = await db.EmployeeProfile.findByPk(employeeProfile.id, {
      include: db.User ? [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
        },
      ] : undefined,
    });

    res.status(201).json({
      status: 'success',
      message: 'Employee profile created successfully',
      data: {
        employeeProfile: createdProfile,
      },
    });
  } catch (error: any) {
    logger.error('Create employee profile error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while creating employee profile',
    });
  }
};

