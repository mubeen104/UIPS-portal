/*
  # Enhance Manager Controls for Department Employees

  1. New Policies
    - Allow managers to view payslips of their department employees
    - Allow managers to update attendance records for their department
    - Ensure managers can manage all aspects of their assigned departments

  2. Security
    - Managers can only access data for departments they manage
    - Uses department_managers table to verify authorization
    - Maintains employee privacy for other departments

  3. Benefits
    - Managers can fully control their department operations
    - Reduces admin workload by delegating to managers
    - Maintains proper authorization and audit trails
*/

-- Allow managers to view payslips of their department employees
DROP POLICY IF EXISTS "Managers can view department payslips" ON payslips;

CREATE POLICY "Managers can view department payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = payslips.employee_id
      AND user_manages_department(auth.uid(), u.department_id)
    )
  );

-- Allow managers to update attendance for their department employees
DROP POLICY IF EXISTS "Managers can update department attendance" ON attendance;

CREATE POLICY "Managers can update department attendance"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = attendance.employee_id
      AND user_manages_department(auth.uid(), u.department_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = attendance.employee_id
      AND user_manages_department(auth.uid(), u.department_id)
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Managers can view department payslips" ON payslips IS 'Allows managers to view payslips for employees in departments they manage';
COMMENT ON POLICY "Managers can update department attendance" ON attendance IS 'Allows managers to update attendance records for employees in departments they manage';
