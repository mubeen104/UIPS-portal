/*
  # Add Currency Field to User Preferences

  1. Schema Changes
    - Add `currency` column to user_preferences table
    - Default to 'USD' for existing records

  2. Purpose
    - Enable users to set their preferred currency
    - Support global currency formatting throughout the application
    - Sync with timezone for complete localization
*/

-- Add currency column to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'currency'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.currency IS 'User preferred currency code (USD, EUR, PKR, etc.)';
