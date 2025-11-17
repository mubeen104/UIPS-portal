/*
  # Restrict Attendance Editing to Permission-Based Access

  ## Overview
  This migration updates the attendance table RLS policies to ensure:
  - Only admins can edit/delete attendance by default
  - Super users can only VIEW attendance for their assigned employees/departments
  - Super users can only INSERT/UPDATE/DELETE attendance if they have explicit `manage_attendance` permission
  - Simple users can create their own attendance but cannot edit/delete

  ## Changes
  1. Drop existing super user INSERT policy for attendance
  2. Add permission-based INSERT policy for super users
  3. Add permission-based UPDATE policy for super users  
  4. Add permission-based DELETE policy for super users

  ## Security
  - Admins: Full access to all attendance records
  - Super users: View only by default, edit only with explicit permission
  - Simple users: Can create own attendance, view own records
*/

-- ============================================
-- ATTENDANCE TABLE - RESTRICT EDITING
-- ============================================

-- Drop existing super user manage policy (too permissive)
DROP POLICY IF EXISTS "Super users can manage assigned attendance" ON attendance;

-- Super users can INSERT attendance ONLY if they have manage_attendance permission
CREATE POLICY "Super users with permission can insert attendance"
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
    ) AND
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND p.name = 'manage_attendance'
    )
  );

-- Super users can UPDATE attendance ONLY if they have manage_attendance permission
CREATE POLICY "Super users with permission can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND (
          has_department_access(e.department_id, 'edit') OR
          has_employee_access(e.id, 'edit')
        )
    ) AND
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND p.name = 'manage_attendance'
    )
  )
  WITH CHECK (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND (
          has_department_access(e.department_id, 'edit') OR
          has_employee_access(e.id, 'edit')
        )
    ) AND
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND p.name = 'manage_attendance'
    )
  );

-- Super users can DELETE attendance ONLY if they have manage_attendance permission  
CREATE POLICY "Super users with permission can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (
    is_super_user() AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = attendance.employee_id
        AND (
          has_department_access(e.department_id, 'edit') OR
          has_employee_access(e.id, 'edit')
        )
    ) AND
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND p.name = 'manage_attendance'
    )
  );
