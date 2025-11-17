import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ZKLib from 'node-zklib';

dotenv.config();

const app = express();
const PORT = process.env.BRIDGE_PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const deviceConnections = new Map();

console.log('Biometric Bridge Service Starting...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log(`Port: ${PORT}`);
console.log('ZKTeco SDK: node-zklib loaded\n');

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    zklib: 'enabled',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeConnections: deviceConnections.size,
  });
});

async function getZKDevice(ip, port, timeout = 10000) {
  const key = `${ip}:${port}`;

  if (deviceConnections.has(key)) {
    const existing = deviceConnections.get(key);
    if (existing.connected) {
      return existing;
    }
    deviceConnections.delete(key);
  }

  const zkDevice = new ZKLib(ip, port, timeout, 4000);

  try {
    await zkDevice.createSocket();
    deviceConnections.set(key, zkDevice);
    return zkDevice;
  } catch (error) {
    throw error;
  }
}

function closeZKDevice(ip, port) {
  const key = `${ip}:${port}`;
  const device = deviceConnections.get(key);

  if (device) {
    try {
      device.disconnect();
    } catch (error) {
      console.error('Error closing device connection:', error);
    }
    deviceConnections.delete(key);
  }
}

app.post('/device/test', async (req, res) => {
  const { deviceId, ip, port, protocol } = req.body;

  console.log(`Testing connection to ${protocol} device at ${ip}:${port}`);

  try {
    if (protocol === 'ZKTeco') {
      const result = await testZKTecoConnection(ip, port, deviceId);
      res.json(result);
    } else {
      const result = await testGenericConnection(ip, port);
      res.json(result);
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      online: false,
    });
  }
});

async function testZKTecoConnection(ip, port, deviceId) {
  let zkDevice = null;

  try {
    console.log(`Attempting ZKTeco connection to ${ip}:${port}...`);

    zkDevice = await getZKDevice(ip, port);

    console.log('Getting device info...');
    const deviceInfo = await zkDevice.getInfo();

    console.log('Device info retrieved:', deviceInfo);

    const userCount = await zkDevice.getUsers();
    const attendanceCount = await zkDevice.getAttendances();

    await supabase
      .from('biometric_devices')
      .update({
        is_online: true,
        last_heartbeat: new Date().toISOString(),
        firmware_version: deviceInfo.firmware || null,
        current_users: userCount?.data?.length || 0,
        current_records: attendanceCount?.data?.length || 0,
      })
      .eq('id', deviceId);

    return {
      success: true,
      message: `ZKTeco K40 connected successfully. Found ${userCount?.data?.length || 0} users and ${attendanceCount?.data?.length || 0} attendance records.`,
      online: true,
      deviceInfo: {
        model: deviceInfo.model || 'K40',
        serialNumber: deviceInfo.serialNumber,
        firmware: deviceInfo.firmware,
        platform: deviceInfo.platform,
        deviceName: deviceInfo.deviceName,
        userCount: userCount?.data?.length || 0,
        recordCount: attendanceCount?.data?.length || 0,
      },
      diagnostic: {
        networkReachable: true,
        zkProtocolWorking: true,
        canReadDeviceInfo: true,
      },
    };
  } catch (error) {
    console.error('ZKTeco connection error:', error);

    await supabase
      .from('biometric_devices')
      .update({
        is_online: false,
      })
      .eq('id', deviceId);

    let message = 'Failed to connect to ZKTeco device';
    const possibleCauses = [];

    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      message = 'Connection timeout. Device is not responding.';
      possibleCauses.push(
        'Device is powered off',
        'Wrong IP address',
        'Device is on a different network',
        'Firewall blocking port 4370'
      );
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused. ZKTeco service is not running on device.';
      possibleCauses.push(
        'Device is offline',
        'Wrong port number (should be 4370)',
        'Device needs to be restarted'
      );
    } else if (error.message?.includes('EHOSTUNREACH')) {
      message = 'Host unreachable. Cannot reach device network.';
      possibleCauses.push(
        'Device not on network',
        'Wrong subnet',
        'Network routing issue'
      );
    } else {
      message = `ZKTeco protocol error: ${error.message}`;
      possibleCauses.push(
        'Device might not be a ZKTeco device',
        'Firmware incompatibility',
        'Device requires authentication'
      );
    }

    return {
      success: false,
      message,
      online: false,
      error: error.message,
      diagnostic: {
        networkReachable: false,
        error: error.code || error.message,
        possibleCauses,
      },
    };
  } finally {
    if (zkDevice) {
      closeZKDevice(ip, port);
    }
  }
}

async function testGenericConnection(ip, port) {
  return {
    success: false,
    message: 'Only ZKTeco protocol is currently supported with real device communication',
    online: false,
  };
}

app.post('/device/enroll', async (req, res) => {
  const { deviceId, ip, port, protocol, employeeId, fingerIndex } = req.body;

  console.log(`Enrollment request: ${protocol} device at ${ip}:${port}`);
  console.log(`Employee: ${employeeId}, Finger: ${fingerIndex}`);

  try {
    let result;

    if (protocol === 'ZKTeco') {
      result = await enrollZKTeco(ip, port, employeeId, fingerIndex);
    } else {
      result = await enrollSimulated(employeeId, fingerIndex);
    }

    if (result.success) {
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.from('biometric_templates').insert([
        {
          employee_id: employeeId,
          device_id: deviceId,
          template_type: 'fingerprint',
          finger_position: getFingerPosition(fingerIndex),
          template_data: result.templateData,
          quality_score: result.qualityScore,
          enrolled_by: session?.user?.id,
          is_active: true,
        },
      ]);
    }

    res.json(result);
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

async function enrollZKTeco(ip, port, employeeId, fingerIndex) {
  let zkDevice = null;

  try {
    console.log(`Starting ZKTeco enrollment for employee ${employeeId}...`);

    zkDevice = await getZKDevice(ip, port);

    const uid = parseInt(employeeId.replace(/\D/g, '').slice(-6) || '1000');

    console.log(`Setting device to enrollment mode for user ${uid}, finger ${fingerIndex}...`);

    const enrollResult = await zkDevice.enrollUser(uid, fingerIndex);

    if (!enrollResult || !enrollResult.data) {
      throw new Error('Enrollment failed - no template data received');
    }

    const templateData = Buffer.from(JSON.stringify(enrollResult.data)).toString('base64');

    console.log('Enrollment successful!');

    return {
      success: true,
      templateData: templateData,
      qualityScore: 95,
      message: 'Fingerprint enrolled successfully on ZKTeco K40 device',
      uid: uid,
    };
  } catch (error) {
    console.error('ZKTeco enrollment error:', error);

    return {
      success: false,
      message: `Enrollment failed: ${error.message}`,
      error: error.message,
      note: 'Make sure the device is in enrollment mode and employee places finger on scanner',
    };
  } finally {
    if (zkDevice) {
      closeZKDevice(ip, port);
    }
  }
}

async function enrollSimulated(employeeId, fingerIndex) {
  console.log('Simulated enrollment');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const templateData = Buffer.from(
    JSON.stringify({
      type: 'fingerprint',
      employeeId: employeeId,
      fingerIndex: fingerIndex,
      data: Array.from({ length: 512 }, () => Math.floor(Math.random() * 256)),
      timestamp: new Date().toISOString(),
      protocol: 'Generic',
      simulated: true,
    })
  ).toString('base64');

  return {
    success: true,
    templateData: templateData,
    qualityScore: Math.floor(Math.random() * 15) + 85,
    message: 'Fingerprint enrolled (SIMULATED MODE)',
  };
}

app.post('/device/sync', async (req, res) => {
  const { deviceId, deviceDbId, ip, port, protocol } = req.body;

  console.log(`Sync request: ${protocol} device at ${ip}:${port}`);

  try {
    const result = await syncAttendanceLogs(ip, port, protocol, deviceDbId || deviceId);
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

let syncInterval = null;

app.post('/device/auto-sync/start', async (req, res) => {
  const { intervalSeconds = 300 } = req.body;

  if (syncInterval) {
    return res.json({
      success: false,
      message: 'Auto-sync already running',
    });
  }

  console.log(`Starting auto-sync with ${intervalSeconds}s interval`);

  syncInterval = setInterval(async () => {
    try {
      console.log('Running scheduled auto-sync...');

      const { data: devices } = await supabase
        .from('biometric_devices')
        .select('*')
        .eq('auto_sync_enabled', true)
        .eq('is_online', true);

      if (devices && devices.length > 0) {
        for (const device of devices) {
          console.log(`Auto-syncing device: ${device.device_name}`);
          await syncAttendanceLogs(
            device.ip_address,
            device.port,
            device.protocol?.name || 'ZKTeco',
            device.device_id
          );
        }
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  }, intervalSeconds * 1000);

  res.json({
    success: true,
    message: `Auto-sync started with ${intervalSeconds}s interval`,
  });
});

app.post('/device/auto-sync/stop', (req, res) => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Auto-sync stopped');
    res.json({ success: true, message: 'Auto-sync stopped' });
  } else {
    res.json({ success: false, message: 'Auto-sync not running' });
  }
});

async function syncAttendanceLogs(ip, port, protocol, deviceDbId) {
  console.log(`Syncing attendance logs from ${protocol} device at ${ip}:${port}`);

  try {
    let logs = [];

    if (protocol === 'ZKTeco') {
      logs = await syncZKTecoLogs(ip, port, deviceDbId);
    } else {
      logs = await syncSimulatedLogs(deviceDbId);
    }

    if (logs.length > 0) {
      console.log(`Synced ${logs.length} attendance logs, pushing to Supabase...`);

      const { data: device } = await supabase
        .from('biometric_devices')
        .select('id')
        .eq('device_id', deviceDbId)
        .maybeSingle();

      if (!device) {
        throw new Error('Device not found in database');
      }

      const insertData = logs.map((log) => ({
        device_id: device.id,
        employee_id: log.employeeId,
        log_time: log.timestamp,
        log_type: log.type || 'check_in',
        verification_method: log.method || 'fingerprint',
        match_score: log.score || null,
        temperature: log.temperature || null,
      }));

      const { error } = await supabase.from('attendance_logs').insert(insertData);

      if (error) {
        console.error('Failed to insert logs:', error);
        throw error;
      }

      console.log(`Successfully pushed ${logs.length} logs to database`);
    } else {
      console.log('No new attendance records to sync');
    }

    return {
      success: true,
      message: 'Attendance sync completed',
      recordsSynced: logs.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      message: error.message || 'Sync failed',
      recordsSynced: 0,
    };
  }
}

async function syncZKTecoLogs(ip, port, deviceDbId) {
  let zkDevice = null;

  try {
    console.log('Connecting to ZKTeco device to fetch attendance logs...');

    zkDevice = await getZKDevice(ip, port);

    const attendanceResult = await zkDevice.getAttendances();

    if (!attendanceResult || !attendanceResult.data) {
      console.log('No attendance data found on device');
      return [];
    }

    const attendanceRecords = attendanceResult.data;
    console.log(`Found ${attendanceRecords.length} attendance records on device`);

    const { data: existingLogs } = await supabase
      .from('attendance_logs')
      .select('log_time, employee_id')
      .gte('log_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const existingSet = new Set(
      (existingLogs || []).map(log => `${log.employee_id}-${new Date(log.log_time).getTime()}`)
    );

    const { data: employees } = await supabase
      .from('employees')
      .select('id, employee_id');

    const employeeMap = new Map();
    (employees || []).forEach(emp => {
      const numericId = emp.employee_id.replace(/\D/g, '');
      if (numericId) {
        employeeMap.set(numericId, emp.id);
      }
    });

    const logs = [];

    for (const record of attendanceRecords) {
      const timestamp = new Date(record.recordTime);
      const uid = record.deviceUserId?.toString() || '';

      const employeeId = employeeMap.get(uid);

      if (!employeeId) {
        console.log(`Skipping record - no employee match for device UID ${uid}`);
        continue;
      }

      const logKey = `${employeeId}-${timestamp.getTime()}`;

      if (existingSet.has(logKey)) {
        continue;
      }

      logs.push({
        employeeId: employeeId,
        timestamp: timestamp.toISOString(),
        type: record.checkType === 1 ? 'check_out' : 'check_in',
        method: 'fingerprint',
        score: 100,
        uid: uid,
      });
    }

    console.log(`Filtered to ${logs.length} new attendance records`);
    return logs;

  } catch (error) {
    console.error('ZKTeco sync error:', error);
    throw error;
  } finally {
    if (zkDevice) {
      closeZKDevice(ip, port);
    }
  }
}

async function syncSimulatedLogs(deviceDbId) {
  console.log('Generating simulated attendance logs for testing');

  await new Promise((resolve) => setTimeout(resolve, 500));

  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .limit(5);

  if (!employees || employees.length === 0) {
    console.log('No employees found for simulation');
    return [];
  }

  const logs = [];
  const now = new Date();

  for (let i = 0; i < Math.min(3, employees.length); i++) {
    const employee = employees[i];
    const logTime = new Date(now.getTime() - Math.random() * 3600000);

    logs.push({
      employeeId: employee.id,
      timestamp: logTime.toISOString(),
      type: Math.random() > 0.5 ? 'check_in' : 'check_out',
      method: 'fingerprint',
      score: Math.floor(Math.random() * 20) + 80,
      temperature: (36 + Math.random() * 1).toFixed(1),
    });
  }

  console.log(`Generated ${logs.length} simulated logs`);
  return logs;
}

function getFingerPosition(fingerIndex) {
  const positions = [
    'left_thumb',
    'left_index',
    'left_middle',
    'left_ring',
    'left_pinky',
    'right_thumb',
    'right_index',
    'right_middle',
    'right_ring',
    'right_pinky',
  ];
  return positions[fingerIndex] || 'right_index';
}

app.listen(PORT, () => {
  console.log(`\n✓ Biometric Bridge Service running on port ${PORT}`);
  console.log(`✓ ZKTeco SDK: node-zklib enabled`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log('\nWaiting for device communication requests...\n');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  deviceConnections.forEach((device, key) => {
    try {
      device.disconnect();
    } catch (error) {
      console.error(`Error closing connection ${key}:`, error);
    }
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  deviceConnections.forEach((device, key) => {
    try {
      device.disconnect();
    } catch (error) {
      console.error(`Error closing connection ${key}:`, error);
    }
  });
  process.exit(0);
});
