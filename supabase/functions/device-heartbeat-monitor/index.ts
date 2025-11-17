import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    console.log('Starting device heartbeat monitoring...');

    const { data: devices, error: devicesError } = await supabaseClient
      .from('biometric_devices')
      .select('*');

    if (devicesError) {
      throw new Error(`Failed to fetch devices: ${devicesError.message}`);
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No devices to monitor',
          totalDevices: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Monitoring ${devices.length} devices...`);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const results = {
      totalDevices: devices.length,
      onlineDevices: 0,
      offlineDevices: 0,
      staleDevices: 0,
      deviceStatuses: [] as any[],
    };

    for (const device of devices) {
      try {
        let isOnline = false;
        let status = 'offline';
        let message = '';

        const lastHeartbeat = device.last_heartbeat ? new Date(device.last_heartbeat) : null;

        if (lastHeartbeat && lastHeartbeat > fiveMinutesAgo) {
          isOnline = true;
          status = 'online';
          message = 'Device responding within expected interval';
          results.onlineDevices++;
        } else if (lastHeartbeat) {
          status = 'stale';
          const minutesSinceLastHeartbeat = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 60000);
          message = `Last heartbeat ${minutesSinceLastHeartbeat} minutes ago`;
          results.staleDevices++;
        } else {
          status = 'unknown';
          message = 'No heartbeat recorded yet';
          results.offlineDevices++;
        }

        if (device.is_online !== isOnline) {
          await supabaseClient
            .from('biometric_devices')
            .update({ is_online: isOnline })
            .eq('id', device.id);

          console.log(`Updated ${device.device_name} status: ${status}`);
        }

        results.deviceStatuses.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          status,
          isOnline,
          lastHeartbeat: device.last_heartbeat,
          message,
        });
      } catch (error: any) {
        console.error(`Error monitoring device ${device.device_name}:`, error);
        results.deviceStatuses.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`Heartbeat monitoring complete: ${results.onlineDevices} online, ${results.offlineDevices} offline, ${results.staleDevices} stale`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Monitored ${devices.length} devices`,
        ...results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Heartbeat monitoring error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Heartbeat monitoring failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
