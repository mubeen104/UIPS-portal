/*
  # Create Comprehensive Attendance Schedule System

  1. New Tables
    - `attendance_schedules`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `day_of_week` (integer, 0-6 where 0 is Sunday)
      - `check_in_time` (time)
      - `check_out_time` (time)
      - `is_working_day` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `employee_leave_allocations`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `leave_type_id` (uuid, foreign key to leave_types)
      - `year` (integer)
      - `allocated_days` (integer)
      - `used_days` (integer, default 0)
      - `remaining_days` (integer, computed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `color` column to existing `leave_types` table
    - Add `leave_type_id` to `leave_requests` table
    - Add `schedule_id` to `attendance` table for tracking against schedules

  3. Security
    - Enable RLS on all new tables
    - Add policies for admin to manage schedules and leave types
    - Add policies for employees to view their own schedules and leave allocations
    - Add policies for super users with appropriate permissions
*/

-- Create attendance_schedules table
CREATE TABLE IF NOT EXISTS attendance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  check_in_time time NOT NULL,
  check_out_time time NOT NULL,
  is_working_day boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);

ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all attendance schedules"
  ON attendance_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Super users can view schedules with permission"
  ON attendance_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
      AND EXISTS (
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid()
        AND p.name = 'manage_attendance'
        AND up.granted = true
      )
    )
  );

CREATE POLICY "Employees can view their own schedules"
  ON attendance_schedules FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Add color column to leave_types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_types' AND column_name = 'color'
  ) THEN
    ALTER TABLE leave_types ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Create employee_leave_allocations table
CREATE TABLE IF NOT EXISTS employee_leave_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  allocated_days integer NOT NULL DEFAULT 0,
  used_days integer DEFAULT 0,
  remaining_days integer GENERATED ALWAYS AS (allocated_days - used_days) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE employee_leave_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage leave allocations"
  ON employee_leave_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Super users can view allocations with permission"
  ON employee_leave_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
      AND EXISTS (
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = auth.uid()
        AND p.name = 'manage_leaves'
        AND up.granted = true
      )
    )
  );

CREATE POLICY "Employees can view their own allocations"
  ON employee_leave_allocations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Add leave_type_id to leave_requests if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'leave_type_id'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN leave_type_id uuid REFERENCES leave_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add schedule_id to attendance if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'schedule_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN schedule_id uuid REFERENCES attendance_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update colors for existing leave types
UPDATE leave_types SET color = '#3B82F6' WHERE name = 'Annual Leave';
UPDATE leave_types SET color = '#EF4444' WHERE name = 'Sick Leave';
UPDATE leave_types SET color = '#F59E0B' WHERE name = 'Casual Leave';
UPDATE leave_types SET color = '#EC4899' WHERE name = 'Maternity Leave';
UPDATE leave_types SET color = '#8B5CF6' WHERE name = 'Paternity Leave';
UPDATE leave_types SET color = '#6B7280' WHERE name = 'Unpaid Leave';

-- Create function to auto-allocate leave when employee is created
CREATE OR REPLACE FUNCTION auto_allocate_leaves_for_new_employee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO employee_leave_allocations (employee_id, leave_type_id, year, allocated_days)
  SELECT 
    NEW.id,
    lt.id,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    lt.annual_quota
  FROM leave_types lt
  WHERE lt.annual_quota > 0
  ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto leave allocation
DROP TRIGGER IF EXISTS trigger_auto_allocate_leaves ON employees;
CREATE TRIGGER trigger_auto_allocate_leaves
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION auto_allocate_leaves_for_new_employee();

-- Create function to update used_days when leave request is approved
CREATE OR REPLACE FUNCTION update_leave_allocation_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.leave_type_id IS NOT NULL THEN
    UPDATE employee_leave_allocations
    SET used_days = used_days + (NEW.end_date::date - NEW.start_date::date + 1),
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date)::integer;
  END IF;
  
  IF NEW.status != 'approved' AND OLD.status = 'approved' AND NEW.leave_type_id IS NOT NULL THEN
    UPDATE employee_leave_allocations
    SET used_days = GREATEST(0, used_days - (NEW.end_date::date - NEW.start_date::date + 1)),
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date)::integer;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave allocation updates
DROP TRIGGER IF EXISTS trigger_update_leave_allocation ON leave_requests;
CREATE TRIGGER trigger_update_leave_allocation
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.leave_type_id IS DISTINCT FROM NEW.leave_type_id)
  EXECUTE FUNCTION update_leave_allocation_on_approval();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_schedules_employee ON attendance_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_schedules_day ON attendance_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_employee ON employee_leave_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_year ON employee_leave_allocations(year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_attendance_schedule ON attendance(schedule_id);
