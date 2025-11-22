/*
  # Create User Settings System

  1. New Tables
    - `user_preferences`
      - Stores all user preference settings (theme, language, timezone, currency, notifications)
      - One-to-one relationship with auth.users
      - Includes date/time format preferences
      - Email notification preferences for various events
    
    - `user_sessions`
      - Tracks active user login sessions
      - Stores IP address, user agent, and last activity
      - Allows users to manage and revoke sessions
    
    - `activity_logs`
      - Audit trail for all user actions
      - Stores action type, resource information, and changes
      - Enables comprehensive activity tracking
    
    - `notifications`
      - System notifications for users
      - Categorized by type (leave, expense, payroll, etc.)
      - Read/unread status tracking

  2. Security
    - Enable RLS on all tables
    - Users can only view/modify their own data
    - Secure RPC functions for logging and notifications

  3. Performance
    - Indexes on user_id columns for fast lookups
    - Composite index on notifications for read status filtering

  4. Functions
    - `log_activity()` - RPC function to log user actions
    - `create_notification()` - RPC function to create notifications
*/

-- 1. Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'USD',
  notification_email boolean DEFAULT true,
  notification_push boolean DEFAULT true,
  notification_sms boolean DEFAULT false,
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h',
  email_leave_requests boolean DEFAULT true,
  email_expense_approvals boolean DEFAULT true,
  email_performance_reviews boolean DEFAULT true,
  email_payroll_updates boolean DEFAULT true,
  email_system_announcements boolean DEFAULT true,
  email_weekly_digest boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  category text,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 6. Create RPC function: log_activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_changes jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, changes)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_changes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create RPC function: create_notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_message text
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, category, title, message)
  VALUES (p_user_id, p_type, p_category, p_title, p_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Set RLS (Row Level Security) policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 12. RLS Policies for user_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;
CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert sessions" ON user_sessions;
CREATE POLICY "System can insert sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 13. RLS Policies for activity_logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 14. RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 15. Create function to initialize user preferences on signup
CREATE OR REPLACE FUNCTION initialize_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create trigger to auto-create preferences for new users
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_preferences();
