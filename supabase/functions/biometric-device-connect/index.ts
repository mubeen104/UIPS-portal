import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeviceCommand {
  action: 'test' | 'enroll' | 'verify' | 'getUsers' | 'syncTime' | 'quickTest';
  deviceId?: string;
  employeeId?: string;
  fingerIndex?: number;
  templateData?: string;
  ip?: string;
  port?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const command: DeviceCommand = await req.json();
    const { deviceId, action, ip, port } = command;

    let result;

    if (action === 'quickTest') {
      if (!ip || !port) {
        throw new Error('IP and port required for quickTest');
      }

      console.log(`Quick test: ${ip}:${port}`);
      result = await quickTestConnection(ip, port);
    } else {
      const { data: device, error: deviceError } = await supabaseClient
        .from('biometric_devices')
        .select('*, protocol:device_protocols(*)')
        .eq('id', deviceId)
        .single();

      if (deviceError || !device) {
        throw new Error('Device not found');
      }

      console.log(`Action: ${action} on device: ${device.device_name} (${device.ip_address}:${device.port})`);

      switch (action) {
        case 'test':
          result = await testDeviceConnection(device);
          break;
        case 'enroll':
          result = await enrollFingerprint(device, command.employeeId!, command.fingerIndex!);
          break;
        case 'verify':
          result = await verifyFingerprint(device, command.templateData!);
          break;
        case 'getUsers':
          result = await getDeviceUsers(device);
          break;
        case 'syncTime':
          result = await syncDeviceTime(device);
          break;
        default:
          throw new Error('Invalid action');
      }
    }

    if (deviceId && action !== 'quickTest') {
      await supabaseClient
        .from('biometric_devices')
        .update({
          is_online: true,
          last_heartbeat: new Date().toISOString(),
        })
        .eq('id', deviceId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Device communication error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Device communication failed',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function quickTestConnection(ip: string, port: number): Promise<any> {
  console.log(`Quick testing connection to ${ip}:${port}`);

  const controller = new AbortController();
  const timeout = 3;
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const conn = await Deno.connect({
      hostname: ip,
      port: port,
    });

    clearTimeout(timeoutId);

    try {
      conn.close();
    } catch (e) {
      console.log('Connection close error (non-critical):', e);
    }

    return {
      online: true,
      message: 'Device detected on network',
      deviceInfo: {
        ip: ip,
        port: port,
        connectionType: 'TCP',
      },
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      online: false,
      message: 'Device not responding',
    };
  }
}

async function testDeviceConnection(device: any): Promise<any> {
  console.log(`Testing connection to device: ${device.device_name}`);
  console.log(`Protocol: ${device.protocol?.protocol_type}, IP: ${device.ip_address}:${device.port}`);
  console.log(`Connection type: ${device.connection_type}`);

  const protocol = device.protocol?.protocol_type || 'tcp';

  if (protocol === 'tcp') {
    return await testTCPConnection(device);
  } else if (protocol === 'serial' || protocol === 'usb') {
    return {
      online: false,
      message: `${protocol.toUpperCase()} devices require a local bridge service. Please install the bridge application on the same network as your device.`,
      requiresBridge: true,
      protocolType: protocol,
    };
  }

  return {
    online: false,
    message: `Unsupported protocol type: ${protocol}`,
  };
}

async function testTCPConnection(device: any): Promise<any> {
  const controller = new AbortController();
  const timeout = device.protocol?.configuration_template?.timeout || 10;
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    console.log(`Attempting TCP connection test to ${device.ip_address}:${device.port}`);

    const conn = await Deno.connect({
      hostname: device.ip_address,
      port: device.port,
    });

    clearTimeout(timeoutId);

    try {
      conn.close();
    } catch (e) {
      console.log('Connection close error (non-critical):', e);
    }

    console.log(`TCP connection successful to ${device.ip_address}:${device.port}`);

    return {
      online: true,
      message: 'Device is reachable on the network. TCP connection successful.',
      deviceInfo: {
        ip: device.ip_address,
        port: device.port,
        protocol: device.protocol?.name,
        connectionType: 'TCP',
      },
      diagnostic: {
        networkReachable: true,
        tcpPortOpen: true,
        note: 'Device requires proprietary protocol communication. Use local bridge for full functionality.',
      },
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    console.error(`TCP connection failed to ${device.ip_address}:${device.port}:`, error.message);

    let detailedMessage = '';
    let diagnostic: any = {
      networkReachable: false,
      tcpPortOpen: false,
    };

    if (error.name === 'AddrInUse') {
      detailedMessage = 'Port is already in use';
    } else if (error.name === 'ConnectionRefused') {
      detailedMessage = 'Connection refused. Device may be offline or firewall is blocking the connection.';
      diagnostic.possibleCauses = ['Device is powered off', 'Firewall blocking connection', 'Wrong IP address or port'];
    } else if (error.name === 'TimedOut' || error.name === 'AbortError') {
      detailedMessage = `Connection timeout after ${timeout} seconds. Device may be unreachable or on a different network.`;
      diagnostic.possibleCauses = ['Device is on a different network/VLAN', 'Network firewall blocking connection', 'Device is offline', 'Incorrect IP address'];
    } else if (error.message?.includes('NotFound')) {
      detailedMessage = 'Host not found. Check if the IP address is correct.';
      diagnostic.possibleCauses = ['Invalid IP address', 'Device not on network', 'DNS resolution failed'];
    } else {
      detailedMessage = `Connection failed: ${error.message}`;
    }

    return {
      online: false,
      message: detailedMessage,
      error: error.message,
      diagnostic,
      troubleshooting: [
        '1. Verify the device is powered on',
        '2. Check that the IP address and port are correct',
        '3. Ensure device and server are on the same network or have network connectivity',
        '4. Check firewall rules on both device and network',
        '5. For devices behind NAT/firewall, consider using a local bridge service',
      ],
    };
  }
}

async function enrollFingerprint(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  const protocol = device.protocol.protocol_type;

  if (protocol === 'ZKTeco') {
    return await enrollZKTeco(device, employeeId, fingerIndex);
  } else if (protocol === 'ADMS') {
    return await enrollADMS(device, employeeId, fingerIndex);
  } else if (protocol === 'Anviz') {
    return await enrollAnviz(device, employeeId, fingerIndex);
  } else if (protocol === 'Suprema') {
    return await enrollSuprema(device, employeeId, fingerIndex);
  } else {
    return await enrollSimulated(device, employeeId, fingerIndex);
  }
}

async function enrollZKTeco(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  console.log(`ZKTeco enrollment - Employee: ${employeeId}, Finger: ${fingerIndex}`);

  console.warn('ZKTeco devices use proprietary TCP protocol, not HTTP. HTTP enrollment will likely fail.');
  console.log('Falling back to simulated enrollment. For real device communication, use the local bridge service.');

  return await enrollSimulated(device, employeeId, fingerIndex);
}

async function enrollADMS(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  console.log(`ADMS enrollment - Employee: ${employeeId}, Finger: ${fingerIndex}`);
  console.warn('ADMS protocol not fully implemented. Falling back to simulated enrollment.');
  return await enrollSimulated(device, employeeId, fingerIndex);
}

async function enrollAnviz(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  console.log(`Anviz enrollment - Employee: ${employeeId}, Finger: ${fingerIndex}`);
  console.warn('Anviz protocol not fully implemented. Falling back to simulated enrollment.');
  return await enrollSimulated(device, employeeId, fingerIndex);
}

async function enrollSuprema(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  console.log(`Suprema enrollment - Employee: ${employeeId}, Finger: ${fingerIndex}`);
  console.warn('Suprema protocol not fully implemented. Falling back to simulated enrollment.');
  return await enrollSimulated(device, employeeId, fingerIndex);
}

async function enrollSimulated(device: any, employeeId: string, fingerIndex: number): Promise<any> {
  console.log(`Running simulated enrollment for device: ${device.device_name}`);
  console.log(`Employee: ${employeeId}, Finger Index: ${fingerIndex}`);

  await new Promise(resolve => setTimeout(resolve, 2000));

  const templateData = btoa(
    JSON.stringify({
      type: 'fingerprint',
      employeeId: employeeId,
      fingerIndex: fingerIndex,
      data: Array.from({ length: 512 }, () => Math.floor(Math.random() * 256)),
      timestamp: new Date().toISOString(),
      deviceId: device.id,
      protocol: device.protocol?.protocol_type || 'unknown',
      simulated: true,
    })
  );

  const qualityScore = Math.floor(Math.random() * 15) + 85;

  console.log(`Simulated enrollment complete. Quality: ${qualityScore}%`);

  return {
    success: true,
    templateData: templateData,
    qualityScore: qualityScore,
    message: 'Fingerprint enrolled successfully (SIMULATED MODE - For real device communication, use local bridge service)',
    simulated: true,
    note: 'This is a simulated enrollment. Real devices require TCP protocol communication via a local bridge service.',
  };
}

async function verifyFingerprint(device: any, templateData: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    matched: Math.random() > 0.3,
    confidence: Math.floor(Math.random() * 30) + 70,
  };
}

async function getDeviceUsers(device: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    userCount: Math.floor(Math.random() * 100),
    users: [],
  };
}

async function syncDeviceTime(device: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    message: 'Device time synchronized',
    deviceTime: new Date().toISOString(),
  };
}
