import axios from 'axios';
import { Op } from 'sequelize';
import db from '../../models';
import BiometricDevice from '../../models/BiometricDevice';
import AttendanceLog from '../../models/AttendanceLog';
import EmployeePunch from '../../models/EmployeePunch';
import { UserRole } from '../../models/User';
import { logger } from '../../utils/logger';
import EmployeeProfile from '../../models/EmployeeProfile';

// eBioServer specific constants
const EBIO_SERVER_DEVICE_TYPE = 'eBioServer';
const EBIO_SERVER_API_VERSION = '1.0';

/**
 * Interface for eBioServer webhook payload
 */
interface EBioServerWebhookPayload {
  device_serial_no: string;
  device_name: string;
  emp_code: string;
  emp_name: string;
  datetime: string;
  inout_mode: 'IN' | 'OUT';
  verify_mode: 'Finger' | 'Face' | 'Card' | 'Password' | 'RFID' | 'Palm' | 'Iris' | 'Thumb';
  finger_id?: string;
  thumb_data?: string;
  ip_address?: string;
  raw_payload?: any;
}

/**
 * Interface for employee data from eBioServer
 */
interface EBioServerEmployee {
  emp_code: string;
  emp_name: string;
  emp_id?: string;
  department?: string;
  designation?: string;
  finger_template?: string;
  thumb_data?: string;
  face_template?: string;
  card_no?: string;
  rfid_no?: string;
  palm_template?: string;
  iris_template?: string;
}

/**
 * Register eBioServer device
 */
export const registerEBioServerDevice = async (
  deviceName: string,
  ipAddress: string,
  port: number,
  authKey?: string
): Promise<BiometricDevice> => {
  try {
    const device = await db.BiometricDevice.create({
      deviceName,
      deviceType: EBIO_SERVER_DEVICE_TYPE,
      ipAddress,
      port,
      apiUrl: `http://${ipAddress}:${port}`,
      authKey: authKey || null,
      status: 'inactive',
    });

    logger.info(`Registered eBioServer device: ${deviceName} (${ipAddress}:${port})`);
    return device;
  } catch (error: any) {
    logger.error('Error registering eBioServer device:', error);
    throw error;
  }
};

/**
 * Handle webhook from eBioServer
 * This function processes the attendance data sent by eBioServer
 */
export const handleEBioServerWebhook = async (payload: EBioServerWebhookPayload): Promise<AttendanceLog | null> => {
  try {
    logger.info('Received eBioServer webhook:', payload);

    // Find device by IP address or device serial
    let device = await db.BiometricDevice.findOne({
      where: {
        ipAddress: payload.ip_address,
        deviceType: EBIO_SERVER_DEVICE_TYPE,
      },
    });

    // If device not found by IP, try to find by device name
    if (!device) {
      device = await db.BiometricDevice.findOne({
        where: {
          deviceName: payload.device_name,
          deviceType: EBIO_SERVER_DEVICE_TYPE,
        },
      });
    }

    // If still no device, create a new one
    if (!device) {
      device = await db.BiometricDevice.create({
        deviceName: payload.device_name || `eBioServer-${payload.device_serial_no}`,
        deviceType: EBIO_SERVER_DEVICE_TYPE,
        ipAddress: payload.ip_address || null,
        port: null,
        apiUrl: payload.ip_address ? `http://${payload.ip_address}` : null,
        authKey: null,
        status: 'active',
      });
      logger.info(`Created new eBioServer device: ${device.deviceName}`);
    }

    // Activate device if inactive
    if (device.status !== 'active') {
      device.status = 'active';
      await device.save();
    }

    // Enhanced employee matching logic
    let employee = null;
    
    // Try to find employee by emp_code (exact match)
    if (payload.emp_code) {
      employee = await db.User.findOne({
        where: {
          [Op.or]: [
            { id: payload.emp_code },
            { email: payload.emp_code },
            { phone: payload.emp_code }
          ]
        },
        include: [{
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false
        }]
      });
    }

    // If employee not found by emp_code, try to find by name
    if (!employee && payload.emp_name) {
      employee = await db.User.findOne({
        where: {
          name: {
            [Op.like]: `%${payload.emp_name}%`
          },
          role: {
            [Op.in]: [UserRole.EMPLOYEE, UserRole.FACULTY]
          }
        },
        include: [{
          model: db.EmployeeProfile,
          as: 'employeeProfile',
          required: false
        }]
      });
    }

    // If still not found, try fuzzy matching by name parts
    if (!employee && payload.emp_name) {
      const nameParts = payload.emp_name.split(' ').filter(part => part.length > 0);
      if (nameParts.length > 0) {
        const whereConditions = nameParts.map(part => ({
          name: {
            [Op.like]: `%${part}%`
          }
        }));
        
        employee = await db.User.findOne({
          where: {
            [Op.and]: [
              {
                [Op.or]: whereConditions
              },
              {
                role: {
                  [Op.in]: [UserRole.EMPLOYEE, UserRole.FACULTY]
                }
              }
            ]
          },
          include: [{
            model: db.EmployeeProfile,
            as: 'employeeProfile',
            required: false
          }]
        });
      }
    }

    if (!employee) {
      logger.warn(`Employee not found for eBioServer log: ${payload.emp_code} - ${payload.emp_name}`);
      // We'll still save the log but without employee association
    }

    // Parse punch time
    const punchTime = new Date(payload.datetime);
    
    // Determine punch type
    const punchType = payload.inout_mode.toLowerCase() === 'in' ? 'in' : 'out';

    // Create attendance log
    const attendanceLog = await db.AttendanceLog.create({
      employeeId: employee?.id || null,
      deviceId: device.id,
      punchTime,
      punchType,
      rawPayload: payload,
    });

    // If we have an employee, update EmployeePunch record
    if (employee) {
      const dateStr = punchTime.toISOString().split('T')[0];
      
      let employeePunch = await db.EmployeePunch.findOne({
        where: {
          userId: employee.id,
          date: dateStr,
        },
      });

      if (!employeePunch) {
        employeePunch = await db.EmployeePunch.create({
          userId: employee.id,
          date: dateStr,
          punchInAt: punchType === 'in' ? punchTime : null,
          punchOutAt: punchType === 'out' ? punchTime : null,
          punchInFingerprint: punchType === 'in' && (payload.verify_mode === 'Finger' || payload.verify_mode === 'Thumb') ? payload.finger_id || payload.thumb_data || null : null,
          punchOutFingerprint: punchType === 'out' && (payload.verify_mode === 'Finger' || payload.verify_mode === 'Thumb') ? payload.finger_id || payload.thumb_data || null : null,
        });
      } else {
        // Update existing punch record
        if (punchType === 'in' && !employeePunch.punchInAt) {
          employeePunch.punchInAt = punchTime;
          if (payload.verify_mode === 'Finger' || payload.verify_mode === 'Thumb') {
            employeePunch.punchInFingerprint = payload.finger_id || payload.thumb_data || null;
          }
        } else if (punchType === 'out' && !employeePunch.punchOutAt) {
          employeePunch.punchOutAt = punchTime;
          if (payload.verify_mode === 'Finger' || payload.verify_mode === 'Thumb') {
            employeePunch.punchOutFingerprint = payload.finger_id || payload.thumb_data || null;
          }
        }

        // Calculate effective working hours if both in and out are present
        if (employeePunch.punchInAt && employeePunch.punchOutAt) {
          const diffMs = employeePunch.punchOutAt.getTime() - employeePunch.punchInAt.getTime();
          employeePunch.effectiveWorkingHours = diffMs / (1000 * 60 * 60); // Convert to hours
        }

        await employeePunch.save();
      }
      
      // Store thumb/fingerprint data in employee profile if available
      if ((payload.verify_mode === 'Finger' || payload.verify_mode === 'Thumb') && (payload.finger_id || payload.thumb_data) && employee.employeeProfile) {
        try {
          // Get existing documents or initialize empty object
          const documents = employee.employeeProfile.documents || {};
          
          // Add biometric data
          if (!documents.biometricData) {
            documents.biometricData = {};
          }
          
          // Store thumb/fingerprint data
          if (payload.verify_mode === 'Thumb' && payload.thumb_data) {
            documents.biometricData.thumbData = payload.thumb_data;
            documents.biometricData.lastThumbSync = new Date().toISOString();
          } else if (payload.verify_mode === 'Finger' && payload.finger_id) {
            documents.biometricData.fingerId = payload.finger_id;
            documents.biometricData.lastFingerSync = new Date().toISOString();
          }
          
          // Update employee profile
          await db.EmployeeProfile.update(
            { documents },
            { where: { id: employee.employeeProfile.id } }
          );
          
          logger.info(`Updated biometric data for employee ${employee.id}`);
        } catch (profileError: any) {
          logger.error(`Error updating employee profile with biometric data:`, profileError);
        }
      }
    }

    // Update device last sync time
    device.lastSyncAt = new Date();
    await device.save();

    logger.info(`Processed eBioServer attendance log for employee ${employee?.id || 'unknown'}: ${punchType} at ${punchTime}`);
    return attendanceLog;
  } catch (error: any) {
    logger.error('Error processing eBioServer webhook:', error);
    throw error;
  }
};

/**
 * Fetch employee templates from eBioServer
 * This function retrieves employee biometric templates (fingerprints, face, etc.)
 */
export const fetchEmployeeTemplates = async (device: BiometricDevice): Promise<EBioServerEmployee[]> => {
  try {
    if (!device.apiUrl) {
      throw new Error('Device API URL is not configured');
    }

    // Construct the API endpoint for fetching employee data
    const url = `${device.apiUrl}/api/employees`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: device.authKey ? { 
        'Authorization': `Bearer ${device.authKey}`,
        'API-Version': EBIO_SERVER_API_VERSION
      } : {
        'API-Version': EBIO_SERVER_API_VERSION
      },
    });

    if (response.status === 200 && response.data) {
      logger.info(`Fetched ${response.data.length} employees from eBioServer device ${device.deviceName}`);
      return response.data;
    }

    return [];
  } catch (error: any) {
    logger.error(`Failed to fetch employee templates from eBioServer device ${device.deviceName}:`, error.message);
    throw error;
  }
};

/**
 * Sync employee templates from eBioServer to local database
 * This function maps eBioServer employee data to local employee profiles
 */
export const syncEmployeeTemplates = async (deviceId: number): Promise<{ success: boolean; count: number }> => {
  try {
    const device = await db.BiometricDevice.findByPk(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.deviceType !== EBIO_SERVER_DEVICE_TYPE) {
      throw new Error('Device is not an eBioServer device');
    }

    if (device.status !== 'active') {
      throw new Error('Device is not active');
    }

    // Fetch employee templates from eBioServer
    const employees = await fetchEmployeeTemplates(device);
    let syncedCount = 0;

    for (const emp of employees) {
      try {
        // Find local employee by emp_code
        const employee = await db.User.findOne({
          where: {
            [Op.or]: [
              { id: emp.emp_code },
              { email: emp.emp_code },
              { phone: emp.emp_code }
            ]
          },
          include: [{
            model: db.EmployeeProfile,
            as: 'employeeProfile',
            required: false
          }]
        });

        if (employee && employee.employeeProfile) {
          // Update employee profile with biometric data
          const existingDocuments = employee.employeeProfile.documents || {};
          const updatedDocuments = {
            ...existingDocuments,
            biometricData: {
              ...(existingDocuments.biometricData || {}),
              fingerTemplate: emp.finger_template || existingDocuments.biometricData?.fingerTemplate || null,
              thumbData: emp.thumb_data || existingDocuments.biometricData?.thumbData || null,
              faceTemplate: emp.face_template || existingDocuments.biometricData?.faceTemplate || null,
              cardNo: emp.card_no || existingDocuments.biometricData?.cardNo || null,
              rfidNo: emp.rfid_no || existingDocuments.biometricData?.rfidNo || null,
              palmTemplate: emp.palm_template || existingDocuments.biometricData?.palmTemplate || null,
              irisTemplate: emp.iris_template || existingDocuments.biometricData?.irisTemplate || null,
              lastSynced: new Date().toISOString()
            }
          };

          await db.EmployeeProfile.update(
            { documents: updatedDocuments },
            { where: { id: employee.employeeProfile.id } }
          );

          syncedCount++;
          logger.info(`Synced biometric data for employee ${emp.emp_code}`);
        }
      } catch (syncError: any) {
        logger.error(`Error syncing employee ${emp.emp_code}:`, syncError);
      }
    }

    // Update last sync time
    device.lastSyncAt = new Date();
    await device.save();

    return { success: true, count: syncedCount };
  } catch (error: any) {
    logger.error('Error syncing employee templates:', error);
    throw error;
  }
};

/**
 * Send employee data to eBioServer
 * This function pushes local employee data to eBioServer
 */
export const pushEmployeesToEBioServer = async (deviceId: number, employeeIds?: number[]): Promise<{ success: boolean; count: number }> => {
  try {
    const device = await db.BiometricDevice.findByPk(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.deviceType !== EBIO_SERVER_DEVICE_TYPE) {
      throw new Error('Device is not an eBioServer device');
    }

    if (device.status !== 'active') {
      throw new Error('Device is not active');
    }

    if (!device.apiUrl) {
      throw new Error('Device API URL is not configured');
    }

    // Get employees to push
    const whereClause: any = {
      role: {
        [Op.in]: [UserRole.EMPLOYEE, UserRole.FACULTY]
      }
    };

    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { [Op.in]: employeeIds };
    }

    const employees = await db.User.findAll({
      where: whereClause,
      include: [{
        model: db.EmployeeProfile,
        as: 'employeeProfile',
        required: false
      }]
    });

    let pushedCount = 0;

    // Prepare employee data for eBioServer
    const eBioServerEmployees: EBioServerEmployee[] = [];

    for (const emp of employees) {
      try {
        const eBioEmp: EBioServerEmployee = {
          emp_code: emp.id.toString(),
          emp_name: emp.name,
          emp_id: emp.id.toString(),
          department: emp.employeeProfile?.documents?.department || null,
          designation: emp.employeeProfile?.documents?.designation || null,
        };

        // Add biometric data if available
        if (emp.employeeProfile?.documents?.biometricData) {
          const bioData = emp.employeeProfile.documents.biometricData;
          eBioEmp.finger_template = bioData.fingerTemplate || null;
          eBioEmp.thumb_data = bioData.thumbData || null;
          eBioEmp.face_template = bioData.faceTemplate || null;
          eBioEmp.card_no = bioData.cardNo || null;
          eBioEmp.rfid_no = bioData.rfidNo || null;
          eBioEmp.palm_template = bioData.palmTemplate || null;
          eBioEmp.iris_template = bioData.irisTemplate || null;
        }

        eBioServerEmployees.push(eBioEmp);
        pushedCount++;
      } catch (prepareError: any) {
        logger.error(`Error preparing employee ${emp.id} for eBioServer:`, prepareError);
      }
    }

    // Send to eBioServer
    const url = `${device.apiUrl}/api/employees/bulk`;
    const response = await axios.post(url, {
      employees: eBioServerEmployees
    }, {
      timeout: 30000,
      headers: device.authKey ? { 
        'Authorization': `Bearer ${device.authKey}`,
        'Content-Type': 'application/json',
        'API-Version': EBIO_SERVER_API_VERSION
      } : {
        'Content-Type': 'application/json',
        'API-Version': EBIO_SERVER_API_VERSION
      },
    });

    if (response.status === 200) {
      logger.info(`Successfully pushed ${pushedCount} employees to eBioServer device ${device.deviceName}`);
      return { success: true, count: pushedCount };
    }

    return { success: false, count: 0 };
  } catch (error: any) {
    logger.error('Error pushing employees to eBioServer:', error);
    throw error;
  }
};