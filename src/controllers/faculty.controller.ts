import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

// POST /api/faculty - Create faculty profile
export const createFaculty = async (
  req: AuthRequest & { body: { userId: number; expertise?: string; availability?: string } },
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

    const { userId, expertise, availability } = req.body;

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

    // Create faculty profile
    const facultyProfile = await db.FacultyProfile.create({
      userId,
      expertise: expertise || null,
      availability: availability || null,
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
          user: profileWithUser?.user,
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
          user: updatedProfile?.user,
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

