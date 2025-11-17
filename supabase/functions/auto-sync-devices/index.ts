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

    console.log('Starting automatic device synchronization...');

    const { data: devices, error: devicesError } = await supabaseClient
      .from('biometric_devices')
      .select('*')
      .eq('auto_sync_enabled', true)
      .eq('is_online', true);

    if (devicesError) {
      throw new Error(`Failed to fetch devices: ${devicesError.message}`);
    }

    if (!devices || devices.length === 0) {
      console.log('No devices configured for auto-sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No devices configured for auto-sync',
          devicesSynced: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${devices.length} devices for synchronization`);

    const syncResults = [];
    let totalRecordsSynced = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;

    for (const device of devices) {
      try {
        console.log(`Syncing device: ${device.device_name} (${device.device_id})`);

        const syncResult = await syncDeviceAttendance(supabaseClient, device);

        syncResults.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          ...syncResult,
        });

        if (syncResult.success) {
          successfulSyncs++;
          totalRecordsSynced += syncResult.recordsSynced || 0;
        } else {
          failedSyncs++;
        }

        await supabaseClient
          .from('device_sync_logs')
          .insert({
            device_id: device.id,
            sync_time: new Date().toISOString(),
            records_synced: syncResult.recordsSynced || 0,
            status: syncResult.success ? 'success' : 'failed',
            error_message: syncResult.error || null,
          });

      } catch (error: any) {
        console.error(`Failed to sync device ${device.device_name}:`, error);
        failedSyncs++;
        syncResults.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`Sync complete: ${successfulSyncs} successful, ${failedSyncs} failed, ${totalRecordsSynced} total records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronized ${devices.length} devices`,
        summary: {
          totalDevices: devices.length,
          successfulSyncs,
          failedSyncs,
          totalRecordsSynced,
        },
        results: syncResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Auto-sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Auto-sync failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function syncDeviceAttendance(supabaseClient: any, device: any) {
  try {
    const bridgeUrl = Deno.env.get('BIOMETRIC_BRIDGE_URL') || 'http://localhost:3001';

    console.log(`Attempting to sync from bridge: ${bridgeUrl}`);

    const response = await fetch(`${bridgeUrl}/device/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: device.id,
        deviceDbId: device.device_id,
        ip: device.ip_address,
        port: device.port,
        protocol: device.protocol?.name || 'ZKTeco',
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        recordsSynced: 0,
        error: result.message || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();

    await supabaseClient
      .from('biometric_devices')
      .update({
        last_sync: new Date().toISOString(),
        current_records: (device.current_records || 0) + (result.recordsSynced || 0),
      })
      .eq('id', device.id);

    return {
      success: result.success || true,
      recordsSynced: result.recordsSynced || 0,
      message: result.message || 'Sync completed',
    };
  } catch (error: any) {
    console.error(`Device sync error for ${device.device_name}:`, error);

    return {
      success: false,
      recordsSynced: 0,
      error: error.message || 'Network error',
    };
  }
}
