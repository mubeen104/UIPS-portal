/*
  # Prevent Attendance Marking on Approved Leave Days

  1. Changes
    - Update `process_attendance_log()` function to check for approved leave
    - Skip attendance processing if employee has approved leave on that date
    - Prevent biometric devices from overriding approved leave status
    
  2. Behavior
    - When attendance log is received for a date with approved leave, it will be logged but not processed
    - Attendance record status remains as 'leave' for approved leave days
    - Biometric check-ins/check-outs are ignored for days with approved leave
    
  3. Security
    - No RLS changes needed
    - Function maintains SECURITY DEFINER for automated processing
*/

-- Update the process_attendance_log function to check for approved leave
CREATE OR REPLACE FUNCTION process_attendance_log()
RETURNS TRIGGER AS $$
DECLARE
  v_has_approved_leave boolean;
  v_attendance_date date;
BEGIN
  -- Get the date from the log time
  v_attendance_date := NEW.log_time::date;
  
  -- Check if employee has approved leave on this date
  SELECT EXISTS (
    SELECT 1 
    FROM leave_requests
    WHERE employee_id = NEW.employee_id
    AND status = 'approved'
    AND v_attendance_date BETWEEN start_date AND end_date
  ) INTO v_has_approved_leave;
  
  -- If employee has approved leave, don't process the attendance log
  IF v_has_approved_leave THEN
    -- Mark log as processed but don't create/update attendance record
    NEW.processed := true;
    
    -- Add a note to the log indicating it was skipped due to approved leave
    NEW.notes := COALESCE(NEW.notes || ' | ', '') || 'Skipped: Employee on approved leave';
    
    RETURN NEW;
  END IF;
  
  -- Process normally if no approved leave
  -- Auto-process attendance log to attendance table
  INSERT INTO attendance (employee_id, date, check_in, status, notes, entry_source)
  VALUES (
    NEW.employee_id,
    v_attendance_date,
    NEW.log_time,
    'present',
    'Auto-marked via ' || NEW.verification_method,
    'biometric_device'
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    -- Only update if current status is not 'leave'
    check_out = CASE 
      WHEN attendance.status = 'leave' THEN attendance.check_out
      WHEN NEW.log_type = 'check_out' THEN NEW.log_time
      ELSE attendance.check_out
    END,
    check_in = CASE
      WHEN attendance.status = 'leave' THEN attendance.check_in
      WHEN NEW.log_type = 'check_in' AND attendance.check_in IS NULL THEN NEW.log_time
      ELSE attendance.check_in
    END,
    status = CASE
      WHEN attendance.status = 'leave' THEN 'leave'
      ELSE 'present'
    END,
    notes = CASE
      WHEN attendance.status = 'leave' THEN attendance.notes
      ELSE attendance.notes || ' | ' || NEW.log_type || ' at ' || NEW.log_time::text
    END,
    modified_at = CASE
      WHEN attendance.status = 'leave' THEN attendance.modified_at
      ELSE now()
    END
  WHERE attendance.status != 'leave';

  -- Mark log as processed
  NEW.processed := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function behavior
COMMENT ON FUNCTION process_attendance_log() IS 
'Processes biometric attendance logs into attendance records. 
Automatically skips processing if employee has approved leave on the date.
This ensures approved leaves cannot be overridden by biometric device check-ins.';
