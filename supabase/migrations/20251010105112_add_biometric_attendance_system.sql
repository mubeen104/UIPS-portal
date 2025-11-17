/*
  # Biometric Attendance System

  1. New Tables
    - `biometric_devices` - Registered fingerprint devices
      - `id` (uuid, primary key)
      - `device_name` (text) - Name of the device
      - `device_id` (text, unique) - Unique identifier from device
      - `device_type` (text) - Type of device (fingerprint, face, card)
      - `location` (text) - Physical location of device
      - `ip_address` (text) - Network IP address
      - `port` (integer) - Network port
      - `status` (text) - active, inactive, maintenance
      - `last_sync` (timestamptz) - Last sync time
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `biometric_templates` - Employee biometric data
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references employees)
      - `template_type` (text) - fingerprint, face, card
      - `template_data` (text) - Encrypted template data
      - `finger_position` (text) - left_thumb, right_index, etc
      - `quality_score` (integer) - Template quality (0-100)
      - `enrolled_at` (timestamptz)
      - `enrolled_by` (uuid, references users)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `attendance_logs` - Raw attendance logs from devices
      - `id` (uuid, primary key)
      - `device_id` (uuid, references biometric_devices)
      - `employee_id` (uuid, references employees)
      - `log_time` (timestamptz)
      - `log_type` (text) - check_in, check_out, break_start, break_end
      - `verification_method` (text) - fingerprint, face, card, manual
      - `match_score` (integer) - Biometric match score
      - `temperature` (numeric) - Body temperature if available
      - `photo_url` (text) - Photo captured during log
      - `processed` (boolean) - Whether log has been processed to attendance
      - `created_at` (timestamptz)

    - `device_sync_logs` - Device synchronization history
      - `id` (uuid, primary key)
      - `device_id` (uuid, references biometric_devices)
      - `sync_time` (timestamptz)
      - `records_synced` (integer)
      - `status` (text) - success, failed, partial
      - `error_message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - HR and admins can manage devices
    - Employees can view their own biometric data
    - All users can view device locations for check-in

  3. Indexes
    - Indexes on foreign keys and frequently queried columns
*/

-- Biometric Devices
CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  device_id text UNIQUE NOT NULL,
  device_type text NOT NULL DEFAULT 'fingerprint',
  location text NOT NULL,
  ip_address text,
  port integer,
  status text NOT NULL DEFAULT 'active',
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Biometric Templates
CREATE TABLE IF NOT EXISTS biometric_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  template_type text NOT NULL DEFAULT 'fingerprint',
  template_data text NOT NULL,
  finger_position text,
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  enrolled_at timestamptz DEFAULT now(),
  enrolled_by uuid REFERENCES users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Attendance Logs
CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES biometric_devices(id),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  log_time timestamptz NOT NULL DEFAULT now(),
  log_type text NOT NULL DEFAULT 'check_in',
  verification_method text NOT NULL DEFAULT 'fingerprint',
  match_score integer CHECK (match_score >= 0 AND match_score <= 100),
  temperature numeric(4, 1),
  photo_url text,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Device Sync Logs
CREATE TABLE IF NOT EXISTS device_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES biometric_devices(id) ON DELETE CASCADE,
  sync_time timestamptz NOT NULL DEFAULT now(),
  records_synced integer DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_biometric_templates_employee ON biometric_templates(employee_id);
CREATE INDEX IF NOT EXISTS idx_biometric_templates_active ON biometric_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_device ON attendance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_time ON attendance_logs(log_time);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_processed ON attendance_logs(processed);
CREATE INDEX IF NOT EXISTS idx_device_sync_logs_device ON device_sync_logs(device_id);

-- Enable RLS
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for biometric_devices
CREATE POLICY "Authenticated users can view devices"
  ON biometric_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR and admins can manage devices"
  ON biometric_devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for biometric_templates
CREATE POLICY "Employees can view own templates"
  ON biometric_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = biometric_templates.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and admins can manage templates"
  ON biometric_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_logs
CREATE POLICY "Employees can view own attendance logs"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = attendance_logs.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and managers can view all logs"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

CREATE POLICY "Devices can create attendance logs"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "HR and admins can manage logs"
  ON attendance_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for device_sync_logs
CREATE POLICY "HR and admins can view sync logs"
  ON device_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "System can create sync logs"
  ON device_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to process attendance logs
CREATE OR REPLACE FUNCTION process_attendance_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-process attendance log to attendance table
  INSERT INTO attendance (employee_id, date, check_in, status, notes)
  VALUES (
    NEW.employee_id,
    NEW.log_time::date,
    NEW.log_time,
    'present',
    'Auto-marked via ' || NEW.verification_method
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    check_out = CASE 
      WHEN NEW.log_type = 'check_out' THEN NEW.log_time
      ELSE attendance.check_out
    END,
    check_in = CASE
      WHEN NEW.log_type = 'check_in' AND attendance.check_in IS NULL THEN NEW.log_time
      ELSE attendance.check_in
    END,
    notes = attendance.notes || ' | ' || NEW.log_type || ' at ' || NEW.log_time::text;

  -- Mark log as processed
  NEW.processed := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-process attendance logs
DROP TRIGGER IF EXISTS trigger_process_attendance_log ON attendance_logs;
CREATE TRIGGER trigger_process_attendance_log
  BEFORE INSERT ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION process_attendance_log();
