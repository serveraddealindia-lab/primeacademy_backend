import { Op } from 'sequelize';
import db from '../models';
import { logger } from './logger';

// Helper function to generate automatic serial number
export const generateSerialNumber = async (): Promise<string | null> => {
  try {
    if (!db.StudentProfile) {
      return null;
    }

    // Find all profiles with serialNo to get the maximum number
    // We need to get all and find max numerically since serialNo is stored as string
    const allProfiles = await db.StudentProfile.findAll({
      where: {
        serialNo: { [Op.ne]: null },
      },
      attributes: ['serialNo'],
    });

    let nextNumber = 1;
    if (allProfiles.length > 0) {
      // Extract numbers from all serialNos and find the maximum
      const numbers = allProfiles
        .map(profile => {
          const serialNo = profile.serialNo || '';
          // Try to parse as integer first (for simple numbers like "1", "2")
          const parsedInt = parseInt(serialNo, 10);
          if (!isNaN(parsedInt)) {
            return parsedInt;
          }
          // If not a simple number, try to extract number from end (e.g., "PA-STU-0001" -> 1)
          const match = serialNo.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    // Format: Simple number as string "1", "2", "3", etc.
    const serialNo = String(nextNumber);

    // Double-check uniqueness (in case of race condition)
    const exists = await db.StudentProfile.findOne({
      where: { serialNo },
    });

    if (exists) {
      // If exists, try next number
      return String(nextNumber + 1);
    }

    return serialNo;
  } catch (error: any) {
    // If serialNo column doesn't exist, return null (no error)
    if (error?.name === 'SequelizeDatabaseError' || 
        error?.parent?.code === 'ER_BAD_FIELD_ERROR' ||
        error?.message?.includes('Unknown column') ||
        error?.message?.includes('serialNo')) {
      logger.warn('serialNo column may not exist, skipping auto-generation');
      return null;
    }
    logger.error('Error generating serial number:', error);
    return null;
  }
};

