/*
  # Fix Employees Table RLS Policies

  ## Overview
  Updates all RLS policies on the employees table to remove references to
  deprecated roles (hr_manager, manager) and use the new role structure.

  ## Changes
  - Drops all existing policies on employees table
  - Creates new simplified policies for the three-tier role system
  - Ensures admins can access all employees
  - Ensures simple users can only see their own employee record

  ## Security
  - Admins have full access to all employee records
  - Super users will use function-based access control (already implemented)
  - Simple users can only view their own employee data
*/

-- Drop all existing policies on employees table
DROP POLICY IF EXISTS "HR and admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;
DROP POLICY IF EXISTS "HR and admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Managers can view department employees" ON employees;
DROP POLICY IF EXISTS "Users with department permissions can view employees" ON employees;
DROP POLICY IF EXISTS "Managers can update department employees" ON employees;
DROP POLICY IF EXISTS "Users with department permissions can edit employees" ON employees;

-- Create new simplified policies

-- SELECT policies
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super users can view assigned employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
    AND (
      -- Check department-level access
      EXISTS (
        SELECT 1 FROM user_department_permissions udp
        WHERE udp.user_id = auth.uid()
        AND udp.department_id = employees.department_id
        AND udp.can_view_employees = true
      )
      OR
      -- Check employee-level access
      EXISTS (
        SELECT 1 FROM user_employee_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.employee_id = employees.id
        AND uep.can_view = true
      )
    )
  );

-- INSERT policy (only admins can create employee records)
CREATE POLICY "Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- UPDATE policies
CREATE POLICY "Admins can update all employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Super users can update assigned employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
    AND (
      -- Check department-level edit access
      EXISTS (
        SELECT 1 FROM user_department_permissions udp
        WHERE udp.user_id = auth.uid()
        AND udp.department_id = employees.department_id
        AND udp.can_edit_employees = true
      )
      OR
      -- Check employee-level edit access
      EXISTS (
        SELECT 1 FROM user_employee_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.employee_id = employees.id
        AND uep.can_edit = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_user'
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_department_permissions udp
        WHERE udp.user_id = auth.uid()
        AND udp.department_id = employees.department_id
        AND udp.can_edit_employees = true
      )
      OR
      EXISTS (
        SELECT 1 FROM user_employee_permissions uep
        WHERE uep.user_id = auth.uid()
        AND uep.employee_id = employees.id
        AND uep.can_edit = true
      )
    )
  );

-- DELETE policy (only admins)
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
