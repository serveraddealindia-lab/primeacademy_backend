import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';

// GET /courses → Get all courses
export const getAllCourses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await db.Course.findAll({
      order: [['name', 'ASC']],
    });

    // Ensure software is always an array
    const normalizedCourses = courses.map((course: any) => {
      let software = course.software;
      if (typeof software === 'string') {
        // If it's a string, try to parse it or split by comma
        try {
          software = JSON.parse(software);
        } catch {
          software = software.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
      }
      if (!Array.isArray(software)) {
        software = [];
      }
      return {
        ...course.toJSON(),
        software,
      };
    });

    res.status(200).json({
      status: 'success',
      data: normalizedCourses,
    });
  } catch (error) {
    logger.error('Get all courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching courses',
    });
  }
};

// GET /courses/:id → Get course by ID
export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid course ID',
      });
      return;
    }

    const course = await db.Course.findByPk(courseId);
    if (!course) {
      res.status(404).json({
        status: 'error',
        message: 'Course not found',
      });
      return;
    }

    // Ensure software is always an array
    let software = (course as any).software;
    if (typeof software === 'string') {
      try {
        software = JSON.parse(software);
      } catch {
        software = software.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
    }
    if (!Array.isArray(software)) {
      software = [];
    }

    res.status(200).json({
      status: 'success',
      data: { 
        course: {
          ...course.toJSON(),
          software,
        }
      },
    });
  } catch (error) {
    logger.error('Get course by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching course',
    });
  }
};

// POST /courses → Create course (admin only)
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can create courses
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create courses',
      });
      return;
    }

    const { name, software } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Course name is required',
      });
      return;
    }

    if (!software || !Array.isArray(software) || software.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one software is required',
      });
      return;
    }

    // Check if course with same name exists
    const existingCourse = await db.Course.findOne({ where: { name: name.trim() } });
    if (existingCourse) {
      res.status(400).json({
        status: 'error',
        message: 'Course with this name already exists',
      });
      return;
    }

    const course = await db.Course.create({
      name: name.trim(),
      software: software.map((s: string) => s.trim()).filter((s: string) => s),
    });

    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
      data: { course },
    });
  } catch (error) {
    logger.error('Create course error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating course',
    });
  }
};

// PUT /courses/:id → Update course (admin only)
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can update courses
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update courses',
      });
      return;
    }

    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid course ID',
      });
      return;
    }

    const course = await db.Course.findByPk(courseId);
    if (!course) {
      res.status(404).json({
        status: 'error',
        message: 'Course not found',
      });
      return;
    }

    const { name, software } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      res.status(400).json({
        status: 'error',
        message: 'Course name cannot be empty',
      });
      return;
    }

    if (software !== undefined && (!Array.isArray(software) || software.length === 0)) {
      res.status(400).json({
        status: 'error',
        message: 'At least one software is required',
      });
      return;
    }

    // Check if new name conflicts with existing course
    if (name && name.trim() !== course.name) {
      const existingCourse = await db.Course.findOne({ where: { name: name.trim() } });
      if (existingCourse) {
        res.status(400).json({
          status: 'error',
          message: 'Course with this name already exists',
        });
        return;
      }
    }

    await course.update({
      name: name !== undefined ? name.trim() : course.name,
      software: software !== undefined ? software.map((s: string) => s.trim()).filter((s: string) => s) : course.software,
    });

    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: { course },
    });
  } catch (error) {
    logger.error('Update course error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating course',
    });
  }
};

// DELETE /courses/:id → Delete course (admin only)
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can delete courses
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete courses',
      });
      return;
    }

    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid course ID',
      });
      return;
    }

    const course = await db.Course.findByPk(courseId);
    if (!course) {
      res.status(404).json({
        status: 'error',
        message: 'Course not found',
      });
      return;
    }

    await course.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Course deleted successfully',
    });
  } catch (error) {
    logger.error('Delete course error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting course',
    });
  }
};

