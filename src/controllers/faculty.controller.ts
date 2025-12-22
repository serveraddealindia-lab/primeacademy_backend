import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

// POST /api/faculty - Create faculty profile
export const createFaculty = async (
  req: AuthRequest & { body: { 
    userId: number; 
    expertise?: string; 
    availability?: string;
    documents?: any;
    softwareProficiency?: string;
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

    const { userId, expertise, availability, documents, softwareProficiency } = req.body;

    // Validation
    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'userId is required',
      });
      return;
    }

    // Verify user exists and has faculty role
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
        message: 'User must have faculty role. Please update user role to faculty first.',
      });
      return;
    }

    // Check if faculty profile already exists
    const existingProfile = await db.FacultyProfile.findOne({ where: { userId } });
    if (existingProfile) {
      res.status(409).json({
        status: 'error',
        message: 'Faculty profile already exists for this user',
      });
      return;
    }

    // Validate required fields from documents
    if (documents) {
      const { personalInfo, employmentInfo, bankInfo, emergencyInfo } = documents;
      
      // Validate personal information
      if (personalInfo) {
        if (!personalInfo.gender) {
          res.status(400).json({
            status: 'error',
            message: 'Gender is required',
          });
          return;
        }
        if (!personalInfo.dateOfBirth) {
          res.status(400).json({
            status: 'error',
            message: 'Date of Birth is required',
          });
          return;
        }
        if (!personalInfo.nationality) {
          res.status(400).json({
            status: 'error',
            message: 'Nationality is required',
          });
          return;
        }
        if (!personalInfo.maritalStatus) {
          res.status(400).json({
            status: 'error',
            message: 'Marital Status is required',
          });
          return;
        }
        if (!personalInfo.address) {
          res.status(400).json({
            status: 'error',
            message: 'Address is required',
          });
          return;
        }
        if (!personalInfo.city) {
          res.status(400).json({
            status: 'error',
            message: 'City is required',
          });
          return;
        }
        if (!personalInfo.state) {
          res.status(400).json({
            status: 'error',
            message: 'State is required',
          });
          return;
        }
        if (!personalInfo.postalCode) {
          res.status(400).json({
            status: 'error',
            message: 'Postal Code is required',
          });
          return;
        }
      }

      // Validate employment information
      if (employmentInfo) {
        if (!employmentInfo.department) {
          res.status(400).json({
            status: 'error',
            message: 'Department is required',
          });
          return;
        }
        if (!employmentInfo.designation) {
          res.status(400).json({
            status: 'error',
            message: 'Designation is required',
          });
          return;
        }
        if (!employmentInfo.dateOfJoining) {
          res.status(400).json({
            status: 'error',
            message: 'Date of Joining is required',
          });
          return;
        }
        if (!employmentInfo.employmentType) {
          res.status(400).json({
            status: 'error',
            message: 'Employment Type is required',
          });
          return;
        }
        if (!employmentInfo.workLocation) {
          res.status(400).json({
            status: 'error',
            message: 'Work Location is required',
          });
          return;
        }
      }

      // Validate bank information
      if (bankInfo) {
        if (!bankInfo.bankName) {
          res.status(400).json({
            status: 'error',
            message: 'Bank Name is required',
          });
          return;
        }
        if (!bankInfo.accountNumber) {
          res.status(400).json({
            status: 'error',
            message: 'Account Number is required',
          });
          return;
        }
        if (!bankInfo.ifscCode) {
          res.status(400).json({
            status: 'error',
            message: 'IFSC Code is required',
          });
          return;
        }
        if (!bankInfo.branch) {
          res.status(400).json({
            status: 'error',
            message: 'Branch is required',
          });
          return;
        }
        if (!bankInfo.panNumber) {
          res.status(400).json({
            status: 'error',
            message: 'PAN Number is required',
          });
          return;
        }
        // Validate PAN format (10 characters, alphanumeric)
        if (bankInfo.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(bankInfo.panNumber.toUpperCase())) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid PAN Number format. PAN should be 10 characters (e.g., ABCDE1234F)',
          });
          return;
        }
        // Validate IFSC format (11 characters)
        if (bankInfo.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankInfo.ifscCode.toUpperCase())) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid IFSC Code format. IFSC should be 11 characters (e.g., ABCD0123456)',
          });
          return;
        }
      }

      // Validate emergency contact information
      if (emergencyInfo) {
        if (!emergencyInfo.emergencyContactName) {
          res.status(400).json({
            status: 'error',
            message: 'Emergency Contact Name is required',
          });
          return;
        }
        if (!emergencyInfo.emergencyRelationship) {
          res.status(400).json({
            status: 'error',
            message: 'Emergency Relationship is required',
          });
          return;
        }
        if (!emergencyInfo.emergencyPhoneNumber) {
          res.status(400).json({
            status: 'error',
            message: 'Emergency Phone Number is required',
          });
          return;
        }
        // Validate phone number format (10 digits)
        if (emergencyInfo.emergencyPhoneNumber && !/^[0-9]{10}$/.test(emergencyInfo.emergencyPhoneNumber.replace(/[\s-]/g, ''))) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid Emergency Phone Number format. Please enter a valid 10-digit phone number',
          });
          return;
        }
      }
    }

    // Validate expertise and availability
    if (!expertise || expertise.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Expertise/Specialization is required',
      });
      return;
    }

    if (!availability || availability.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Availability is required',
      });
      return;
    }

    // Prepare documents object with software proficiency
    let documentsData = documents || {};
    if (softwareProficiency) {
      documentsData.softwareProficiency = softwareProficiency;
    }

    // Create faculty profile
    const facultyProfile = await db.FacultyProfile.create({
      userId,
      expertise: typeof expertise === 'string' ? { description: expertise } : expertise,
      availability: typeof availability === 'string' ? { schedule: availability } : availability,
      documents: Object.keys(documentsData).length > 0 ? documentsData : null,
    });

    // Fetch the created profile with user information
    const profileWithUser = await db.FacultyProfile.findByPk(facultyProfile.id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      message: 'Faculty profile created successfully',
      data: {
        facultyProfile: {
          id: profileWithUser?.id,
          userId: profileWithUser?.userId,
          expertise: profileWithUser?.expertise,
          availability: profileWithUser?.availability,
          user: (profileWithUser as any)?.user,
          createdAt: profileWithUser?.createdAt,
          updatedAt: profileWithUser?.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create faculty error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating faculty profile',
    });
  }
};

// PUT /api/faculty/:id - Update faculty profile
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

    const facultyProfileId = parseInt(req.params.id, 10);
    if (isNaN(facultyProfileId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid faculty profile ID',
      });
      return;
    }

    const { expertise, availability } = req.body;

    // Find faculty profile
    const facultyProfile = await db.FacultyProfile.findByPk(facultyProfileId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
        },
      ],
    });

    if (!facultyProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Faculty profile not found',
      });
      return;
    }

    // Check permissions: users can update their own profile, admins can update any
    if (
      req.user.userId !== facultyProfile.userId &&
      req.user.role !== UserRole.SUPERADMIN &&
      req.user.role !== UserRole.ADMIN
    ) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your own faculty profile unless you are an admin',
      });
      return;
    }

    // Update fields
    if (expertise !== undefined) {
      facultyProfile.expertise = expertise || null;
    }
    if (availability !== undefined) {
      facultyProfile.availability = availability || null;
    }

    await facultyProfile.save();

    // Fetch updated profile with user
    const updatedProfile = await db.FacultyProfile.findByPk(facultyProfile.id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      message: 'Faculty profile updated successfully',
      data: {
        facultyProfile: {
          id: updatedProfile?.id,
          userId: updatedProfile?.userId,
          expertise: updatedProfile?.expertise,
          availability: updatedProfile?.availability,
          user: (updatedProfile as any)?.user,
          createdAt: updatedProfile?.createdAt,
          updatedAt: updatedProfile?.updatedAt,
        },
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



