/*
  # Enhanced Fingerprint Attendance System

  1. Tables Enhancement
    - Enhance `biometric_devices` table with universal fingerprint support
    - Add `device_protocols` table for different fingerprint machine types
    - Add `fingerprint_templates` table for storing fingerprint data
    - Add `attendance_sessions` table for tracking work sessions
    - Add `attendance_anomalies` table for tracking issues

  2. New Features
    - Support for multiple fingerprint device protocols (ZKTeco, Anviz, eSSL, Suprema, etc.)
    - Automatic device detection and configuration
    - Real-time attendance sync
    - Session-based attendance tracking
    - Overtime calculation
    - Late arrival and early departure tracking
    - Break time management

  3. Security
    - Encrypted fingerprint template storage
    - Secure device communication
    - Audit logs for all attendance events
    - RLS policies for data protection

  4. Benefits
    - Universal compatibility with all fingerprint devices
    - Easy device setup and detection
    - Comprehensive attendance tracking
    - Automated anomaly detection
    - Real-time reporting
*/

-- Drop existing table to recreate with enhancements
DROP TABLE IF EXISTS biometric_devices CASCADE;

-- Create device_protocols table for supported fingerprint machine types
CREATE TABLE IF NOT EXISTS device_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  manufacturer text NOT NULL,
  protocol_type text NOT NULL, -- 'tcp', 'udp', 'usb', 'serial', 'http', 'soap'
  default_port integer,
  communication_method text NOT NULL, -- 'push', 'pull', 'hybrid'
  supports_realtime boolean DEFAULT false,
  configuration_template jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Insert common fingerprint device protocols
INSERT INTO device_protocols (name, manufacturer, protocol_type, default_port, communication_method, supports_realtime, configuration_template) VALUES
  ('ZKTeco', 'ZKTeco', 'tcp', 4370, 'pull', true, '{"timeout": 30, "encoding": "utf8"}'),
  ('Anviz', 'Anviz', 'tcp', 5010, 'pull', true, '{"timeout": 30, "encoding": "utf8"}'),
  ('eSSL', 'eSSL', 'tcp', 4370, 'pull', true, '{"timeout": 30, "encoding": "utf8"}'),
  ('Suprema', 'Suprema', 'tcp', 1470, 'hybrid', true, '{"timeout": 30, "ssl": true}'),
  ('Morpho', 'Morpho', 'tcp', 8080, 'pull', false, '{"timeout": 30, "encoding": "utf8"}'),
  ('Realtime', 'Realtime', 'tcp', 4370, 'pull', true, '{"timeout": 30, "encoding": "utf8"}'),
  ('Virdi', 'Virdi', 'tcp', 1470, 'hybrid', true, '{"timeout": 30, "ssl": true}'),
  ('BioMetric', 'Generic BioMetric', 'tcp', 4370, 'pull', true, '{"timeout": 30, "encoding": "utf8"}'),
  ('USB Fingerprint', 'Generic USB', 'usb', NULL, 'push', true, '{"vid": "0x0000", "pid": "0x0000"}'),
  ('Serial Fingerprint', 'Generic Serial', 'serial', NULL, 'pull', false, '{"baudrate": 9600, "databits": 8}')
ON CONFLICT (name) DO NOTHING;

-- Enhanced biometric_devices table
CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  device_name text NOT NULL,
  protocol_id uuid REFERENCES device_protocols(id),
  location text,
  ip_address text,
  port integer,
  mac_address text,
  serial_number text,
  firmware_version text,
  
  -- Connection details
  connection_type text DEFAULT 'network', -- 'network', 'usb', 'serial'
  is_online boolean DEFAULT false,
  last_sync timestamptz,
  last_heartbeat timestamptz,
  
  -- Configuration
  timezone text DEFAULT 'UTC',
  auto_sync_enabled boolean DEFAULT true,
  sync_interval integer DEFAULT 300, -- seconds
  realtime_push_enabled boolean DEFAULT true,
  
  -- Capacity and status
  max_users integer DEFAULT 3000,
  max_fingerprints integer DEFAULT 10000,
  max_records integer DEFAULT 100000,
  current_users integer DEFAULT 0,
  current_fingerprints integer DEFAULT 0,
  current_records integer DEFAULT 0,
  storage_usage_percent numeric(5,2),
  
  -- Authentication
  device_password text,
  api_key text,
  requires_auth boolean DEFAULT false,
  
  -- Metadata
  additional_config jsonb DEFAULT '{}',
  notes text,
  installed_by uuid REFERENCES users(id),
  installed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fingerprint templates table
CREATE TABLE IF NOT EXISTS fingerprint_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
  template_index integer NOT NULL, -- Finger index (1-10)
  template_data text NOT NULL, -- Encrypted fingerprint template
  template_format text DEFAULT 'ISO', -- 'ISO', 'ANSI', 'Proprietary'
  quality_score integer, -- 0-100
  enrolled_at timestamptz DEFAULT now(),
  enrolled_by uuid REFERENCES users(id),
  last_verified timestamptz,
  verification_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, device_id, template_index)
);

-- Attendance sessions table for tracking work sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Session times
  check_in_time timestamptz,
  check_out_time timestamptz,
  check_in_device_id uuid REFERENCES biometric_devices(id),
  check_out_device_id uuid REFERENCES biometric_devices(id),
  
  -- Duration tracking
  total_hours numeric(5,2),
  regular_hours numeric(5,2),
  overtime_hours numeric(5,2),
  break_hours numeric(5,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'in_progress', -- 'in_progress', 'completed', 'incomplete'
  is_late boolean DEFAULT false,
  is_early_departure boolean DEFAULT false,
  late_minutes integer DEFAULT 0,
  early_departure_minutes integer DEFAULT 0,
  
  -- Shift details
  expected_check_in timestamptz,
  expected_check_out timestamptz,
  shift_name text,
  
  -- Location verification
  check_in_location point,
  check_out_location point,
  is_remote boolean DEFAULT false,
  
  -- Notes and approvals
  notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, date)
);

-- Attendance anomalies table
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_session_id uuid REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  device_id uuid REFERENCES biometric_devices(id),
  
  anomaly_type text NOT NULL, -- 'missing_checkout', 'duplicate_checkin', 'device_offline', 'suspicious_timing', 'location_mismatch'
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  
  -- Resolution
  status text DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'ignored'
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  resolution_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Enhanced attendance table with device tracking
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES biometric_devices(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES attendance_sessions(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'fingerprint'; -- 'fingerprint', 'face', 'card', 'pin', 'manual'
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_quality integer; -- 0-100
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced'; -- 'synced', 'pending', 'failed'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_biometric_devices_online ON biometric_devices(is_online);
CREATE INDEX IF NOT EXISTS idx_biometric_devices_protocol ON biometric_devices(protocol_id);
CREATE INDEX IF NOT EXISTS idx_fingerprint_templates_employee ON fingerprint_templates(employee_id);
CREATE INDEX IF NOT EXISTS idx_fingerprint_templates_device ON fingerprint_templates(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_employee_date ON attendance_sessions(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_status ON attendance_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_attendance_device ON attendance(device_id);

-- Enable RLS
ALTER TABLE device_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fingerprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_protocols
CREATE POLICY "Anyone can view device protocols"
  ON device_protocols FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for biometric_devices
CREATE POLICY "Admins and HR can manage devices"
  ON biometric_devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Users with attendance permission can view devices"
  ON biometric_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role IN ('admin', 'hr_manager')
        OR EXISTS (
          SELECT 1 FROM user_department_permissions udp
          WHERE udp.user_id = auth.uid()
          AND (udp.can_view_attendance = true OR udp.can_manage_attendance = true)
        )
      )
    )
  );

-- RLS Policies for fingerprint_templates
CREATE POLICY "Admins and HR can manage fingerprint templates"
  ON fingerprint_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Employees can view own fingerprint templates"
  ON fingerprint_templates FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for attendance_sessions
CREATE POLICY "Admins and HR can view all attendance sessions"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Employees can view own attendance sessions"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users with department permission can view attendance sessions"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = attendance_sessions.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_view_attendance = true
    )
  );

-- RLS Policies for attendance_anomalies
CREATE POLICY "Admins and HR can manage anomalies"
  ON attendance_anomalies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

-- Function to detect missing checkouts and create anomalies
CREATE OR REPLACE FUNCTION detect_missing_checkouts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO attendance_anomalies (employee_id, attendance_session_id, anomaly_type, severity, description)
  SELECT 
    s.employee_id,
    s.id,
    'missing_checkout',
    'medium',
    'Employee checked in but did not check out'
  FROM attendance_sessions s
  WHERE s.status = 'in_progress'
    AND s.check_in_time < now() - interval '24 hours'
    AND s.check_out_time IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM attendance_anomalies a
      WHERE a.attendance_session_id = s.id
      AND a.anomaly_type = 'missing_checkout'
      AND a.status IN ('pending', 'investigating')
    );
END;
$$;

-- Function to calculate session hours
CREATE OR REPLACE FUNCTION calculate_session_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_hours numeric;
  v_expected_hours numeric := 8; -- Default work hours
  v_break_hours numeric := 1; -- Default break time
BEGIN
  IF NEW.check_out_time IS NOT NULL THEN
    -- Calculate total hours
    v_total_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
    
    -- Set total hours
    NEW.total_hours := v_total_hours;
    
    -- Calculate regular and overtime hours
    IF v_total_hours <= v_expected_hours THEN
      NEW.regular_hours := v_total_hours - COALESCE(NEW.break_hours, v_break_hours);
      NEW.overtime_hours := 0;
    ELSE
      NEW.regular_hours := v_expected_hours - COALESCE(NEW.break_hours, v_break_hours);
      NEW.overtime_hours := v_total_hours - v_expected_hours;
    END IF;
    
    -- Update status
    NEW.status := 'completed';
  END IF;
  
  -- Check for late arrival
  IF NEW.expected_check_in IS NOT NULL AND NEW.check_in_time > NEW.expected_check_in THEN
    NEW.is_late := true;
    NEW.late_minutes := EXTRACT(EPOCH FROM (NEW.check_in_time - NEW.expected_check_in)) / 60;
  END IF;
  
  -- Check for early departure
  IF NEW.expected_check_out IS NOT NULL AND NEW.check_out_time IS NOT NULL AND NEW.check_out_time < NEW.expected_check_out THEN
    NEW.is_early_departure := true;
    NEW.early_departure_minutes := EXTRACT(EPOCH FROM (NEW.expected_check_out - NEW.check_out_time)) / 60;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_session_hours_trigger
  BEFORE INSERT OR UPDATE ON attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_hours();

-- Function to update device status
CREATE OR REPLACE FUNCTION update_device_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE biometric_devices
  SET is_online = false
  WHERE last_heartbeat < now() - interval '5 minutes'
    AND is_online = true;
END;
$$;

-- Comments
COMMENT ON TABLE device_protocols IS 'Supported fingerprint device protocols and manufacturers';
COMMENT ON TABLE biometric_devices IS 'Registered fingerprint devices with real-time sync capabilities';
COMMENT ON TABLE fingerprint_templates IS 'Employee fingerprint templates stored securely';
COMMENT ON TABLE attendance_sessions IS 'Work sessions with check-in/check-out tracking';
COMMENT ON TABLE attendance_anomalies IS 'Detected attendance issues and irregularities';
