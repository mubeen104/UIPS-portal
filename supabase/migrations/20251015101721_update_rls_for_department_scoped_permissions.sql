/*
  # Update RLS Policies for Department-Scoped Permissions

  1. Changes
    - Update employees table policies to check department permissions
    - Update attendance table policies to check department permissions
    - Update leave_requests table policies to check department permissions
    - Update payslips table policies to check department permissions
    - Update expenses table policies to check department permissions

  2. Security
    - Users with department permissions can only access data for assigned departments
    - Specific permission checks (view vs manage)
    - Admins and HR managers maintain full access
    - Employees can still access their own data

  3. Benefits
    - Fine-grained access control based on department scope
    - Flexible delegation of responsibilities
    - Clear separation of access levels
*/

-- Update employees SELECT policy to include department permissions
DROP POLICY IF EXISTS "Users with department permissions can view employees" ON employees;

CREATE POLICY "Users with department permissions can view employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_department_permissions udp ON u.id = udp.user_id
      WHERE udp.user_id = auth.uid()
      AND udp.department_id IN (
        SELECT department_id FROM users WHERE users.id = employees.user_id
      )
      AND udp.can_view_employees = true
    )
  );

-- Update employees UPDATE policy to include department permissions
DROP POLICY IF EXISTS "Users with department permissions can edit employees" ON employees;

CREATE POLICY "Users with department permissions can edit employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_department_permissions udp ON u.id = udp.user_id
      WHERE udp.user_id = auth.uid()
      AND udp.department_id IN (
        SELECT department_id FROM users WHERE users.id = employees.user_id
      )
      AND udp.can_edit_employees = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_department_permissions udp ON u.id = udp.user_id
      WHERE udp.user_id = auth.uid()
      AND udp.department_id IN (
        SELECT department_id FROM users WHERE users.id = employees.user_id
      )
      AND udp.can_edit_employees = true
    )
  );

-- Update attendance SELECT policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can view attendance" ON attendance;

CREATE POLICY "Users with department permissions can view attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = attendance.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_view_attendance = true
    )
  );

-- Update attendance UPDATE policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can manage attendance" ON attendance;

CREATE POLICY "Users with department permissions can manage attendance"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = attendance.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_manage_attendance = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = attendance.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_manage_attendance = true
    )
  );

-- Update leave_requests SELECT policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can view leaves" ON leave_requests;

CREATE POLICY "Users with department permissions can view leaves"
  ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = leave_requests.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_view_leaves = true
    )
  );

-- Update leave_requests UPDATE policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can approve leaves" ON leave_requests;

CREATE POLICY "Users with department permissions can approve leaves"
  ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = leave_requests.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_approve_leaves = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = leave_requests.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_approve_leaves = true
    )
  );

-- Update payslips SELECT policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can view payslips" ON payslips;

CREATE POLICY "Users with department permissions can view payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = payslips.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_view_payroll = true
    )
  );

-- Update payslips management policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can manage payslips" ON payslips;

CREATE POLICY "Users with department permissions can manage payslips"
  ON payslips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = payslips.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_manage_payroll = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = payslips.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_manage_payroll = true
    )
  );

-- Update expenses SELECT policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can view expenses" ON expenses;

CREATE POLICY "Users with department permissions can view expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = expenses.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_view_expenses = true
    )
  );

-- Update expenses UPDATE policy for department permissions
DROP POLICY IF EXISTS "Users with department permissions can approve expenses" ON expenses;

CREATE POLICY "Users with department permissions can approve expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = expenses.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_approve_expenses = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN user_department_permissions udp ON udp.department_id = u.department_id
      WHERE e.id = expenses.employee_id
      AND udp.user_id = auth.uid()
      AND udp.can_approve_expenses = true
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Users with department permissions can view employees" ON employees IS 'Allows users to view employees in departments they have view permission for';
COMMENT ON POLICY "Users with department permissions can edit employees" ON employees IS 'Allows users to edit employees in departments they have edit permission for';
COMMENT ON POLICY "Users with department permissions can view attendance" ON attendance IS 'Allows users to view attendance in departments they have view permission for';
COMMENT ON POLICY "Users with department permissions can manage attendance" ON attendance IS 'Allows users to manage attendance in departments they have manage permission for';
COMMENT ON POLICY "Users with department permissions can view leaves" ON leave_requests IS 'Allows users to view leaves in departments they have view permission for';
COMMENT ON POLICY "Users with department permissions can approve leaves" ON leave_requests IS 'Allows users to approve leaves in departments they have approve permission for';
COMMENT ON POLICY "Users with department permissions can view payslips" ON payslips IS 'Allows users to view payslips in departments they have view permission for';
COMMENT ON POLICY "Users with department permissions can manage payslips" ON payslips IS 'Allows users to manage payslips in departments they have manage permission for';
COMMENT ON POLICY "Users with department permissions can view expenses" ON expenses IS 'Allows users to view expenses in departments they have view permission for';
COMMENT ON POLICY "Users with department permissions can approve expenses" ON expenses IS 'Allows users to approve expenses in departments they have approve permission for';
