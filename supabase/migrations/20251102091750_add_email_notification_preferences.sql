/*
  # Add Email Notification Preferences

  1. Changes
    - Add email notification preference columns to user_preferences table
    - Add default values for new columns
  
  2. New Columns
    - `email_leave_requests` - Leave request notifications
    - `email_expense_approvals` - Expense approval notifications
    - `email_performance_reviews` - Performance review notifications
    - `email_payroll_updates` - Payroll update notifications
    - `email_system_announcements` - System announcement notifications
    - `email_weekly_digest` - Weekly digest notifications
*/

-- Add email notification preference columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_leave_requests'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_leave_requests boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_expense_approvals'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_expense_approvals boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_performance_reviews'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_performance_reviews boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_payroll_updates'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_payroll_updates boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_system_announcements'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_system_announcements boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'email_weekly_digest'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN email_weekly_digest boolean DEFAULT true;
  END IF;
END $$;
