import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import db from '../../models';
import { UserRole } from '../../models/User';
import { DeviceType, DeviceStatus } from '../../models/BiometricDevice';
import { logger } from '../../utils/logger';
import * as biometricService from './biometric.service';

/**
 * POST /api/biometric/register-device
 * Register a new biometric device
 */
export const registerDevice = async (
  req: AuthRequest & {
    body: {
      deviceName: string;
      deviceType: DeviceType;
      ipAddress?: string;
      port?: number;
      apiUrl?: string;
      authKey?: string;
    };
  },
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

    // Only superadmin and admin can register devices
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can register biometric devices',
      });
      return;
    }

    const { deviceName, deviceType, ipAddress, port, apiUrl, authKey } = req.body;

    if (!deviceName || !deviceType) {
      res.status(400).json({
        status: 'error',
        message: 'Device name and type are required',
      });
      return;
    }

    if (!Object.values(DeviceType).includes(deviceType)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid device type. Must be one of: ${Object.values(DeviceType).join(', ')}`,
      });
      return;
    }

    // Validate based on device type
    if (deviceType === DeviceType.PULL_API) {
      if (!ipAddress && !apiUrl) {
        res.status(400).json({
          status: 'error',
          message: 'IP address or API URL is required for pull-api devices',
        });
        return;
      }
    }

    const device = await db.BiometricDevice.create({
      deviceName,
      deviceType,
      ipAddress: ipAddress || null,
      port: port || null,
      apiUrl: apiUrl || null,
      authKey: authKey || null,
      status: DeviceStatus.INACTIVE,
    });

    res.status(201).json({
      status: 'success',
      message: 'Device registered successfully',
      data: device,
    });
  } catch (error: any) {
    logger.error('Register device error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while registering device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/biometric/devices
 * Get all registered biometric devices
 */
export const getDevices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin and admin can view devices
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can view biometric devices',
      });
      return;
    }

    const devices = await db.BiometricDevice.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.AttendanceLog,
          as: 'attendanceLogs',
          attributes: ['id'],
          required: false,
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: devices.map((device: any) => ({
        ...device.toJSON(),
        logCount: device.attendanceLogs?.length || 0,
      })),
    });
  } catch (error: any) {
    logger.error('Get devices error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching devices',
    });
  }
};

/**
 * POST /api/biometric/device/:id/test-connection
 * Test connection to a biometric device
 */
export const testConnection = async (
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

    // Only superadmin and admin can test connections
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can test device connections',
      });
      return;
    }

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

    const isConnected = await biometricService.connectToDevice(device);

    if (isConnected) {
      res.status(200).json({
        status: 'success',
        message: 'Device connection successful',
        data: { connected: true },
      });
    } else {
      res.status(200).json({
        status: 'error',
        message: 'Device connection failed',
        data: { connected: false },
      });
    }
  } catch (error: any) {
    logger.error('Test connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while testing connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/biometric/device/:id/sync-now
 * Manually trigger sync for a device
 */
export const syncNow = async (
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

    // Only superadmin and admin can sync devices
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can sync devices',
      });
      return;
    }

    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid device ID',
      });
      return;
    }

    const result = await biometricService.syncDeviceLogs(deviceId);

    res.status(200).json({
      status: 'success',
      message: `Sync completed. ${result.count} logs processed.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Sync now error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while syncing device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/biometric/push-log
 * Receive attendance log from a push-api device
 * This endpoint should be publicly accessible (or with device-specific auth)
 */
export const pushLog = async (
  req: {
    body: {
      deviceId?: number;
      deviceAuthKey?: string;
      employeeId?: number;
      employeeCode?: string;
      fingerprintId?: string;
      punchTime: string | Date;
      rawPayload?: any;
    };
  },
  res: Response
): Promise<void> => {
  try {
    const { deviceId, deviceAuthKey, employeeId, employeeCode, fingerprintId, punchTime, rawPayload } = req.body;

    if (!punchTime) {
      res.status(400).json({
        status: 'error',
        message: 'Punch time is required',
      });
      return;
    }

    // Find device by ID or auth key
    let device;
    if (deviceId) {
      device = await db.BiometricDevice.findByPk(deviceId);
    } else if (deviceAuthKey) {
      device = await db.BiometricDevice.findOne({
        where: { authKey: deviceAuthKey },
      });
    }

    if (!device) {
      res.status(404).json({
        status: 'error',
        message: 'Device not found or invalid credentials',
      });
      return;
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      res.status(400).json({
        status: 'error',
        message: 'Device is not active',
      });
      return;
    }

    if (device.deviceType !== DeviceType.PUSH_API) {
      res.status(400).json({
        status: 'error',
        message: 'Device is not configured for push API',
      });
      return;
    }

    // Save the log
    const attendanceLog = await biometricService.saveLog({
      employeeId,
      employeeCode,
      fingerprintId,
      punchTime,
      deviceId: device.id,
      rawPayload: rawPayload || req.body,
    });

    if (!attendanceLog) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to save attendance log. Employee not found.',
      });
      return;
    }

    // Update device last sync time
    device.lastSyncAt = new Date();
    await device.save();

    res.status(200).json({
      status: 'success',
      message: 'Attendance log received and saved',
      data: { logId: attendanceLog.id },
    });
  } catch (error: any) {
    logger.error('Push log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PUT /api/biometric/device/:id
 * Update device settings
 */
export const updateDevice = async (
  req: AuthRequest & {
    params: { id: string };
    body: {
      deviceName?: string;
      ipAddress?: string;
      port?: number;
      apiUrl?: string;
      authKey?: string;
      status?: DeviceStatus;
    };
  },
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

    // Only superadmin and admin can update devices
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update devices',
      });
      return;
    }

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

    const { deviceName, ipAddress, port, apiUrl, authKey, status } = req.body;

    if (deviceName) device.deviceName = deviceName;
    if (ipAddress !== undefined) device.ipAddress = ipAddress || null;
    if (port !== undefined) device.port = port || null;
    if (apiUrl !== undefined) device.apiUrl = apiUrl || null;
    if (authKey !== undefined) device.authKey = authKey || null;
    if (status && Object.values(DeviceStatus).includes(status)) {
      device.status = status;
    }

    await device.save();

    res.status(200).json({
      status: 'success',
      message: 'Device updated successfully',
      data: device,
    });
  } catch (error: any) {
    logger.error('Update device error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating device',
    });
  }
};

/**
 * DELETE /api/biometric/device/:id
 * Delete a device
 */
export const deleteDevice = async (
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

    // Only superadmin can delete devices
    if (req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only superadmin can delete devices',
      });
      return;
    }

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

    await device.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Device deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete device error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting device',
    });
  }
};

