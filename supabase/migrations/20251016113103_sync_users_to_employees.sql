/*
  # Sync Users to Employees

  1. Changes
    - Create employee records for all users that don't have one
    - Set default values for required employee fields
    - Maintain data integrity

  2. Process
    - Find all users without employee records
    - Create employee records with default values
    - Use user's existing department and information
*/

-- Create employee records for all users that don't have one
INSERT INTO employees (
  user_id,
  employee_number,
  position,
  employment_type,
  hire_date,
  salary,
  status
)
SELECT 
  u.id,
  'EMP' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY u.created_at) + 1000 AS TEXT), 4, '0'),
  COALESCE(
    CASE u.role
      WHEN 'admin' THEN 'Administrator'
      WHEN 'hr_manager' THEN 'HR Manager'
      WHEN 'manager' THEN 'Manager'
      ELSE 'Employee'
    END,
    'Employee'
  ),
  'full_time',
  COALESCE(u.created_at::date, CURRENT_DATE),
  50000,
  'active'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.user_id = u.id
)
AND u.id IS NOT NULL;

-- Update employees to ensure they have the correct department from users table
UPDATE employees e
SET department_id = u.department_id
FROM users u
WHERE e.user_id = u.id
AND u.department_id IS NOT NULL
AND (e.department_id IS NULL OR e.department_id != u.department_id);

-- Add comment
COMMENT ON TABLE employees IS 'Automatically synced with users table. Each user should have a corresponding employee record.';
