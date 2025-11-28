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

    if (!userId || !employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Employee ID are required',
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
      employeeId,
      gender: profileData.gender as 'Male' | 'Female' | 'Other' | undefined,
      dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
      nationality: profileData.nationality || null,
      maritalStatus: profileData.maritalStatus as 'Single' | 'Married' | 'Other' | undefined,
      department: profileData.department || null,
      designation: profileData.designation || null,
      dateOfJoining: profileData.dateOfJoining ? new Date(profileData.dateOfJoining) : null,
      employmentType: profileData.employmentType as 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | undefined,
      reportingManager: profileData.reportingManager || null,
      workLocation: profileData.workLocation || null,
      bankName: profileData.bankName || null,
      accountNumber: profileData.accountNumber || null,
      ifscCode: profileData.ifscCode || null,
      branch: profileData.branch || null,
      panNumber: profileData.panNumber || null,
      city: profileData.city || null,
      state: profileData.state || null,
      postalCode: profileData.postalCode || null,
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

