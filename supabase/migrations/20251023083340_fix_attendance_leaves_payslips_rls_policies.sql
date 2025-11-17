/*
  # Fix RLS Policies for Attendance, Leaves, and Payslips

  ## Overview
  Updates RLS policies on attendance, leave_requests, and payslips tables
  to remove references to old roles (hr_manager, manager) and use new three-tier system.

  ## Changes
  1. Update attendance table policies
  2. Update leave_requests table policies  
  3. Update payslips table policies
  4. Replace old role checks with new roles (admin, super_user, simple_user)

  ## Security
  - Admins can view all data
  - Super users can view data for assigned departments/employees
  - Simple users can only view their own data
*/

-- ============================================
-- ATTENDANCE TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Managers can view department attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can manage department attendance" ON attendance;
DROP POLICY IF EXISTS "Managers can create attendance records" ON attendance;
DROP POLICY IF EXISTS "Managers can update attendance records" ON attendance;

-- Create new admin policies for attendance
CREATE POLICY "Admins can view all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (is_admin());

-- Super users can view/manage attendance for accessible employees
CREATE POLICY "Super users can view assigned attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND (
          has_department_access(e.department_id, 'view') OR
          has_employee_access(e.id, 'view')
        )
    )
  );

CREATE POLICY "Super users can manage assigned attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND (
          has_department_access(e.department_id, 'edit') OR
          has_employee_access(e.id, 'edit')
        )
    )
  );

-- ============================================
-- LEAVE_REQUESTS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Managers can view department leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can update leave requests" ON leave_requests;

-- Create new admin policies for leave_requests
CREATE POLICY "Admins can view all leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (is_admin());

-- Super users can view/approve leave requests for accessible employees
CREATE POLICY "Super users can view assigned leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND (
          has_department_access(e.department_id, 'view') OR
          has_employee_access(e.id, 'view')
        )
    )
  );

CREATE POLICY "Super users can update assigned leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND (
          has_department_access(e.department_id, 'approve') OR
          has_employee_access(e.id, 'edit')
        )
    )
  )
  WITH CHECK (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND (
          has_department_access(e.department_id, 'approve') OR
          has_employee_access(e.id, 'edit')
        )
    )
  );

-- ============================================
-- PAYSLIPS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Managers can view department payslips" ON payslips;

-- Create new admin policies for payslips
CREATE POLICY "Admins can view all payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert payslips"
  ON payslips FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update payslips"
  ON payslips FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete payslips"
  ON payslips FOR DELETE
  TO authenticated
  USING (is_admin());

-- Super users can view payslips for accessible employees
CREATE POLICY "Super users can view assigned payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = payslips.employee_id
        AND (
          has_department_access(e.department_id, 'view') OR
          has_employee_access(e.id, 'view')
        )
    )
  );
