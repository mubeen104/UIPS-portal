/*
  # Add Attendance Entry Source Tracking

  1. Changes
    - Add `entry_source` column to `attendance` table to track if entry was manual or automatic
    - Add `entered_by` column to track which admin manually entered the attendance
    - Add `modified_at` column to track when manual entries were made

  2. Notes
    - `entry_source` can be 'fingerprint' (automatic) or 'manual' (admin entry)
    - `entered_by` will be null for fingerprint entries and contain admin user_id for manual entries
*/

-- Add entry_source column to attendance table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'entry_source'
  ) THEN
    ALTER TABLE attendance ADD COLUMN entry_source text DEFAULT 'fingerprint' CHECK (entry_source IN ('fingerprint', 'manual'));
  END IF;
END $$;

-- Add entered_by column to track who manually entered the attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'entered_by'
  ) THEN
    ALTER TABLE attendance ADD COLUMN entered_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add modified_at column to track when manual entries were made
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'modified_at'
  ) THEN
    ALTER TABLE attendance ADD COLUMN modified_at timestamptz;
  END IF;
END $$;

-- Create index for faster queries on entry_source
CREATE INDEX IF NOT EXISTS idx_attendance_entry_source ON attendance(entry_source);

-- Create index for faster queries on entered_by
CREATE INDEX IF NOT EXISTS idx_attendance_entered_by ON attendance(entered_by);
