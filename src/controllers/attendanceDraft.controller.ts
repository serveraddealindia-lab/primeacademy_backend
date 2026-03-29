import { Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return parseNumber(value[0]);
  if (typeof value === 'object') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const saveDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const sessionId = parseNumber(req.body?.sessionId);
    const payload = req.body?.payload;

    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'sessionId is required' });
      return;
    }
    if (payload === undefined) {
      res.status(400).json({ status: 'error', message: 'payload is required' });
      return;
    }

    // Ensure session exists and belongs to this faculty (or admin/superadmin)
    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (req.user.role === 'faculty' && session.facultyId !== req.user.userId) {
      res.status(403).json({ status: 'error', message: 'Not allowed to save draft for this session' });
      return;
    }

    const draft = await db.AttendanceDraft.upsert({
      sessionId,
      facultyId: req.user.userId,
      payload,
    });

    res.status(200).json({
      status: 'success',
      message: 'Draft saved',
      data: {
        id: (draft as any).id,
        sessionId,
        updatedAt: (draft as any).updatedAt,
      },
    });
  } catch (error) {
    logger.error('Save attendance draft failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to save draft' });
  }
};

export const getDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const sessionId = parseNumber(req.query.sessionId);
    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'sessionId is required' });
      return;
    }

    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (req.user.role === 'faculty' && session.facultyId !== req.user.userId) {
      res.status(403).json({ status: 'error', message: 'Not allowed to view draft for this session' });
      return;
    }

    const draft = await db.AttendanceDraft.findOne({
      where: { sessionId, facultyId: req.user.userId },
      order: [['updatedAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: draft
        ? {
            sessionId,
            payload: (draft as any).payload,
            updatedAt: (draft as any).updatedAt,
          }
        : null,
    });
  } catch (error) {
    logger.error('Get attendance draft failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch draft' });
  }
};

