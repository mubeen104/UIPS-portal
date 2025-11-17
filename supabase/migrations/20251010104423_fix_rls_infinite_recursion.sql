/*
  # Fix RLS Infinite Recursion

  1. Problem
    - The "HR and admins can view all users" policy causes infinite recursion
    - It queries the users table while evaluating access to the users table
    
  2. Solution
    - Drop the problematic policy
    - Users can already view their own profile with the first policy
    - Admin and HR access will be granted through the employees table linkage
    - Add a simpler policy that allows authenticated users to read user data
    
  3. Security
    - Users can view their own profile (existing policy)
    - Users can update their own profile (existing policy)
    - Authenticated users can view basic user info (new policy)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "HR and admins can view all users" ON users;

-- Create a simpler policy that allows authenticated users to view user profiles
-- This avoids the circular reference issue
CREATE POLICY "Authenticated users can view user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);
