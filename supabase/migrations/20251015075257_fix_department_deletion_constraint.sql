/*
  # Fix Department Deletion Constraint

  1. Changes
    - Drop existing foreign key constraints on employees.department_id
    - Add new foreign key constraint with SET NULL on delete
    - This allows departments to be deleted while preserving employee records
    - Employee department_id will be set to NULL when their department is deleted
    
  2. Security
    - Maintains referential integrity
    - Prevents orphaned records
    - Employees remain in system even if department is deleted
    - Allows for better department management

  3. Notes
    - When a department is deleted, all employees in that department will have their department_id set to NULL
    - This is safer than CASCADE DELETE which would delete all employees
    - Admins can then reassign employees to new departments
*/

-- Drop the existing foreign key constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_id_fkey;

-- Add new foreign key constraint with SET NULL on delete
ALTER TABLE employees
ADD CONSTRAINT employees_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- Also update users table constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_id_fkey;

ALTER TABLE users
ADD CONSTRAINT users_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- Update job_postings constraint
ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_department_id_fkey;

ALTER TABLE job_postings
ADD CONSTRAINT job_postings_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- Add helpful comment
COMMENT ON CONSTRAINT employees_department_id_fkey ON employees IS 'Sets department_id to NULL when department is deleted, preserving employee records';
