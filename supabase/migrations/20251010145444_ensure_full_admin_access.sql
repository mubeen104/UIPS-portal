/*
  # Ensure Full Admin Access

  1. Purpose
    - Guarantee admins have complete CRUD access to all tables
    - Add missing INSERT and DELETE policies where needed
    - Ensure no data operations are blocked for admin role

  2. Tables Addressed
    - attendance (add DELETE)
    - attendance_logs (add DELETE)
    - device_sync_logs (add DELETE for admins)
    - expense_categories (add full admin management)
    - leave_types (add full admin management)
    - payroll_periods (add full admin management)
    - performance_cycles (add full admin management)
    - users (add admin management)

  3. Security
    - Only admin and hr_manager roles get full access
    - Maintains existing employee permissions
*/

-- Attendance table - add DELETE for admins
DROP POLICY IF EXISTS "HR and admins can manage attendance" ON attendance;
CREATE POLICY "HR and admins can manage attendance"
  ON attendance FOR ALL
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

-- Attendance logs - add DELETE for admins
DROP POLICY IF EXISTS "HR and admins can delete logs" ON attendance_logs;
CREATE POLICY "HR and admins can delete logs"
  ON attendance_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Device sync logs - add UPDATE and DELETE
DROP POLICY IF EXISTS "HR and admins can manage sync logs" ON device_sync_logs;
CREATE POLICY "HR and admins can manage sync logs"
  ON device_sync_logs FOR ALL
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

-- Expense categories - add full admin management
DROP POLICY IF EXISTS "HR and admins can manage expense categories" ON expense_categories;
CREATE POLICY "HR and admins can manage expense categories"
  ON expense_categories FOR ALL
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

-- Expenses - add DELETE for admins
DROP POLICY IF EXISTS "HR and admins can delete expenses" ON expenses;
CREATE POLICY "HR and admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Leave types - add full admin management
DROP POLICY IF EXISTS "HR and admins can manage leave types" ON leave_types;
CREATE POLICY "HR and admins can manage leave types"
  ON leave_types FOR ALL
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

-- Leave requests - add DELETE for admins
DROP POLICY IF EXISTS "HR and admins can delete leave requests" ON leave_requests;
CREATE POLICY "HR and admins can delete leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Payroll periods - add full admin management
DROP POLICY IF EXISTS "HR and admins can manage payroll periods" ON payroll_periods;
CREATE POLICY "HR and admins can manage payroll periods"
  ON payroll_periods FOR ALL
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

-- Performance cycles - add full admin management
DROP POLICY IF EXISTS "HR and admins can manage performance cycles" ON performance_cycles;
CREATE POLICY "HR and admins can manage performance cycles"
  ON performance_cycles FOR ALL
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

-- Users table - add admin management for user records
DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Goals - add DELETE for admins
DROP POLICY IF EXISTS "Admins can delete goals" ON goals;
CREATE POLICY "Admins can delete goals"
  ON goals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE users IS 'User accounts with admin-controlled role management';
