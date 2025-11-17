/*
  # Fix Employees Table RLS Infinite Recursion

  ## Overview
  The employees table RLS policies were causing infinite recursion by checking
  the users table, which in turn checks employees table, creating a loop.

  ## Solution
  1. Drop all existing employees policies
  2. Create simple, non-recursive policies using only auth.uid() and direct checks
  3. Use security definer functions where complex permission checks are needed

  ## Changes
  - Simplified all SELECT policies to avoid recursion
  - Removed nested EXISTS queries on users table
  - Added direct auth.uid() checks only
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Super users can view assigned employees" ON employees;
DROP POLICY IF EXISTS "Admins can create employees" ON employees;
DROP POLICY IF EXISTS "Admins can update all employees" ON employees;
DROP POLICY IF EXISTS "Super users can update assigned employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create security definer function to check if user is super_user
CREATE OR REPLACE FUNCTION is_super_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_user'
  );
$$;

-- Create security definer function to check department access
CREATE OR REPLACE FUNCTION has_department_access(dept_id uuid, permission_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_department_permissions
    WHERE user_id = auth.uid()
    AND department_id = dept_id
    AND CASE permission_type
      WHEN 'view' THEN can_view_employees = true
      WHEN 'edit' THEN can_edit_employees = true
      ELSE false
    END
  );
$$;

-- Create security definer function to check employee-level access
CREATE OR REPLACE FUNCTION has_employee_access(emp_id uuid, permission_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_employee_permissions
    WHERE user_id = auth.uid()
    AND employee_id = emp_id
    AND CASE permission_type
      WHEN 'view' THEN can_view = true
      WHEN 'edit' THEN can_edit = true
      ELSE false
    END
  );
$$;

-- SELECT policies (non-recursive)
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super users can view assigned employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    is_super_user()
    AND (
      has_department_access(department_id, 'view')
      OR has_employee_access(id, 'view')
    )
  );

-- INSERT policy
CREATE POLICY "Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE policies
CREATE POLICY "Admins can update all employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Super users can update assigned employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    is_super_user()
    AND (
      has_department_access(department_id, 'edit')
      OR has_employee_access(id, 'edit')
    )
  )
  WITH CHECK (
    is_super_user()
    AND (
      has_department_access(department_id, 'edit')
      OR has_employee_access(id, 'edit')
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (is_admin());
