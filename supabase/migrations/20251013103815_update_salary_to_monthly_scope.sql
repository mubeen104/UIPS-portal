/*
  # Update Salary Scope from Annual to Monthly

  1. Changes
    - Add comments to clarify that salary columns represent monthly salary
    - Add descriptive comments to all salary-related columns
    - Update job posting salary ranges to monthly scope
    - Ensure all salary fields are understood as monthly amounts

  2. Notes
    - No data migration needed as values can be interpreted as monthly
    - Applications should display "Monthly Salary" labels
    - All salary calculations should be based on monthly amounts
*/

-- Add comments to clarify salary is monthly in employees table
COMMENT ON COLUMN employees.salary IS 'Monthly salary amount in the currency selected by user';

-- Add comments to payslips table
COMMENT ON COLUMN payslips.base_salary IS 'Monthly base salary amount';
COMMENT ON COLUMN payslips.allowances IS 'Monthly allowances total';
COMMENT ON COLUMN payslips.bonuses IS 'Monthly bonuses total';
COMMENT ON COLUMN payslips.deductions IS 'Monthly deductions total';
COMMENT ON COLUMN payslips.tax IS 'Monthly tax amount';
COMMENT ON COLUMN payslips.gross_pay IS 'Monthly gross pay (base + allowances + bonuses)';
COMMENT ON COLUMN payslips.net_pay IS 'Monthly net pay (gross - deductions - tax)';

-- Add comments to job postings salary ranges
COMMENT ON COLUMN job_postings.salary_range_min IS 'Minimum monthly salary for this position';
COMMENT ON COLUMN job_postings.salary_range_max IS 'Maximum monthly salary for this position';

-- Add index for better performance on salary queries
CREATE INDEX IF NOT EXISTS idx_employees_salary ON employees(salary);
CREATE INDEX IF NOT EXISTS idx_job_postings_salary_range ON job_postings(salary_range_min, salary_range_max);
