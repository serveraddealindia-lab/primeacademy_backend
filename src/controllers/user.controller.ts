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
    let limitNum = parseInt(limit, 10);
    
    // Cap limit at 10000 to prevent performance issues
    if (limitNum > 10000) {
      limitNum = 10000;
      logger.warn(`Limit capped at 10000, requested: ${limit}`);
    }
    
    // If limit is very high, don't use pagination
    const offset = limitNum > 1000 ? 0 : (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const includeOptions: any[] = [];
    
    // Only include profile models if they exist and are defined
    // Include profiles based on the role being queried for better performance
    try {
      if (role === 'student' || !role) {
        if (db.StudentProfile && typeof db.StudentProfile !== 'undefined') {
          includeOptions.push({
            model: db.StudentProfile,
            as: 'studentProfile',
            required: false,
          });
        }
      }
    } catch (e) {
      logger.warn('StudentProfile model not available for include:', e);
    }
    
    try {
      if (role === 'faculty' || !role) {
        if (db.FacultyProfile && typeof db.FacultyProfile !== 'undefined') {
          includeOptions.push({
            model: db.FacultyProfile,
            as: 'facultyProfile',
            required: false,
          });
        }
      }
    } catch (e) {
      logger.warn('FacultyProfile model not available for include:', e);
    }
    
    try {
      if (role === 'employee' || !role) {
        if (db.EmployeeProfile && typeof db.EmployeeProfile !== 'undefined') {
          includeOptions.push({
            model: db.EmployeeProfile,
            as: 'employeeProfile',
            required: false,
          });
        }
      }
    } catch (e) {
      logger.warn('EmployeeProfile model not available for include:', e);
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

    logger.info(`Querying users with options: ${JSON.stringify({ where, limit: limitNum, offset, includeCount: includeOptions.length })}`);

    let count: number;
    let users: any[];
    
    try {
      const result = await db.User.findAndCountAll(queryOptions);
      count = result.count;
      users = result.rows;
    } catch (queryError: any) {
      logger.error('Database query error in getAllUsers:', queryError);
      logger.error('Query options:', JSON.stringify(queryOptions, null, 2));
      
      // Try without includes if query fails
      if (includeOptions.length > 0) {
        logger.info('Retrying query without includes...');
        const simpleQueryOptions = {
          where,
          attributes: { exclude: ['passwordHash'] },
          limit: limitNum,
          offset,
          order: [['createdAt', 'DESC']] as any,
        } as any;
        const result = await db.User.findAndCountAll(simpleQueryOptions);
        count = result.count;
        users = result.rows;
        logger.warn('Query succeeded without includes. Profile data may be missing.');
      } else {
        throw queryError;
      }
    }

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
  } catch (error: any) {
    logger.error('Get all users error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error message:', error?.message);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    } catch (e: any) {
      logger.warn('StudentProfile model not available for include:', e?.message);
    }
    
    try {
      if (db.FacultyProfile && typeof db.FacultyProfile !== 'undefined') {
        includeOptions.push({
          model: db.FacultyProfile,
          as: 'facultyProfile',
          required: false,
        });
      }
    } catch (e: any) {
      logger.warn('FacultyProfile model not available for include:', e?.message);
    }
    
    try {
      if (db.EmployeeProfile && typeof db.EmployeeProfile !== 'undefined') {
        includeOptions.push({
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false,
        });
      }
    } catch (e: any) {
      logger.warn('EmployeeProfile model not available for include:', e?.message);
    }

    // Include enrollments for students
    try {
      if (db.Enrollment && typeof db.Enrollment !== 'undefined') {
        includeOptions.push({
          model: db.Enrollment,
          as: 'enrollments',
          required: false,
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule'],
              required: false,
            },
          ],
        });
      }
    } catch (e: any) {
      logger.warn('Enrollment model not available for include:', e?.message);
    }

    const queryOptions: any = {
      attributes: { exclude: ['passwordHash'] },
    };

    // Only add include if we have valid options
    if (includeOptions.length > 0) {
      queryOptions.include = includeOptions;
    }

    logger.info(`Fetching user ${userId} with includes: ${includeOptions.map((inc: any) => inc.as).join(', ')}`);

    let user;
    try {
      user = await db.User.findByPk(userId, queryOptions);
    } catch (queryError: any) {
      logger.error('Database query error in getUserById:', queryError);
      logger.error('Query error details:', {
        message: queryError?.message,
        sql: queryError?.sql,
        original: queryError?.original,
      });
      
      // Try without includes if query fails
      try {
        logger.warn('Retrying getUserById without includes due to query error');
        user = await db.User.findByPk(userId, {
          attributes: { exclude: ['passwordHash'] },
        });
        
        // Try to fetch profile separately if user is found
        if (user) {
          // Fetch employee profile
          if (user.role === 'employee' && db.EmployeeProfile) {
            try {
              const employeeProfile = await db.EmployeeProfile.findOne({ where: { userId: user.id } });
              if (employeeProfile) {
                (user as any).employeeProfile = employeeProfile;
              }
            } catch (profileError: any) {
              logger.warn('Failed to fetch employee profile separately:', profileError?.message);
            }
          }
          
          // Fetch student profile
          if (user.role === 'student' && db.StudentProfile) {
            try {
              const studentProfile = await db.StudentProfile.findOne({ where: { userId: user.id } });
              if (studentProfile) {
                (user as any).studentProfile = studentProfile;
              }
            } catch (profileError: any) {
              logger.warn('Failed to fetch student profile separately:', profileError?.message);
            }
          }
          
          // Fetch faculty profile
          if (user.role === 'faculty' && db.FacultyProfile) {
            try {
              const facultyProfile = await db.FacultyProfile.findOne({ where: { userId: user.id } });
              if (facultyProfile) {
                (user as any).facultyProfile = facultyProfile;
              }
            } catch (profileError: any) {
              logger.warn('Failed to fetch faculty profile separately:', profileError?.message);
            }
          }
          
          // Fetch enrollments separately for students
          if (user.role === 'student' && db.Enrollment) {
            try {
              const enrollments = await db.Enrollment.findAll({
                where: { studentId: user.id },
                include: db.Batch ? [
                  {
                    model: db.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule'],
                    required: false,
                  },
                ] : undefined,
                limit: 50, // Limit to prevent huge queries
              });
              if (enrollments && enrollments.length > 0) {
                (user as any).enrollments = enrollments;
              }
            } catch (enrollmentError: any) {
              logger.warn('Failed to fetch enrollments separately:', enrollmentError?.message);
            }
          }
        }
      } catch (fallbackError: any) {
        logger.error('Fallback query also failed:', fallbackError);
        throw new Error(`Failed to fetch user: ${fallbackError.message}`);
      }
    }

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
  } catch (error: any) {
    logger.error('Get user by ID error:', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching user',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
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
    try {
      if (db.StudentProfile) {
        includeOptions.push({ model: db.StudentProfile, as: 'studentProfile', required: false });
      }
    } catch (e) {
      // StudentProfile not available
    }
    try {
      if (db.FacultyProfile) {
        includeOptions.push({ model: db.FacultyProfile, as: 'facultyProfile', required: false });
      }
    } catch (e) {
      // FacultyProfile not available
    }
    try {
      if (db.EmployeeProfile) {
        includeOptions.push({ model: db.EmployeeProfile, as: 'employeeProfile', required: false });
      }
    } catch (e) {
      // EmployeeProfile not available
    }

    let updatedUser;
    try {
      updatedUser = await db.User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] },
        include: includeOptions.length > 0 ? includeOptions : undefined,
      });
    } catch (queryError: any) {
      logger.error('Error fetching updated user with relations:', queryError);
      // Fallback: fetch without relations
      updatedUser = await db.User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error: any) {
    logger.error('Update user error:', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.parent?.code,
      sql: error?.parent?.sql,
    });
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
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
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
  req: AuthRequest & { params: { id: string }; body: { expertise?: string; availability?: string; documents?: any; softwareProficiency?: string } },
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
    if (req.body.expertise !== undefined) {
      // Handle both string and object formats
      if (typeof req.body.expertise === 'string') {
        facultyProfile.expertise = { description: req.body.expertise };
      } else if (req.body.expertise !== null) {
        facultyProfile.expertise = req.body.expertise;
      } else {
        facultyProfile.expertise = null;
      }
    }
    if (req.body.availability !== undefined) {
      // Handle both string and object formats
      if (typeof req.body.availability === 'string') {
        facultyProfile.availability = { schedule: req.body.availability };
      } else if (req.body.availability !== null) {
        facultyProfile.availability = req.body.availability;
      } else {
        facultyProfile.availability = null;
      }
    }
    
    // Handle documents field - ensure it's a valid object
    if (req.body.documents !== undefined) {
      try {
        let documentsData = req.body.documents;
        
        // If documents is a string, try to parse it
        if (typeof documentsData === 'string') {
          try {
            documentsData = JSON.parse(documentsData);
          } catch (parseError) {
            logger.warn('Failed to parse documents string:', parseError);
            documentsData = {};
          }
        }
        
        // Ensure documents is an object or null
        if (documentsData === null || (typeof documentsData === 'object' && !Array.isArray(documentsData))) {
          // Deep clone to avoid circular references and ensure it's serializable
          try {
            // Use JSON parse/stringify to ensure clean serializable object
            const serialized = JSON.parse(JSON.stringify(documentsData));
            facultyProfile.documents = serialized;
          } catch (serializeError: any) {
            logger.error('Error serializing documents:', serializeError);
            // If serialization fails, try to clean the object
            const cleaned = Object.keys(documentsData).reduce((acc: any, key) => {
              try {
                const value = documentsData[key];
                // Only include serializable values
                if (value !== undefined && typeof value !== 'function') {
                  acc[key] = value;
                }
              } catch (e) {
                logger.warn(`Skipping non-serializable key: ${key}`);
              }
              return acc;
            }, {});
            facultyProfile.documents = cleaned;
          }
        } else {
          logger.warn('Invalid documents format, using empty object');
          facultyProfile.documents = {};
        }
      } catch (docError: any) {
        logger.error('Error processing documents field:', docError);
        logger.error('Documents data that caused error:', JSON.stringify(req.body.documents, null, 2));
        // Keep existing documents if there's an error
        if (!facultyProfile.documents) {
          facultyProfile.documents = {};
        }
      }
    }
    
    // Handle softwareProficiency if sent separately (though it should be in documents)
    if (req.body.softwareProficiency !== undefined && req.body.documents === undefined) {
      // If documents not provided, merge softwareProficiency into existing documents
      const existingDocuments = facultyProfile.documents || {};
      facultyProfile.documents = {
        ...existingDocuments,
        softwareProficiency: req.body.softwareProficiency,
      };
    }

    // Log what we're about to save for debugging
    logger.info('Saving faculty profile:', {
      userId,
      hasExpertise: !!facultyProfile.expertise,
      hasAvailability: !!facultyProfile.availability,
      hasDocuments: !!facultyProfile.documents,
      documentsKeys: facultyProfile.documents ? Object.keys(facultyProfile.documents) : [],
    });

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
  } catch (error: any) {
    logger.error('Update faculty profile error:', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      userId: req.params.id,
      body: req.body,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating faculty profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

    // Handle documents field (e.g., emergencyContact, photo, etc.)
    if ((req as any).body.documents !== undefined) {
      try {
        let documentsData = (req as any).body.documents;

        // If documents is a string, try to parse it
        if (typeof documentsData === 'string') {
          try {
            documentsData = JSON.parse(documentsData);
          } catch (parseError) {
            logger.warn('Failed to parse employee documents string:', parseError);
            documentsData = {};
          }
        }

        // Ensure documents is an object or null
        if (documentsData === null || (typeof documentsData === 'object' && !Array.isArray(documentsData))) {
          try {
            const serialized = JSON.parse(JSON.stringify(documentsData));
            (employeeProfile as any).documents = serialized;
          } catch (serializeError: any) {
            logger.error('Error serializing employee documents:', serializeError);
            const cleaned = Object.keys(documentsData).reduce((acc: any, key) => {
              try {
                const value = (documentsData as any)[key];
                if (value !== undefined && typeof value !== 'function') {
                  acc[key] = value;
                }
              } catch {
                logger.warn(`Skipping non-serializable employee documents key: ${key}`);
              }
              return acc;
            }, {});
            (employeeProfile as any).documents = cleaned;
          }
        } else {
          logger.warn('Invalid employee documents format, using empty object');
          (employeeProfile as any).documents = {};
        }
      } catch (docError: any) {
        logger.error('Error processing employee documents field:', docError);
        logger.error('Employee documents data that caused error:', JSON.stringify((req as any).body.documents, null, 2));
        if (!(employeeProfile as any).documents) {
          (employeeProfile as any).documents = {};
        }
      }
    }

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

// GET /api/users/modules/list - Get list of available modules
export const getModulesList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Module labels mapping
    const moduleLabels: Record<string, string> = {
      batches: 'Batches',
      students: 'Students',
      faculty: 'Faculty',
      employees: 'Employees',
      sessions: 'Sessions',
      attendance: 'Attendance',
      payments: 'Payments',
      portfolios: 'Portfolios',
      reports: 'Reports',
      approvals: 'Approvals',
      users: 'Users',
      software_completions: 'Software Completions',
      student_leaves: 'Student Leaves',
      batch_extensions: 'Batch Extensions',
      employee_leaves: 'Employee Leaves',
      faculty_leaves: 'Faculty Leaves',
    };

    // Get all modules from RolePermission enum
    const { Module } = await import('../models/RolePermission');
    const modules = Object.values(Module).map((module) => ({
      value: module,
      label: moduleLabels[module] || module.charAt(0).toUpperCase() + module.slice(1).replace(/_/g, ' '),
    }));

    res.status(200).json({
      status: 'success',
      data: {
        modules,
      },
    });
  } catch (error) {
    logger.error('Get modules list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching modules list',
    });
  }
};

