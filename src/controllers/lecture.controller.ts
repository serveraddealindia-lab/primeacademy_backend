import { Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export const addDelayReason = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const sessionId = Number(req.body?.sessionId);
    const delayReason = (req.body?.delay_reason ?? req.body?.delayReason ?? '').toString().trim();

    if (!sessionId || Number.isNaN(sessionId)) {
      res.status(400).json({ status: 'error', message: 'sessionId is required' });
      return;
    }
    if (!delayReason) {
      res.status(400).json({ status: 'error', message: 'delay_reason is required' });
      return;
    }

    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    if (req.user.role === 'faculty' && session.facultyId !== req.user.userId) {
      res.status(403).json({ status: 'error', message: 'Not allowed to update this lecture' });
      return;
    }

    await session.update({ delayReason } as any);

    res.status(200).json({
      status: 'success',
      message: 'Delay reason saved',
      data: { sessionId: session.id, delayReason },
    });
  } catch (error) {
    logger.error('Add delay reason failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to save delay reason' });
  }
};

