/*
  # Auto-Create Employee Records for New Users

  1. New Functions
    - `create_employee_for_new_user()` - Automatically creates employee record when user is created
    - `sync_user_to_employee()` - Keeps employee data in sync with user changes

  2. Triggers
    - After INSERT on users - creates employee record
    - After UPDATE on users - syncs department changes

  3. Benefits
    - No manual employee creation needed
    - Data consistency between users and employees
    - Automatic employee number generation
*/

-- Function to create employee record for new user
CREATE OR REPLACE FUNCTION create_employee_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_number text;
  v_max_number integer;
BEGIN
  -- Generate unique employee number
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 4) AS INTEGER)), 0) + 1
  INTO v_max_number
  FROM employees
  WHERE employee_number ~ '^EMP[0-9]+$';
  
  v_employee_number := 'EMP' || LPAD(v_max_number::text, 4, '0');
  
  -- Create employee record
  INSERT INTO employees (
    user_id,
    employee_number,
    position,
    employment_type,
    hire_date,
    salary,
    status,
    department_id
  ) VALUES (
    NEW.id,
    v_employee_number,
    CASE NEW.role
      WHEN 'admin' THEN 'Administrator'
      WHEN 'hr_manager' THEN 'HR Manager'
      WHEN 'manager' THEN 'Manager'
      ELSE 'Employee'
    END,
    'full_time',
    CURRENT_DATE,
    50000,
    'active',
    NEW.department_id
  );
  
  RETURN NEW;
END;
$$;

-- Function to sync user changes to employee
CREATE OR REPLACE FUNCTION sync_user_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update employee department when user department changes
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    UPDATE employees
    SET department_id = NEW.department_id
    WHERE user_id = NEW.id;
  END IF;
  
  -- Update employee position based on role changes
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE employees
    SET position = CASE NEW.role
      WHEN 'admin' THEN 'Administrator'
      WHEN 'hr_manager' THEN 'HR Manager'
      WHEN 'manager' THEN 'Manager'
      ELSE COALESCE(position, 'Employee')
    END
    WHERE user_id = NEW.id
    AND position IN ('Administrator', 'HR Manager', 'Manager', 'Employee');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS create_employee_on_user_insert ON users;
DROP TRIGGER IF EXISTS sync_user_changes_to_employee ON users;

-- Create trigger for new user insertions
CREATE TRIGGER create_employee_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_employee_for_new_user();

-- Create trigger for user updates
CREATE TRIGGER sync_user_changes_to_employee
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (
    NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.role IS DISTINCT FROM OLD.role
  )
  EXECUTE FUNCTION sync_user_to_employee();

-- Add helpful comments
COMMENT ON FUNCTION create_employee_for_new_user IS 'Automatically creates an employee record when a new user is created';
COMMENT ON FUNCTION sync_user_to_employee IS 'Syncs department and role changes from users to employees table';
COMMENT ON TRIGGER create_employee_on_user_insert ON users IS 'Creates employee record for newly registered users';
COMMENT ON TRIGGER sync_user_changes_to_employee ON users IS 'Keeps employee data in sync with user changes';
