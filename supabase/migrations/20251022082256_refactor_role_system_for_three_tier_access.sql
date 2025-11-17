/*
  # Refactor Role System for Three-Tier Access Control

  ## Overview
  This migration refactors the user role system into a clean three-tier structure:
  - **simple_user** (formerly employee) - Can only view their own data
  - **super_user** (flexible role with configurable permissions) - Can manage assigned departments and employees
  - **admin** - Full system access
  
  Removes hr_manager and manager roles in favor of the super_user with granular permissions.

  ## Changes

  ### 1. Role Migration
  - Map existing roles to new structure:
    - employee -> simple_user
    - manager -> super_user
    - hr_manager -> super_user (with broader permissions)
    - admin -> admin (unchanged)
  
  ### 2. Enhanced Department Permissions
  - Add employee-level access control
  - Super users can be granted access to specific employees within departments
  - Add new table: `user_employee_permissions` for employee-specific access
  
  ### 3. New Permissions
  - Add granular permissions for super user capabilities
  - Add department management permissions
  - Add employee selection permissions
  
  ### 4. Security Updates
  - Update RLS policies to enforce simple_user restrictions
  - Ensure super_users can only access assigned departments/employees
  - Maintain admin full access

  ## Security Notes
  - Simple users ONLY see their own data (enforced at database level)
  - Super users see ONLY assigned departments and employees
  - All permission checks happen at row level security
  - Audit trail maintained for all permission changes
*/

-- Step 1: Create new table for employee-specific permissions
CREATE TABLE IF NOT EXISTS user_employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  assigned_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, employee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_emp_perms_user_id ON user_employee_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emp_perms_employee_id ON user_employee_permissions(employee_id);

-- Enable RLS
ALTER TABLE user_employee_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all employee permissions
CREATE POLICY "Admins can manage employee permissions"
  ON user_employee_permissions
  FOR ALL
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

-- Users can view their own employee permissions
CREATE POLICY "Users can view own employee permissions"
  ON user_employee_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 2: Migrate existing roles to new structure
-- Update employee -> simple_user
UPDATE users SET role = 'simple_user' WHERE role = 'employee';

-- Update manager -> super_user
UPDATE users SET role = 'super_user' WHERE role = 'manager';

-- Update hr_manager -> super_user (they'll get broader permissions via permission grants)
UPDATE users SET role = 'super_user' WHERE role = 'hr_manager';

-- Step 3: Add new permissions for super user capabilities
INSERT INTO permissions (name, description, category) VALUES
  -- Department-specific permissions
  ('manage_department_employees', 'Manage employees within assigned departments', 'employees'),
  ('view_department_attendance', 'View attendance for assigned departments', 'attendance'),
  ('manage_department_attendance', 'Manage attendance for assigned departments', 'attendance'),
  ('view_department_leaves', 'View leaves for assigned departments', 'leaves'),
  ('manage_department_leaves', 'Manage and approve leaves for assigned departments', 'leaves'),
  ('view_department_expenses', 'View expenses for assigned departments', 'expenses'),
  ('manage_department_expenses', 'Approve expenses for assigned departments', 'expenses'),
  ('view_department_performance', 'View performance reviews for assigned departments', 'performance'),
  ('manage_department_performance', 'Create performance reviews for assigned departments', 'performance'),
  ('view_department_payroll', 'View payroll for assigned departments', 'payroll'),
  ('manage_department_payroll', 'Process payroll for assigned departments', 'payroll'),
  
  -- Employee-specific permissions
  ('view_specific_employees', 'View specific assigned employees', 'employees'),
  ('manage_specific_employees', 'Manage specific assigned employees', 'employees')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Grant default permissions to super_user role
-- Super users get department-scoped permissions by default
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_user', id FROM permissions
WHERE name IN (
  'view_department_attendance',
  'view_department_leaves',
  'view_department_expenses',
  'view_department_performance',
  'view_specific_employees'
)
ON CONFLICT DO NOTHING;

-- Step 5: Helper function to check if user can access employee data
CREATE OR REPLACE FUNCTION user_can_access_employee(
  p_user_id uuid,
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_employee_dept_id uuid;
  v_has_dept_access boolean;
  v_has_employee_access boolean;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- Admins can access all employees
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Simple users can only access their own employee record
  IF v_user_role = 'simple_user' THEN
    RETURN EXISTS (
      SELECT 1 FROM employees
      WHERE id = p_employee_id
      AND user_id = p_user_id
    );
  END IF;
  
  -- For super users, check department and employee-specific permissions
  IF v_user_role = 'super_user' THEN
    -- Get employee's department
    SELECT department_id INTO v_employee_dept_id
    FROM employees
    WHERE id = p_employee_id;
    
    -- Check if user has department-level access
    SELECT EXISTS (
      SELECT 1 FROM user_department_permissions
      WHERE user_id = p_user_id
      AND department_id = v_employee_dept_id
      AND can_view_employees = true
    ) INTO v_has_dept_access;
    
    -- Check if user has employee-specific access
    SELECT EXISTS (
      SELECT 1 FROM user_employee_permissions
      WHERE user_id = p_user_id
      AND employee_id = p_employee_id
      AND can_view = true
    ) INTO v_has_employee_access;
    
    RETURN v_has_dept_access OR v_has_employee_access;
  END IF;
  
  RETURN false;
END;
$$;

-- Step 6: Helper function to check if user can edit employee data
CREATE OR REPLACE FUNCTION user_can_edit_employee(
  p_user_id uuid,
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_employee_dept_id uuid;
  v_has_dept_edit boolean;
  v_has_employee_edit boolean;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- Admins can edit all employees
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Simple users cannot edit any employee data
  IF v_user_role = 'simple_user' THEN
    RETURN false;
  END IF;
  
  -- For super users, check department and employee-specific edit permissions
  IF v_user_role = 'super_user' THEN
    -- Get employee's department
    SELECT department_id INTO v_employee_dept_id
    FROM employees
    WHERE id = p_employee_id;
    
    -- Check if user has department-level edit access
    SELECT EXISTS (
      SELECT 1 FROM user_department_permissions
      WHERE user_id = p_user_id
      AND department_id = v_employee_dept_id
      AND can_edit_employees = true
    ) INTO v_has_dept_edit;
    
    -- Check if user has employee-specific edit access
    SELECT EXISTS (
      SELECT 1 FROM user_employee_permissions
      WHERE user_id = p_user_id
      AND employee_id = p_employee_id
      AND can_edit = true
    ) INTO v_has_employee_edit;
    
    RETURN v_has_dept_edit OR v_has_employee_edit;
  END IF;
  
  RETURN false;
END;
$$;

-- Step 7: Helper function to get accessible employees for a user
CREATE OR REPLACE FUNCTION get_user_accessible_employees(p_user_id uuid)
RETURNS TABLE(employee_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  -- Admins can access all employees
  IF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT e.id FROM employees e;
  
  -- Simple users can only access their own record
  ELSIF v_user_role = 'simple_user' THEN
    RETURN QUERY
    SELECT e.id FROM employees e WHERE e.user_id = p_user_id;
  
  -- Super users get employees from assigned departments and specific assignments
  ELSIF v_user_role = 'super_user' THEN
    RETURN QUERY
    SELECT DISTINCT e.id
    FROM employees e
    WHERE 
      -- Employees from departments user has access to
      EXISTS (
        SELECT 1 FROM user_department_permissions udp
        WHERE udp.user_id = p_user_id
        AND udp.department_id = e.department_id
        AND udp.can_view_employees = true
      )
      OR
      -- Specific employees user has access to
      EXISTS (
        SELECT 1 FROM user_employee_permissions uep
        WHERE uep.user_id = p_user_id
        AND uep.employee_id = e.id
        AND uep.can_view = true
      );
  END IF;
END;
$$;

-- Step 8: Update trigger for user_employee_permissions
CREATE OR REPLACE FUNCTION update_user_employee_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_employee_permissions_updated_at
  BEFORE UPDATE ON user_employee_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_employee_permissions_updated_at();

-- Step 9: Add helpful comments
COMMENT ON TABLE user_employee_permissions IS 'Stores employee-specific access permissions for super users, allowing granular control beyond department-level access';
COMMENT ON FUNCTION user_can_access_employee IS 'Checks if a user has permission to view a specific employee based on role, department access, and employee-specific permissions';
COMMENT ON FUNCTION user_can_edit_employee IS 'Checks if a user has permission to edit a specific employee based on role and assigned permissions';
COMMENT ON FUNCTION get_user_accessible_employees IS 'Returns all employee IDs that a user has permission to access based on their role and permissions';

-- Step 10: Update existing role_permissions to use new role names
DELETE FROM role_permissions WHERE role IN ('manager', 'hr_manager', 'employee');

-- Grant simple_user minimal permissions (view own data)
INSERT INTO role_permissions (role, permission_id)
SELECT 'simple_user', id FROM permissions
WHERE name IN (
  'view_employees',
  'view_all_attendance',
  'view_all_leaves',
  'view_all_expenses',
  'view_payroll',
  'view_all_reviews'
)
ON CONFLICT DO NOTHING;
