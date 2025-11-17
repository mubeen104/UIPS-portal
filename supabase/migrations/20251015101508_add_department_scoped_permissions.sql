/*
  # Add Department-Scoped Permission System

  1. New Tables
    - `user_department_permissions` - Maps users to departments with specific permissions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `department_id` (uuid, foreign key to departments)
      - `can_view_employees` (boolean) - Can view employee details
      - `can_edit_employees` (boolean) - Can edit employee information
      - `can_view_attendance` (boolean) - Can view attendance records
      - `can_manage_attendance` (boolean) - Can mark/edit attendance
      - `can_view_leaves` (boolean) - Can view leave requests
      - `can_approve_leaves` (boolean) - Can approve/reject leaves
      - `can_view_payroll` (boolean) - Can view payslips
      - `can_manage_payroll` (boolean) - Can process payroll
      - `can_view_expenses` (boolean) - Can view expense claims
      - `can_approve_expenses` (boolean) - Can approve/reject expenses
      - `can_view_performance` (boolean) - Can view performance reviews
      - `can_manage_performance` (boolean) - Can create/edit reviews
      - `assigned_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Helper Functions
    - `user_has_department_permission` - Check if user has specific permission for department
    - `get_user_accessible_departments` - Get list of departments user can access

  3. Security
    - Enable RLS on user_department_permissions
    - Only admins and HR managers can assign department permissions
    - Users can view their own department permissions

  4. Benefits
    - Fine-grained access control per department
    - Flexible permission assignment
    - Clear audit trail of who assigned permissions
    - Supports cross-department access
*/

-- Create user_department_permissions table
CREATE TABLE IF NOT EXISTS user_department_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Employee permissions
  can_view_employees boolean DEFAULT false,
  can_edit_employees boolean DEFAULT false,
  
  -- Attendance permissions
  can_view_attendance boolean DEFAULT false,
  can_manage_attendance boolean DEFAULT false,
  
  -- Leave permissions
  can_view_leaves boolean DEFAULT false,
  can_approve_leaves boolean DEFAULT false,
  
  -- Payroll permissions
  can_view_payroll boolean DEFAULT false,
  can_manage_payroll boolean DEFAULT false,
  
  -- Expense permissions
  can_view_expenses boolean DEFAULT false,
  can_approve_expenses boolean DEFAULT false,
  
  -- Performance permissions
  can_view_performance boolean DEFAULT false,
  can_manage_performance boolean DEFAULT false,
  
  -- Metadata
  assigned_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user-department combinations
  UNIQUE(user_id, department_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_dept_perms_user_id ON user_department_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dept_perms_dept_id ON user_department_permissions(department_id);

-- Enable RLS
ALTER TABLE user_department_permissions ENABLE ROW LEVEL SECURITY;

-- Admins and HR can view all department permissions
CREATE POLICY "Admins and HR can view all department permissions"
  ON user_department_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

-- Users can view their own department permissions
CREATE POLICY "Users can view own department permissions"
  ON user_department_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins and HR can manage department permissions
CREATE POLICY "Admins and HR can manage department permissions"
  ON user_department_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
  );

-- Helper function to check if user has specific permission for a department
CREATE OR REPLACE FUNCTION user_has_department_permission(
  p_user_id uuid,
  p_department_id uuid,
  p_permission_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  -- Check if user is admin or hr_manager (they have all permissions)
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND role IN ('admin', 'hr_manager')
  ) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  EXECUTE format(
    'SELECT COALESCE(%I, false) FROM user_department_permissions WHERE user_id = $1 AND department_id = $2',
    p_permission_name
  ) INTO v_has_permission
  USING p_user_id, p_department_id;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Helper function to get all departments a user can access
CREATE OR REPLACE FUNCTION get_user_accessible_departments(p_user_id uuid)
RETURNS TABLE(department_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user is admin or hr_manager, return all departments
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND role IN ('admin', 'hr_manager')
  ) THEN
    RETURN QUERY
    SELECT d.id FROM departments d;
  ELSE
    -- Return only departments where user has any permission
    RETURN QUERY
    SELECT DISTINCT udp.department_id
    FROM user_department_permissions udp
    WHERE udp.user_id = p_user_id;
  END IF;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE user_department_permissions IS 'Stores department-scoped permissions for users, allowing fine-grained access control';
COMMENT ON FUNCTION user_has_department_permission IS 'Checks if a user has a specific permission for a department';
COMMENT ON FUNCTION get_user_accessible_departments IS 'Returns all departments a user has access to';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_department_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_department_permissions_updated_at
  BEFORE UPDATE ON user_department_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_department_permissions_updated_at();
