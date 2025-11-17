/*
  # Fix Users Table Infinite Recursion

  1. Problem
    - "Admins can manage users" policy queries users table to check role
    - This creates infinite recursion when any user query runs
    
  2. Solution
    - Drop the problematic admin policy
    - Keep simple "Authenticated users can view user profiles" for SELECT
    - Users can update their own profile
    - For admin user management, use app_metadata in auth.users instead
    
  3. Security
    - All authenticated users can view user profiles (needed for UI)
    - Users can only update their own profile
    - Role changes should be done via auth admin API, not direct DB updates
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Ensure we have the simple SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view user profiles" ON users;
CREATE POLICY "Authenticated users can view user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Keep individual profile updates
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Remove redundant policy
DROP POLICY IF EXISTS "Users can view own profile" ON users;
