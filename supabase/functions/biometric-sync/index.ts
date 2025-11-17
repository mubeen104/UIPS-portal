import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { device_id, logs } = await req.json();

    if (!device_id || !logs || !Array.isArray(logs)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. device_id and logs array required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get device
    const { data: device, error: deviceError } = await supabase
      .from('biometric_devices')
      .select('id')
      .eq('device_id', device_id)
      .maybeSingle();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process logs
    const processedLogs = [];
    const errors = [];

    for (const log of logs) {
      try {
        // Find employee by employee number or biometric template
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_number', log.employee_number)
          .maybeSingle();

        if (employee) {
          // Insert attendance log
          const { error: logError } = await supabase
            .from('attendance_logs')
            .insert({
              device_id: device.id,
              employee_id: employee.id,
              log_time: log.timestamp,
              log_type: log.type || 'check_in',
              verification_method: log.method || 'fingerprint',
              match_score: log.score || null,
              temperature: log.temperature || null,
            });

          if (logError) {
            errors.push({ log, error: logError.message });
          } else {
            processedLogs.push(log);
          }
        } else {
          errors.push({ log, error: 'Employee not found' });
        }
      } catch (error) {
        errors.push({ log, error: error.message });
      }
    }

    // Update device last sync
    await supabase
      .from('biometric_devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', device.id);

    // Log sync
    await supabase
      .from('device_sync_logs')
      .insert({
        device_id: device.id,
        sync_time: new Date().toISOString(),
        records_synced: processedLogs.length,
        status: errors.length > 0 ? 'partial' : 'success',
        error_message: errors.length > 0 ? JSON.stringify(errors) : null,
      });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedLogs.length,
        errors: errors.length,
        details: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});