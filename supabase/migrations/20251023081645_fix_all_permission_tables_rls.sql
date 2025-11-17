/*
  # Fix All Permission Tables RLS Policies

  ## Overview
  Updates RLS policies on permission-related tables to remove references to
  deprecated roles and prevent infinite recursion issues.

  ## Changes
  1. Update user_permissions table policies
  2. Update user_department_permissions table policies
  3. Remove references to hr_manager role
  4. Use security definer functions to prevent recursion

  ## Security
  - Only admins can manage permissions
  - Users can view their own permissions
  - No recursive queries on users table
*/

-- ============================================
-- user_permissions table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage permission overrides" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permission overrides" ON user_permissions;
DROP POLICY IF EXISTS "Users can view own permission overrides" ON user_permissions;

-- Create new policies
CREATE POLICY "Admins can view all permission overrides"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own permission overrides"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert permission overrides"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update permission overrides"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete permission overrides"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- user_department_permissions table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and HR can manage department permissions" ON user_department_permissions;
DROP POLICY IF EXISTS "Admins and HR can view all department permissions" ON user_department_permissions;
DROP POLICY IF EXISTS "Users can view own department permissions" ON user_department_permissions;

-- Create new policies
CREATE POLICY "Admins can view all department permissions"
  ON user_department_permissions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own department permissions"
  ON user_department_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert department permissions"
  ON user_department_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update department permissions"
  ON user_department_permissions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete department permissions"
  ON user_department_permissions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- user_employee_permissions table (if exists)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all employee permissions" ON user_employee_permissions;
DROP POLICY IF EXISTS "Users can view own employee permissions" ON user_employee_permissions;
DROP POLICY IF EXISTS "Admins can insert employee permissions" ON user_employee_permissions;
DROP POLICY IF EXISTS "Admins can update employee permissions" ON user_employee_permissions;
DROP POLICY IF EXISTS "Admins can delete employee permissions" ON user_employee_permissions;

-- Create new policies
CREATE POLICY "Admins can view all employee permissions"
  ON user_employee_permissions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own employee permissions"
  ON user_employee_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert employee permissions"
  ON user_employee_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update employee permissions"
  ON user_employee_permissions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete employee permissions"
  ON user_employee_permissions FOR DELETE
  TO authenticated
  USING (is_admin());
