/*
  # Attendance-Leave Integration System

  1. New Features
    - Automatic absence detection and leave deduction
    - Daily attendance processing
    - Leave request integration with attendance
    - Absence tracking and reporting
    
  2. New Tables
    - `attendance_summary` - Daily attendance summary per employee
    - `absence_records` - Tracks absences and their impact on leave balances
    
  3. Functions & Triggers
    - Auto-create attendance records for approved leaves
    - Auto-detect absences and deduct from leave balance
    - Daily attendance summary calculation
    - Leave request approval creates attendance records
    
  4. Security
    - RLS policies for all new tables
    - Admin and manager access controls
*/

-- Create attendance_summary table for daily summaries
CREATE TABLE IF NOT EXISTS attendance_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_check_in time,
  scheduled_check_out time,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  late_by_minutes integer DEFAULT 0,
  early_leave_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  total_hours numeric DEFAULT 0,
  is_leave boolean DEFAULT false,
  leave_type_id uuid REFERENCES leave_types(id),
  is_holiday boolean DEFAULT false,
  is_weekend boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create absence_records table
CREATE TABLE IF NOT EXISTS absence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  absence_type text NOT NULL,
  leave_deducted boolean DEFAULT false,
  leave_type_id uuid REFERENCES leave_types(id),
  days_deducted numeric DEFAULT 0,
  notes text,
  processed_at timestamptz DEFAULT now(),
  processed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_summary
CREATE POLICY "Employees can view own attendance summary"
  ON attendance_summary FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all attendance summaries"
  ON attendance_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Managers can view department attendance summaries"
  ON attendance_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = attendance_summary.employee_id
        AND e.department_id IN (
          SELECT department_id FROM employees WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can manage attendance summaries"
  ON attendance_summary FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for absence_records
CREATE POLICY "Employees can view own absence records"
  ON absence_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all absence records"
  ON absence_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage absence records"
  ON absence_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to create attendance records when leave is approved
CREATE OR REPLACE FUNCTION create_attendance_for_approved_leave()
RETURNS TRIGGER AS $$
DECLARE
  current_date date;
  leave_days_count integer;
BEGIN
  -- Only process when leave is approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Calculate total days in leave period
    leave_days_count := (NEW.end_date - NEW.start_date) + 1;
    
    -- Create attendance records for each day in the leave period
    FOR current_date IN 
      SELECT generate_series(NEW.start_date::date, NEW.end_date::date, '1 day'::interval)::date
    LOOP
      -- Insert or update attendance record
      INSERT INTO attendance (
        employee_id,
        date,
        status,
        notes,
        entry_source,
        entered_by
      ) VALUES (
        NEW.employee_id,
        current_date,
        'leave',
        'Approved leave: ' || NEW.reason,
        'leave_system',
        NEW.approver_id
      )
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET
        status = 'leave',
        notes = 'Approved leave: ' || NEW.reason,
        modified_at = now();
        
      -- Create attendance summary
      INSERT INTO attendance_summary (
        employee_id,
        date,
        status,
        is_leave,
        leave_type_id,
        notes
      ) VALUES (
        NEW.employee_id,
        current_date,
        'leave',
        true,
        NEW.leave_type_id,
        'Approved leave: ' || NEW.reason
      )
      ON CONFLICT (employee_id, date)
      DO UPDATE SET
        status = 'leave',
        is_leave = true,
        leave_type_id = NEW.leave_type_id,
        notes = 'Approved leave: ' || NEW.reason,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave approval
DROP TRIGGER IF EXISTS on_leave_approved_create_attendance ON leave_requests;
CREATE TRIGGER on_leave_approved_create_attendance
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_attendance_for_approved_leave();

-- Function to detect absences and process leave deductions
CREATE OR REPLACE FUNCTION process_daily_absences()
RETURNS void AS $$
DECLARE
  emp_record RECORD;
  absence_date date;
  default_leave_type uuid;
BEGIN
  absence_date := CURRENT_DATE - INTERVAL '1 day';
  
  -- Get default annual leave type
  SELECT id INTO default_leave_type
  FROM leave_types
  WHERE name ILIKE '%annual%' OR name ILIKE '%casual%'
  LIMIT 1;
  
  -- Process absences for employees who should have checked in but didn't
  FOR emp_record IN
    SELECT DISTINCT e.id as employee_id, e.user_id
    FROM employees e
    INNER JOIN attendance_schedules asch ON asch.employee_id = e.id
    WHERE asch.day_of_week = EXTRACT(DOW FROM absence_date)::integer
    AND asch.is_working_day = true
    AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.employee_id = e.id
      AND a.date = absence_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM leave_requests lr
      WHERE lr.employee_id = e.id
      AND lr.status = 'approved'
      AND absence_date BETWEEN lr.start_date AND lr.end_date
    )
  LOOP
    -- Create absence record
    INSERT INTO absence_records (
      employee_id,
      date,
      absence_type,
      leave_deducted,
      leave_type_id,
      days_deducted,
      notes
    ) VALUES (
      emp_record.employee_id,
      absence_date,
      'unmarked_absence',
      true,
      default_leave_type,
      1,
      'Auto-detected absence'
    )
    ON CONFLICT (employee_id, date) DO NOTHING;
    
    -- Deduct from leave balance
    IF default_leave_type IS NOT NULL THEN
      UPDATE leave_balances
      SET 
        used_days = used_days + 1,
        remaining_days = remaining_days - 1,
        updated_at = now()
      WHERE employee_id = emp_record.employee_id
      AND leave_type_id = default_leave_type
      AND year = EXTRACT(YEAR FROM absence_date)::integer
      AND remaining_days > 0;
    END IF;
    
    -- Create attendance record
    INSERT INTO attendance (
      employee_id,
      date,
      status,
      notes,
      entry_source
    ) VALUES (
      emp_record.employee_id,
      absence_date,
      'absent',
      'Auto-marked absent - Leave deducted',
      'auto_system'
    )
    ON CONFLICT (employee_id, date) DO NOTHING;
    
    -- Update attendance summary
    INSERT INTO attendance_summary (
      employee_id,
      date,
      status,
      notes
    ) VALUES (
      emp_record.employee_id,
      absence_date,
      'absent',
      'Auto-marked absent - Leave deducted'
    )
    ON CONFLICT (employee_id, date)
    DO UPDATE SET
      status = 'absent',
      notes = 'Auto-marked absent - Leave deducted',
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate attendance summary
CREATE OR REPLACE FUNCTION calculate_attendance_summary(
  p_employee_id uuid,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_attendance RECORD;
  v_schedule RECORD;
  v_late_minutes integer := 0;
  v_early_minutes integer := 0;
  v_overtime_minutes integer := 0;
  v_total_hours numeric := 0;
  v_day_of_week integer;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
  
  -- Get attendance record
  SELECT * INTO v_attendance
  FROM attendance
  WHERE employee_id = p_employee_id
  AND date = p_date;
  
  -- Get schedule
  SELECT * INTO v_schedule
  FROM attendance_schedules
  WHERE employee_id = p_employee_id
  AND day_of_week = v_day_of_week;
  
  -- Calculate metrics if attendance exists
  IF v_attendance.id IS NOT NULL AND v_attendance.check_in IS NOT NULL THEN
    -- Calculate late arrival
    IF v_schedule.check_in_time IS NOT NULL AND v_attendance.check_in IS NOT NULL THEN
      v_late_minutes := GREATEST(0, 
        EXTRACT(EPOCH FROM (v_attendance.check_in::time - v_schedule.check_in_time)) / 60
      )::integer;
    END IF;
    
    -- Calculate early leave
    IF v_schedule.check_out_time IS NOT NULL AND v_attendance.check_out IS NOT NULL THEN
      v_early_minutes := GREATEST(0,
        EXTRACT(EPOCH FROM (v_schedule.check_out_time - v_attendance.check_out::time)) / 60
      )::integer;
    END IF;
    
    -- Calculate total hours
    IF v_attendance.check_in IS NOT NULL AND v_attendance.check_out IS NOT NULL THEN
      v_total_hours := EXTRACT(EPOCH FROM (v_attendance.check_out - v_attendance.check_in)) / 3600;
      
      -- Calculate overtime
      IF v_schedule.check_in_time IS NOT NULL AND v_schedule.check_out_time IS NOT NULL THEN
        DECLARE
          scheduled_hours numeric;
        BEGIN
          scheduled_hours := EXTRACT(EPOCH FROM (v_schedule.check_out_time - v_schedule.check_in_time)) / 3600;
          v_overtime_minutes := GREATEST(0, ((v_total_hours - scheduled_hours) * 60))::integer;
        END;
      END IF;
    END IF;
  END IF;
  
  -- Insert or update summary
  INSERT INTO attendance_summary (
    employee_id,
    date,
    status,
    scheduled_check_in,
    scheduled_check_out,
    actual_check_in,
    actual_check_out,
    late_by_minutes,
    early_leave_minutes,
    overtime_minutes,
    total_hours,
    is_weekend,
    updated_at
  ) VALUES (
    p_employee_id,
    p_date,
    COALESCE(v_attendance.status, 'absent'),
    v_schedule.check_in_time,
    v_schedule.check_out_time,
    v_attendance.check_in,
    v_attendance.check_out,
    v_late_minutes,
    v_early_minutes,
    v_overtime_minutes,
    v_total_hours,
    (v_schedule.is_working_day IS NULL OR v_schedule.is_working_day = false),
    now()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    status = COALESCE(v_attendance.status, 'absent'),
    scheduled_check_in = v_schedule.check_in_time,
    scheduled_check_out = v_schedule.check_out_time,
    actual_check_in = v_attendance.check_in,
    actual_check_out = v_attendance.check_out,
    late_by_minutes = v_late_minutes,
    early_leave_minutes = v_early_minutes,
    overtime_minutes = v_overtime_minutes,
    total_hours = v_total_hours,
    is_weekend = (v_schedule.is_working_day IS NULL OR v_schedule.is_working_day = false),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-calculate summary when attendance is updated
CREATE OR REPLACE FUNCTION trigger_calculate_attendance_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_attendance_summary(NEW.employee_id, NEW.date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_attendance_change_calculate_summary ON attendance;
CREATE TRIGGER on_attendance_change_calculate_summary
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_attendance_summary();

-- Add unique constraint on attendance if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_employee_id_date_key'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_summary_employee_date ON attendance_summary(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_date ON attendance_summary(date);
CREATE INDEX IF NOT EXISTS idx_absence_records_employee_date ON absence_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_absence_records_date ON absence_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(date, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date, status);
