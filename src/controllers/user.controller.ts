import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';
import { generateToken } from '../utils/jwt';

// GET /api/users - Get all users with optional filters
export const getAllUsers = async (
  req: AuthRequest & { query: { role?: string; isActive?: string; page?: string; limit?: string } },
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

    // Only SuperAdmin and Admin can view all users
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can view all users',
      });
      return;
    }

    const { role, isActive, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const includeOptions: any[] = [];
    
    // Only include profile models if they exist and are defined
    try {
      if (db.StudentProfile && typeof db.StudentProfile !== 'undefined') {
        includeOptions.push({
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
        });
      }
    } catch (e) {
      // StudentProfile model not available
    }
    
    try {
      if (db.FacultyProfile && typeof db.FacultyProfile !== 'undefined') {
        includeOptions.push({
          model: db.FacultyProfile,
          as: 'facultyProfile',
          required: false,
        });
      }
    } catch (e) {
      // FacultyProfile model not available
    }
    
    try {
      if (db.EmployeeProfile && typeof db.EmployeeProfile !== 'undefined') {
        includeOptions.push({
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false,
        });
      }
    } catch (e) {
      // EmployeeProfile model not available
    }

    const queryOptions: any = {
      where,
      attributes: { exclude: ['passwordHash'] },
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    };

    // Only add include if we have valid options
    if (includeOptions.length > 0) {
      queryOptions.include = includeOptions;
    }

    const { count, rows: users } = await db.User.findAndCountAll(queryOptions);

    logger.info(`Get all users: Found ${count} users with role=${role}, isActive=${isActive}`);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching users',
    });
  }
};

// GET /api/users/:id - Get user by ID
export const getUserById = async (
  req: AuthRequest & { params: { id: string } },
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

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can view their own profile, or admins can view any user
    if (req.user.userId !== userId && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own profile unless you are an admin',
      });
      return;
    }

    const includeOptions: any[] = [];
    
    // Only include profile models if they exist and are defined
    try {
      if (db.StudentProfile && typeof db.StudentProfile !== 'undefined') {
        includeOptions.push({
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
        });
      }
    } catch (e) {
      // StudentProfile model not available
    }
    
    try {
      if (db.FacultyProfile && typeof db.FacultyProfile !== 'undefined') {
        includeOptions.push({
          model: db.FacultyProfile,
          as: 'facultyProfile',
          required: false,
        });
      }
    } catch (e) {
      // FacultyProfile model not available
    }
    
    try {
      if (db.EmployeeProfile && typeof db.EmployeeProfile !== 'undefined') {
        includeOptions.push({
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false,
        });
      }
    } catch (e) {
      // EmployeeProfile model not available
    }

    const queryOptions: any = {
      attributes: { exclude: ['passwordHash'] },
    };

    // Only add include if we have valid options
    if (includeOptions.length > 0) {
      queryOptions.include = includeOptions;
    }

    const user = await db.User.findByPk(userId, queryOptions);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching user',
    });
  }
};

// PUT /api/users/:id - Update user
export const updateUser = async (
  req: AuthRequest & { params: { id: string }; body: { name?: string; email?: string; phone?: string; role?: string; isActive?: boolean; avatarUrl?: string } },
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

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can update their own profile (except role), or admins can update any user
    const isOwnProfile = req.user.userId === userId;
    const isAdmin = req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN;

    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile unless you are an admin',
      });
      return;
    }

    // Non-admins cannot change role
    if (req.body.role && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can change user roles',
      });
      return;
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Update user fields
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;
    if (req.body.isActive !== undefined && isAdmin) user.isActive = req.body.isActive;
    if (req.body.role !== undefined && isAdmin) user.role = req.body.role as UserRole;

    await user.save();

    // Fetch updated user with relations
    const includeOptions: any[] = [];
    if (db.StudentProfile) {
      includeOptions.push({ model: db.StudentProfile, as: 'studentProfile', required: false });
    }
    if (db.FacultyProfile) {
      includeOptions.push({ model: db.FacultyProfile, as: 'facultyProfile', required: false });
    }
    if (db.EmployeeProfile) {
      includeOptions.push({ model: db.EmployeeProfile, as: 'employeeProfile', required: false });
    }

    const updatedUser = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: includeOptions.length > 0 ? includeOptions : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error: any) {
    logger.error('Update user error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        status: 'error',
        message: 'Email already exists',
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating user',
    });
  }
};

// DELETE /api/users/:id - Delete user
export const deleteUser = async (
  req: AuthRequest & { params: { id: string } },
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

    // Only SuperAdmin and Admin can delete users
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete users',
      });
      return;
    }

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Prevent deleting own account
    if (req.user.userId === userId) {
      res.status(400).json({
        status: 'error',
        message: 'You cannot delete your own account',
      });
      return;
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    await user.destroy();

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting user',
    });
  }
};

// PUT /api/users/:id/student-profile - Update student profile
export const updateStudentProfile = async (
  req: AuthRequest & { params: { id: string }; body: { dob?: string; address?: string; photoUrl?: string; softwareList?: string[]; enrollmentDate?: string; status?: string; documents?: any } },
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

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can update their own profile, or admins can update any profile
    const isOwnProfile = req.user.userId === userId;
    const isAdmin = req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN;

    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile unless you are an admin',
      });
      return;
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (user.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: 'User is not a student',
      });
      return;
    }

    // Check if StudentProfile model exists
    if (!db.StudentProfile) {
      res.status(400).json({
        status: 'error',
        message: 'StudentProfile model is not available',
      });
      return;
    }

    // Get or create student profile
    let studentProfile = await db.StudentProfile.findOne({ where: { userId } });
    if (!studentProfile) {
      studentProfile = await db.StudentProfile.create({ userId });
    }

    // Update profile fields
    if (req.body.dob !== undefined) studentProfile.dob = req.body.dob ? new Date(req.body.dob) : null;
    if (req.body.address !== undefined) studentProfile.address = req.body.address;
    if (req.body.photoUrl !== undefined) studentProfile.photoUrl = req.body.photoUrl;
    if (req.body.softwareList !== undefined) studentProfile.softwareList = req.body.softwareList;
    if (req.body.enrollmentDate !== undefined) studentProfile.enrollmentDate = req.body.enrollmentDate ? new Date(req.body.enrollmentDate) : null;
    if (req.body.status !== undefined) studentProfile.status = req.body.status;
    if (req.body.documents !== undefined) studentProfile.documents = req.body.documents;

    await studentProfile.save();

    // Fetch updated user with profile
    const updatedUser = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: db.StudentProfile ? [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
        },
      ] : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'Student profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('Update student profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating student profile',
    });
  }
};

// PUT /api/users/:id/faculty-profile - Update faculty profile
export const updateFacultyProfile = async (
  req: AuthRequest & { params: { id: string }; body: { expertise?: string; availability?: string } },
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

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can update their own profile, or admins can update any profile
    const isOwnProfile = req.user.userId === userId;
    const isAdmin = req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN;

    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile unless you are an admin',
      });
      return;
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (user.role !== UserRole.FACULTY) {
      res.status(400).json({
        status: 'error',
        message: 'User is not a faculty member',
      });
      return;
    }

    // Check if FacultyProfile model exists
    if (!db.FacultyProfile) {
      res.status(400).json({
        status: 'error',
        message: 'FacultyProfile model is not available',
      });
      return;
    }

    // Get or create faculty profile
    let facultyProfile = await db.FacultyProfile.findOne({ where: { userId } });
    if (!facultyProfile) {
      facultyProfile = await db.FacultyProfile.create({ userId });
    }

    // Update profile fields
    if (req.body.expertise !== undefined) facultyProfile.expertise = req.body.expertise;
    if (req.body.availability !== undefined) facultyProfile.availability = req.body.availability;

    await facultyProfile.save();

    // Fetch updated user with profile
    const updatedUser = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: db.FacultyProfile ? [
        {
          model: db.FacultyProfile,
          as: 'facultyProfile',
          required: false,
        },
      ] : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'Faculty profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('Update faculty profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating faculty profile',
    });
  }
};

// PUT /api/users/:id/employee-profile - Update employee profile
export const updateEmployeeProfile = async (
  req: AuthRequest & { params: { id: string }; body: { 
    employeeId?: string;
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

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Users can update their own profile, or admins can update any profile
    const isOwnProfile = req.user.userId === userId;
    const isAdmin = req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN;

    if (!isOwnProfile && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own profile unless you are an admin',
      });
      return;
    }

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

    // Get or create employee profile
    let employeeProfile = await db.EmployeeProfile.findOne({ where: { userId } });
    if (!employeeProfile) {
      const generatedEmployeeId =
        (req.body.employeeId ? String(req.body.employeeId) : `EMP-${userId}-${Date.now()}`);
      employeeProfile = await db.EmployeeProfile.create({
        userId,
        employeeId: generatedEmployeeId,
      });
    }

    // Update profile fields
    if (req.body.employeeId !== undefined) employeeProfile.employeeId = req.body.employeeId;
    if (req.body.gender !== undefined) employeeProfile.gender = req.body.gender;
    if (req.body.dateOfBirth !== undefined) employeeProfile.dateOfBirth = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null;
    if (req.body.nationality !== undefined) employeeProfile.nationality = req.body.nationality;
    if (req.body.maritalStatus !== undefined) employeeProfile.maritalStatus = req.body.maritalStatus;
    if (req.body.department !== undefined) employeeProfile.department = req.body.department;
    if (req.body.designation !== undefined) employeeProfile.designation = req.body.designation;
    if (req.body.dateOfJoining !== undefined) employeeProfile.dateOfJoining = req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : null;
    if (req.body.employmentType !== undefined) employeeProfile.employmentType = req.body.employmentType;
    if (req.body.reportingManager !== undefined) employeeProfile.reportingManager = req.body.reportingManager;
    if (req.body.workLocation !== undefined) employeeProfile.workLocation = req.body.workLocation;
    if (req.body.bankName !== undefined) employeeProfile.bankName = req.body.bankName;
    if (req.body.accountNumber !== undefined) employeeProfile.accountNumber = req.body.accountNumber;
    if (req.body.ifscCode !== undefined) employeeProfile.ifscCode = req.body.ifscCode;
    if (req.body.branch !== undefined) employeeProfile.branch = req.body.branch;
    if (req.body.panNumber !== undefined) employeeProfile.panNumber = req.body.panNumber;
    if (req.body.city !== undefined) employeeProfile.city = req.body.city;
    if (req.body.state !== undefined) employeeProfile.state = req.body.state;
    if (req.body.postalCode !== undefined) employeeProfile.postalCode = req.body.postalCode;

    await employeeProfile.save();

    // Fetch updated user with profile
    const updatedUser = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
      include: db.EmployeeProfile ? [
        {
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false,
        },
      ] : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'Employee profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('Update employee profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating employee profile',
    });
  }
};

// POST /api/users/:id/login-as - Login as another user (SuperAdmin only)
export const loginAsUser = async (
  req: AuthRequest & { params: { id: string } },
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

    // Only SuperAdmin can login as other users
    if (req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only SuperAdmin can login as other users',
      });
      return;
    }

    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
      return;
    }

    // Find target user
    const targetUser = await db.User.findByPk(targetUserId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!targetUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if target user is active
    if (!targetUser.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot login as inactive user',
      });
      return;
    }

    // Generate token for target user
    const token = generateToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged in as user successfully',
      data: {
        token,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          phone: targetUser.phone,
          role: targetUser.role,
          isActive: targetUser.isActive,
        },
      },
    });
  } catch (error) {
    logger.error('Login as user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while logging in as user',
    });
  }
};

