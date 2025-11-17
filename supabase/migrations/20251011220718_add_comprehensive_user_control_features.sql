/*
  # Comprehensive User Control Features

  1. New Tables
    - `permissions` - Granular permissions for features
      - `id` (uuid, primary key)
      - `name` (text, unique) - Permission name (e.g., 'view_payroll')
      - `description` (text)
      - `category` (text) - Group permissions
      - `created_at` (timestamptz)

    - `role_permissions` - Link roles to specific permissions
      - `id` (uuid, primary key)
      - `role` (text) - User role
      - `permission_id` (uuid, references permissions)
      - `created_at` (timestamptz)

    - `user_permissions` - Override permissions per user
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `permission_id` (uuid, references permissions)
      - `granted` (boolean) - true=grant, false=revoke
      - `granted_by` (uuid, references users)
      - `granted_at` (timestamptz)
      - `expires_at` (timestamptz) - Optional expiration
      - `reason` (text)

    - `user_preferences` - User settings and preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users, unique)
      - `theme` (text) - light, dark, auto
      - `language` (text)
      - `timezone` (text)
      - `notification_email` (boolean)
      - `notification_push` (boolean)
      - `notification_sms` (boolean)
      - `date_format` (text)
      - `time_format` (text) - 12h, 24h
      - `dashboard_layout` (jsonb) - Customizable widgets
      - `updated_at` (timestamptz)

    - `notifications` - User notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `type` (text) - info, warning, success, error
      - `category` (text) - leave, expense, performance, etc
      - `title` (text)
      - `message` (text)
      - `link` (text) - Action link
      - `read` (boolean)
      - `read_at` (timestamptz)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

    - `activity_logs` - Audit trail
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `action` (text) - create, update, delete, view
      - `resource_type` (text) - Table name
      - `resource_id` (uuid)
      - `changes` (jsonb) - Old and new values
      - `ip_address` (inet)
      - `user_agent` (text)
      - `created_at` (timestamptz)

    - `user_sessions` - Track active sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `session_token` (text)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `last_activity` (timestamptz)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admins can manage all features
    - Users can view/update own preferences
    - Users can view own notifications and activity

  3. Indexes
    - Indexes on foreign keys and frequently queried columns
*/

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Role permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- User-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  granted boolean DEFAULT true,
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  reason text,
  UNIQUE(user_id, permission_id)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  notification_email boolean DEFAULT true,
  notification_push boolean DEFAULT true,
  notification_sms boolean DEFAULT false,
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h',
  dashboard_layout jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions
CREATE POLICY "Everyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for role_permissions
CREATE POLICY "Everyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for user_permissions
CREATE POLICY "Users can view own permission overrides"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all permission overrides"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage permission overrides"
  ON user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own activity"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "System can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Employee Management
  ('view_employees', 'View employee list and details', 'employees'),
  ('create_employees', 'Create new employee records', 'employees'),
  ('edit_employees', 'Edit employee information', 'employees'),
  ('delete_employees', 'Delete employee records', 'employees'),
  
  -- Attendance
  ('view_all_attendance', 'View attendance for all employees', 'attendance'),
  ('manage_attendance', 'Mark and edit attendance records', 'attendance'),
  ('manage_biometric_devices', 'Configure biometric devices', 'attendance'),
  ('enroll_biometrics', 'Enroll employee biometric data', 'attendance'),
  
  -- Leave Management
  ('view_all_leaves', 'View all leave requests', 'leaves'),
  ('approve_leaves', 'Approve or reject leave requests', 'leaves'),
  ('manage_leave_types', 'Create and edit leave types', 'leaves'),
  
  -- Expenses
  ('view_all_expenses', 'View all expense claims', 'expenses'),
  ('approve_expenses', 'Approve or reject expense claims', 'expenses'),
  
  -- Payroll
  ('view_payroll', 'View payroll information', 'payroll'),
  ('process_payroll', 'Generate and process payroll', 'payroll'),
  ('view_all_payslips', 'View payslips for all employees', 'payroll'),
  
  -- Performance
  ('view_all_reviews', 'View all performance reviews', 'performance'),
  ('create_reviews', 'Create performance reviews', 'performance'),
  ('manage_goals', 'Create and manage employee goals', 'performance'),
  
  -- Recruitment
  ('view_applicants', 'View job applicants', 'recruitment'),
  ('manage_job_postings', 'Create and edit job postings', 'recruitment'),
  ('schedule_interviews', 'Schedule and manage interviews', 'recruitment'),
  
  -- Administration
  ('manage_departments', 'Create and edit departments', 'admin'),
  ('manage_users', 'Manage user accounts and roles', 'admin'),
  ('manage_permissions', 'Assign and revoke permissions', 'admin'),
  ('view_activity_logs', 'View system activity logs', 'admin'),
  ('manage_system_settings', 'Configure system settings', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Assign default permissions to roles
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'hr_manager', id FROM permissions
WHERE category IN ('employees', 'attendance', 'leaves', 'expenses', 'performance', 'recruitment')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions
WHERE name IN ('view_employees', 'view_all_attendance', 'view_all_leaves', 'approve_leaves', 
               'view_all_expenses', 'approve_expenses', 'view_all_reviews', 'create_reviews', 'manage_goals')
ON CONFLICT DO NOTHING;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_has_permission boolean;
  v_override_granted boolean;
  v_override_expires timestamptz;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  
  -- Check if user has explicit override
  SELECT granted, expires_at INTO v_override_granted, v_override_expires
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id 
    AND p.name = p_permission_name
    AND (up.expires_at IS NULL OR up.expires_at > now());
  
  -- If override exists, return that
  IF FOUND THEN
    RETURN v_override_granted;
  END IF;
  
  -- Check role permissions
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = v_role
      AND p.name = p_permission_name
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, category, title, message, link, expires_at)
  VALUES (p_user_id, p_type, p_category, p_title, p_message, p_link, p_expires_at)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_changes jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, changes)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_changes)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
