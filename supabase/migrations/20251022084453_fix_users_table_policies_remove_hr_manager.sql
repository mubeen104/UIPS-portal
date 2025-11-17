/*
  # Fix Users Table Policies - Remove HR Manager References

  ## Overview
  Updates the users table RLS policies to remove references to 'hr_manager'
  which no longer exists in the new role structure.

  ## Changes
  - Drops policies that check for 'hr_manager' role
  - Recreates policies checking only for 'admin' role
  - Maintains user self-management capabilities

  ## Security
  - Admins can manage all users
  - Users can view all profiles (for collaboration)
  - Users can update only their own profile
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Authenticated users can view user profiles" ON users;

-- Recreate INSERT policy (only admins)
CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Recreate UPDATE policy for admins
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Recreate SELECT policy (all authenticated users can view profiles)
CREATE POLICY "All authenticated users can view profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);
