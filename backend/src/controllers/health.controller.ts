import { Request, Response } from 'express';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
};

