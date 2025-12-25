import axios from 'axios';
import { Op } from 'sequelize';
import db from '../../models';
import BiometricDevice, { DeviceType } from '../../models/BiometricDevice';
import AttendanceLog, { PunchType } from '../../models/AttendanceLog';
import { UserRole } from '../../models/User';
import { logger } from '../../utils/logger';

/**
 * Connect to a biometric device and test the connection
 */
export const connectToDevice = async (device: BiometricDevice): Promise<boolean> => {
  try {
    if (device.deviceType === DeviceType.PUSH_API) {
      // For push API, we just verify the endpoint exists
      // The device will push data to our endpoint
      return true;
    }

    if (device.deviceType === DeviceType.PULL_API) {
      // For pull API, try to connect via IP/Port or API URL
      if (device.apiUrl) {
        const response = await axios.get(`${device.apiUrl}/status`, {
          timeout: 5000,
          headers: device.authKey ? { Authorization: `Bearer ${device.authKey}` } : {},
        });
        return response.status === 200;
      }

      if (device.ipAddress && device.port) {
        // Try TCP connection (simplified - in production, use proper SDK)
        const response = await axios.get(`http://${device.ipAddress}:${device.port}/status`, {
          timeout: 5000,
        });
        return response.status === 200;
      }
    }

    if (device.deviceType === DeviceType.EBIO_SERVER) {
      // For eBioServer, try to connect via IP/Port or API URL
      try {
        if (device.apiUrl) {
          const response = await axios.get(`${device.apiUrl}/api/status`, {
            timeout: 5000,
            headers: device.authKey ? { 
              'Authorization': `Bearer ${device.authKey}`,
              'API-Version': '1.0'
            } : {
              'API-Version': '1.0'
            },
          });
          return response.status === 200;
        }

        if (device.ipAddress && device.port) {
          // Try TCP connection
          const response = await axios.get(`http://${device.ipAddress}:${device.port}/api/status`, {
            timeout: 5000,
            headers: {
              'API-Version': '1.0'
            }
          });
          return response.status === 200;
        }
      } catch (error: any) {
        logger.error(`Failed to connect to eBioServer device ${device.deviceName}:`, error.message);
        return false;
      }
    }

    return false;
  } catch (error: any) {
    logger.error(`Failed to connect to device ${device.deviceName}:`, error.message);
    return false;
  }
};

/**
 * Fetch logs from a device using SDK or API
 */
export const fetchLogsFromSDK = async (device: BiometricDevice): Promise<any[]> => {
  try {
    if (device.deviceType === DeviceType.PULL_API) {
      if (device.apiUrl) {
        const response = await axios.get(`${device.apiUrl}/logs`, {
          timeout: 10000,
          headers: device.authKey ? { Authorization: `Bearer ${device.authKey}` } : {},
          params: {
            since: device.lastSyncAt ? device.lastSyncAt.toISOString() : undefined,
          },
        });
        return response.data?.logs || response.data || [];
      }

      if (device.ipAddress && device.port) {
        const response = await axios.get(`http://${device.ipAddress}:${device.port}/logs`, {
          timeout: 10000,
          params: {
            since: device.lastSyncAt ? device.lastSyncAt.toISOString() : undefined,
          },
        });
        return response.data?.logs || response.data || [];
      }
    }

    if (device.deviceType === DeviceType.EBIO_SERVER) {
      // For eBioServer, fetch attendance logs
      try {
        if (device.apiUrl) {
          const response = await axios.get(`${device.apiUrl}/api/attendance/logs`, {
            timeout: 10000,
            headers: device.authKey ? { 
              'Authorization': `Bearer ${device.authKey}`,
              'API-Version': '1.0'
            } : {
              'API-Version': '1.0'
            },
            params: {
              since: device.lastSyncAt ? device.lastSyncAt.toISOString() : undefined,
            },
          });
          return response.data?.logs || response.data || [];
        }

        if (device.ipAddress && device.port) {
          const response = await axios.get(`http://${device.ipAddress}:${device.port}/api/attendance/logs`, {
            timeout: 10000,
            headers: {
              'API-Version': '1.0'
            },
            params: {
              since: device.lastSyncAt ? device.lastSyncAt.toISOString() : undefined,
            },
          });
          return response.data?.logs || response.data || [];
        }
      } catch (error: any) {
        logger.error(`Failed to fetch logs from eBioServer device ${device.deviceName}:`, error.message);
        return [];
      }
    }

    return [];
  } catch (error: any) {
    logger.error(`Failed to fetch logs from device ${device.deviceName}:`, error.message);
    return [];
  }
};

/**
 * Detect punch type (in/out) based on previous logs
 */
export const detectPunchType = async (
  employeeId: number,
  punchTime: Date
): Promise<PunchType> => {
  // Get the last log for this employee
  const lastLog = await db.AttendanceLog.findOne({
    where: {
      employeeId,
      punchTime: {
        [Op.lt]: punchTime,
      },
    },
    order: [['punchTime', 'DESC']],
  });

  // If no previous log or last was OUT, this is IN
  if (!lastLog || lastLog.punchType === PunchType.OUT) {
    return PunchType.IN;
  }

  // If last was IN, this is OUT
  return PunchType.OUT;
};

/**
 * Save attendance log and update EmployeePunch record
 */
export const saveLog = async (rawData: {
  employeeId?: number;
  employeeCode?: string;
  fingerprintId?: string;
  punchTime: string | Date;
  deviceId: number;
  rawPayload?: any;
}): Promise<AttendanceLog | null> => {
  try {
    let employeeId = rawData.employeeId;

    // If employeeId not provided, try to find by employeeCode or fingerprintId
    if (!employeeId) {
      if (rawData.employeeCode) {
        // First try to find by employeeCode matching user id, email, or phone
        const user = await db.User.findOne({
          where: {
            [Op.or]: [
              { id: rawData.employeeCode },
              { email: rawData.employeeCode },
              { phone: rawData.employeeCode }
            ],
            role: {
              [Op.in]: [UserRole.EMPLOYEE, UserRole.FACULTY]
            }
          }
        });
        
        if (user) {
          employeeId = user.id;
        } else {
          // Try to find by employeeId in EmployeeProfile
          const employeeProfile = await db.EmployeeProfile.findOne({
            where: { employeeId: rawData.employeeCode },
            include: [{ model: db.User, as: 'user' }],
          });
          if (employeeProfile) {
            employeeId = employeeProfile.userId;
          }
        }
      }

      // If still not found, try to find by fingerprintId/thumb data
      if (!employeeId && rawData.fingerprintId) {
        // Try to find user with matching biometric data in documents
        const employeeProfiles = await db.EmployeeProfile.findAll({
          include: [{ model: db.User, as: 'user' }],
        });
        
        for (const profile of employeeProfiles) {
          if (profile.documents?.biometricData) {
            const bioData = profile.documents.biometricData;
            if (bioData.fingerId === rawData.fingerprintId || 
                bioData.thumbData === rawData.fingerprintId ||
                bioData.fingerTemplate === rawData.fingerprintId) {
              employeeId = profile.userId;
              break;
            }
          }
        }
      }
    }

    if (!employeeId) {
      logger.warn(`Could not find employee for log: ${JSON.stringify(rawData)}`);
      return null;
    }

    // Verify user is an employee or faculty
    const user = await db.User.findByPk(employeeId);
    if (!user || (user.role !== UserRole.EMPLOYEE && user.role !== UserRole.FACULTY)) {
      logger.warn(`User ${employeeId} is not an employee or faculty`);
      return null;
    }

    const punchTime = new Date(rawData.punchTime);
    const punchType = await detectPunchType(employeeId, punchTime);

    // Create attendance log
    const attendanceLog = await db.AttendanceLog.create({
      employeeId,
      deviceId: rawData.deviceId,
      punchTime,
      punchType,
      rawPayload: rawData.rawPayload || null,
    });

    // Update or create EmployeePunch record
    const dateStr = punchTime.toISOString().split('T')[0];
    let employeePunch = await db.EmployeePunch.findOne({
      where: {
        userId: employeeId,
        date: dateStr,
      },
    });

    if (!employeePunch) {
      employeePunch = await db.EmployeePunch.create({
        userId: employeeId,
        date: dateStr,
        punchInAt: punchType === PunchType.IN ? punchTime : null,
        punchOutAt: punchType === PunchType.OUT ? punchTime : null,
        punchInFingerprint: punchType === PunchType.IN ? rawData.fingerprintId || null : null,
        punchOutFingerprint: punchType === PunchType.OUT ? rawData.fingerprintId || null : null,
      });
    } else {
      // Update existing punch record
      if (punchType === PunchType.IN && !employeePunch.punchInAt) {
        employeePunch.punchInAt = punchTime;
        employeePunch.punchInFingerprint = rawData.fingerprintId || null;
      } else if (punchType === PunchType.OUT && !employeePunch.punchOutAt) {
        employeePunch.punchOutAt = punchTime;
        employeePunch.punchOutFingerprint = rawData.fingerprintId || null;
      }

      // Calculate effective working hours if both in and out are present
      if (employeePunch.punchInAt && employeePunch.punchOutAt) {
        const diffMs = employeePunch.punchOutAt.getTime() - employeePunch.punchInAt.getTime();
        employeePunch.effectiveWorkingHours = diffMs / (1000 * 60 * 60); // Convert to hours
      }

      await employeePunch.save();
    }

    logger.info(`Saved attendance log for employee ${employeeId}: ${punchType} at ${punchTime}`);
    return attendanceLog;
  } catch (error: any) {
    logger.error('Error saving attendance log:', error);
    throw error;
  }
};

/**
 * Sync logs from a device
 */
export const syncDeviceLogs = async (deviceId: number): Promise<{ success: boolean; count: number }> => {
  try {
    const device = await db.BiometricDevice.findByPk(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.status !== 'active') {
      throw new Error('Device is not active');
    }

    if (device.deviceType === DeviceType.PULL_API || device.deviceType === DeviceType.EBIO_SERVER) {
      const logs = await fetchLogsFromSDK(device);
      let savedCount = 0;

      for (const log of logs) {
        try {
          await saveLog({
            employeeCode: log.employeeCode || log.employee_id || log.employeeId || log.emp_code,
            fingerprintId: log.fingerprintId || log.fingerprint_id || log.finger_id || log.thumb_data,
            punchTime: log.punchTime || log.punch_time || log.timestamp || log.datetime,
            deviceId: device.id,
            rawPayload: log,
          });
          savedCount++;
        } catch (error: any) {
          logger.error(`Error processing log:`, error);
        }
      }

      // Update last sync time
      device.lastSyncAt = new Date();
      await device.save();

      return { success: true, count: savedCount };
    }

    return { success: true, count: 0 };
  } catch (error: any) {
    logger.error(`Error syncing device logs:`, error);
    throw error;
  }
};



