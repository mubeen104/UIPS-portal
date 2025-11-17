/*
  # Optimize User Profile Loading

  1. Performance Improvements
    - Add index on users.role for faster role-based queries
    - These optimizations ensure admin panels load instantly

  2. Notes
    - Primary key index on id already exists
    - Email unique index already exists
    - Adding role index for filtering operations
*/

-- Add index on role column for faster role-based filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comment for documentation
COMMENT ON INDEX idx_users_role IS 'Index for faster role-based queries and filtering';
