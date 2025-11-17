/*
  # Add Constraint to Prevent Manual Attendance Override of Leave

  1. New Features
    - Trigger to prevent manual attendance updates on approved leave days
    - Warning system for administrators attempting to override leave
    
  2. Changes
    - Add trigger that validates attendance changes against approved leaves
    - Prevent status changes from 'leave' to other statuses when leave is approved
    
  3. Security
    - Protects leave integrity
    - Prevents accidental or malicious override of approved leaves
*/

-- Function to validate attendance against approved leave
CREATE OR REPLACE FUNCTION validate_attendance_against_leave()
RETURNS TRIGGER AS $$
DECLARE
  v_has_approved_leave boolean;
BEGIN
  -- Check if trying to change status from 'leave' or to non-leave status
  IF (TG_OP = 'UPDATE' AND OLD.status = 'leave' AND NEW.status != 'leave') 
     OR (TG_OP = 'INSERT' AND NEW.status != 'leave') THEN
    
    -- Check if employee has approved leave on this date
    SELECT EXISTS (
      SELECT 1 
      FROM leave_requests
      WHERE employee_id = NEW.employee_id
      AND status = 'approved'
      AND NEW.date BETWEEN start_date AND end_date
    ) INTO v_has_approved_leave;
    
    -- If approved leave exists, prevent the change
    IF v_has_approved_leave THEN
      -- For INSERT operations, change status to 'leave'
      IF TG_OP = 'INSERT' THEN
        NEW.status := 'leave';
        NEW.notes := COALESCE(NEW.notes || ' | ', '') || 'Auto-corrected: Employee has approved leave on this date';
        RETURN NEW;
      END IF;
      
      -- For UPDATE operations, keep the old leave status
      IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Cannot change attendance status from leave. Employee has approved leave from % to %. Please cancel the leave request first.', 
          (SELECT start_date FROM leave_requests 
           WHERE employee_id = NEW.employee_id 
           AND status = 'approved' 
           AND NEW.date BETWEEN start_date AND end_date 
           LIMIT 1),
          (SELECT end_date FROM leave_requests 
           WHERE employee_id = NEW.employee_id 
           AND status = 'approved' 
           AND NEW.date BETWEEN start_date AND end_date 
           LIMIT 1);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate attendance changes
DROP TRIGGER IF EXISTS validate_attendance_leave_trigger ON attendance;
CREATE TRIGGER validate_attendance_leave_trigger
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_against_leave();

-- Add comment explaining the trigger
COMMENT ON TRIGGER validate_attendance_leave_trigger ON attendance IS 
'Validates that attendance records do not override approved leave status. 
Prevents changing attendance from leave status when approved leave exists.
Automatically corrects new attendance entries to leave status if approved leave exists.';
