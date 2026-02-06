import { Response } from 'express';
import db from '../../models';
import { logger } from '../../utils/logger';
import * as eBioServerService from './eBioServer.service';

/**
 * POST /api/biometric/eBioServer/webhook
 * Handle webhook from eBioServer device
 * This endpoint should be publicly accessible
 */
export const handleWebhook = async (
  req: {
    body: any;
  },
  res: Response
): Promise<void> => {
  try {
    const payload = req.body;
    
    // Validate required fields
    if (!payload.emp_code || !payload.datetime) {
      res.status(400).json({
        status: 'error',
        message: 'Required fields missing: emp_code and datetime are required',
      });
      return;
    }

    // Process the webhook
    const attendanceLog = await eBioServerService.handleEBioServerWebhook(payload);

    res.status(200).json({
      status: 'success',
      message: 'Attendance log received and processed',
      data: { 
        logId: attendanceLog?.id || null,
        employeeId: attendanceLog?.employeeId || null
      },
    });
  } catch (error: any) {
    logger.error('eBioServer webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/biometric/eBioServer/device
 * Register a new eBioServer device
 */
export const registerDevice = async (
  req: {
    body: {
      deviceName: string;
      ipAddress: string;
      port: number;
      authKey?: string;
    };
  },
  res: Response
): Promise<void> => {
  try {
    const { deviceName, ipAddress, port, authKey } = req.body;

    if (!deviceName || !ipAddress || !port) {
      res.status(400).json({
        status: 'error',
        message: 'Device name, IP address, and port are required',
      });
      return;
    }

    const device = await eBioServerService.registerEBioServerDevice(deviceName, ipAddress, port, authKey);

    res.status(201).json({
      status: 'success',
      message: 'eBioServer device registered successfully',
      data: device,
    });
  } catch (error: any) {
    logger.error('Register eBioServer device error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while registering device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/biometric/eBioServer/device/:id/sync-templates
 * Sync employee templates from eBioServer device
 */
export const syncTemplates = async (
  req: { 
    params: { id: string } 
  },
  res: Response
): Promise<void> => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid device ID',
      });
      return;
    }

    const result = await eBioServerService.syncEmployeeTemplates(deviceId);

    res.status(200).json({
      status: 'success',
      message: `Sync completed. ${result.count} employee templates synced.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Sync templates error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while syncing templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/biometric/eBioServer/device/:id/push-employees
 * Push employees to eBioServer device
 */
export const pushEmployees = async (
  req: { 
    params: { id: string },
    body: { employeeIds?: number[] }
  },
  res: Response
): Promise<void> => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid device ID',
      });
      return;
    }

    const { employeeIds } = req.body;
    const result = await eBioServerService.pushEmployeesToEBioServer(deviceId, employeeIds);

    res.status(200).json({
      status: 'success',
      message: `Employees pushed to device. ${result.count} employees processed.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Push employees error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while pushing employees',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/biometric/eBioServer/device/:id/employees
 * Fetch employee templates from eBioServer device
 */
export const getEmployees = async (
  req: { 
    params: { id: string } 
  },
  res: Response
): Promise<void> => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid device ID',
      });
      return;
    }

    const device = await db.BiometricDevice.findByPk(deviceId);
    if (!device) {
      res.status(404).json({
        status: 'error',
        message: 'Device not found',
      });
      return;
    }

    const employees = await eBioServerService.fetchEmployeeTemplates(device);

    res.status(200).json({
      status: 'success',
      data: employees,
    });
  } catch (error: any) {
    logger.error('Get employees error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while fetching employees',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};