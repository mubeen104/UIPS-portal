/*
  # Fix Bulk Import User Creation

  1. Changes
    - Add INSERT policy for users table to allow admins to create users
    - Add DELETE policy for users table to allow admins to delete users
    - Maintain security by restricting to admin/hr roles only

  2. Security
    - Only admins and hr managers can create new users
    - Only admins and hr managers can delete users
    - Regular employees cannot create or delete user accounts
    - Maintains existing SELECT and UPDATE policies

  3. Notes
    - Required for bulk employee import functionality
    - Enables proper user account creation during onboarding
    - Preserves user data security
*/

-- Add INSERT policy for users table (admin/hr only)
DROP POLICY IF EXISTS "Admins can create users" ON users;

CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr_manager')
    )
  );

-- Add DELETE policy for users table (admin only)
DROP POLICY IF EXISTS "Admins can delete users" ON users;

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Update UPDATE policy to allow admins to update any user
DROP POLICY IF EXISTS "Admins can update any user" ON users;

CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr_manager')
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Admins can create users" ON users IS 'Allows admins and HR managers to create user accounts during bulk import and manual creation';
COMMENT ON POLICY "Admins can delete users" ON users IS 'Allows admins to delete user accounts';
COMMENT ON POLICY "Admins can update any user" ON users IS 'Allows admins and HR managers to update any user profile';
