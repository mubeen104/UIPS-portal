/*
  # HR Application Database Schema

  ## Overview
  Complete HR management system with employee lifecycle, attendance, leaves, expenses, performance, payroll, and recruitment.

  ## 1. New Tables

  ### Authentication & Users
  - `users` - Extends auth.users with HR-specific profile data
    - `id` (uuid, references auth.users)
    - `email` (text)
    - `full_name` (text)
    - `role` (text) - admin, hr_manager, manager, employee
    - `avatar_url` (text)
    - `phone` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Employee Management
  - `departments` - Organization departments
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `manager_id` (uuid, references users)
    - `created_at` (timestamptz)

  - `employees` - Core employee data
    - `id` (uuid, primary key)
    - `user_id` (uuid, references users)
    - `employee_number` (text, unique)
    - `department_id` (uuid, references departments)
    - `position` (text)
    - `employment_type` (text) - full_time, part_time, contract, intern
    - `hire_date` (date)
    - `termination_date` (date, nullable)
    - `status` (text) - active, inactive, terminated
    - `manager_id` (uuid, references employees)
    - `salary` (numeric)
    - `date_of_birth` (date)
    - `address` (text)
    - `emergency_contact_name` (text)
    - `emergency_contact_phone` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Shifts & Attendance
  - `shifts` - Shift schedules
    - `id` (uuid, primary key)
    - `name` (text)
    - `start_time` (time)
    - `end_time` (time)
    - `created_at` (timestamptz)

  - `employee_shifts` - Employee shift assignments
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `shift_id` (uuid, references shifts)
    - `effective_date` (date)
    - `created_at` (timestamptz)

  - `attendance` - Daily attendance records
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `date` (date)
    - `check_in` (timestamptz)
    - `check_out` (timestamptz)
    - `status` (text) - present, absent, late, half_day
    - `notes` (text)
    - `created_at` (timestamptz)

  ### Leave Management
  - `leave_types` - Types of leaves
    - `id` (uuid, primary key)
    - `name` (text)
    - `annual_quota` (integer) - days per year
    - `is_paid` (boolean)
    - `requires_approval` (boolean)
    - `created_at` (timestamptz)

  - `leave_balances` - Employee leave balances
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `leave_type_id` (uuid, references leave_types)
    - `year` (integer)
    - `total_days` (numeric)
    - `used_days` (numeric)
    - `remaining_days` (numeric)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `leave_requests` - Leave applications
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `leave_type_id` (uuid, references leave_types)
    - `start_date` (date)
    - `end_date` (date)
    - `days_count` (numeric)
    - `reason` (text)
    - `status` (text) - pending, approved, rejected, cancelled
    - `approver_id` (uuid, references users)
    - `approval_date` (timestamptz)
    - `approval_notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Expense Management
  - `expense_categories` - Expense classification
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `created_at` (timestamptz)

  - `expenses` - Employee expense claims
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `category_id` (uuid, references expense_categories)
    - `amount` (numeric)
    - `currency` (text)
    - `date` (date)
    - `description` (text)
    - `receipt_url` (text)
    - `status` (text) - pending, approved, rejected, reimbursed
    - `approver_id` (uuid, references users)
    - `approval_date` (timestamptz)
    - `approval_notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Performance Management
  - `performance_cycles` - Review periods
    - `id` (uuid, primary key)
    - `name` (text)
    - `start_date` (date)
    - `end_date` (date)
    - `status` (text) - planned, active, completed
    - `created_at` (timestamptz)

  - `performance_reviews` - Employee reviews
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `reviewer_id` (uuid, references users)
    - `cycle_id` (uuid, references performance_cycles)
    - `review_date` (date)
    - `overall_rating` (integer) - 1-5 scale
    - `strengths` (text)
    - `areas_for_improvement` (text)
    - `goals` (text)
    - `comments` (text)
    - `status` (text) - draft, submitted, acknowledged
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `goals` - Employee goals and objectives
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `title` (text)
    - `description` (text)
    - `target_date` (date)
    - `status` (text) - not_started, in_progress, completed, cancelled
    - `progress_percentage` (integer)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Payroll
  - `payroll_periods` - Pay periods
    - `id` (uuid, primary key)
    - `name` (text)
    - `start_date` (date)
    - `end_date` (date)
    - `payment_date` (date)
    - `status` (text) - draft, processing, completed, paid
    - `created_at` (timestamptz)

  - `payslips` - Employee payslips
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references employees)
    - `period_id` (uuid, references payroll_periods)
    - `base_salary` (numeric)
    - `allowances` (numeric)
    - `bonuses` (numeric)
    - `gross_pay` (numeric)
    - `tax` (numeric)
    - `deductions` (numeric)
    - `net_pay` (numeric)
    - `status` (text) - draft, approved, paid
    - `payment_date` (date)
    - `notes` (text)
    - `created_at` (timestamptz)

  - `payroll_components` - Individual pay components
    - `id` (uuid, primary key)
    - `payslip_id` (uuid, references payslips)
    - `component_type` (text) - allowance, deduction, bonus, tax
    - `name` (text)
    - `amount` (numeric)
    - `created_at` (timestamptz)

  ### Recruitment
  - `job_postings` - Open positions
    - `id` (uuid, primary key)
    - `title` (text)
    - `department_id` (uuid, references departments)
    - `description` (text)
    - `requirements` (text)
    - `employment_type` (text)
    - `salary_range_min` (numeric)
    - `salary_range_max` (numeric)
    - `status` (text) - draft, open, closed, filled
    - `posted_date` (date)
    - `closing_date` (date)
    - `created_by` (uuid, references users)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `applicants` - Job applications
    - `id` (uuid, primary key)
    - `job_posting_id` (uuid, references job_postings)
    - `full_name` (text)
    - `email` (text)
    - `phone` (text)
    - `resume_url` (text)
    - `cover_letter` (text)
    - `status` (text) - applied, screening, interview, offer, hired, rejected
    - `applied_date` (date)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `interviews` - Interview scheduling
    - `id` (uuid, primary key)
    - `applicant_id` (uuid, references applicants)
    - `interviewer_id` (uuid, references users)
    - `scheduled_date` (timestamptz)
    - `location` (text)
    - `type` (text) - phone, video, in_person
    - `status` (text) - scheduled, completed, cancelled
    - `feedback` (text)
    - `rating` (integer)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Create policies for role-based access control
  - Employees can view their own data
  - Managers can view their team's data
  - HR managers can view and modify all data
  - Admins have full access

  ## 3. Indexes
  - Added indexes on foreign keys and frequently queried columns for performance
*/

-- Create users profile table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  manager_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_number text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  position text NOT NULL,
  employment_type text NOT NULL DEFAULT 'full_time',
  hire_date date NOT NULL,
  termination_date date,
  status text NOT NULL DEFAULT 'active',
  manager_id uuid REFERENCES employees(id),
  salary numeric(12, 2) NOT NULL,
  date_of_birth date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Employee Shifts
CREATE TABLE IF NOT EXISTS employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, effective_date)
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  annual_quota integer NOT NULL DEFAULT 0,
  is_paid boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  total_days numeric(5, 2) NOT NULL DEFAULT 0,
  used_days numeric(5, 2) NOT NULL DEFAULT 0,
  remaining_days numeric(5, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric(5, 2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES users(id),
  approval_date timestamptz,
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id),
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  date date NOT NULL,
  description text,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES users(id),
  approval_date timestamptz,
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Cycles
CREATE TABLE IF NOT EXISTS performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz DEFAULT now()
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id),
  cycle_id uuid REFERENCES performance_cycles(id),
  review_date date NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths text,
  areas_for_improvement text,
  goals text,
  comments text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'not_started',
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  payment_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  period_id uuid REFERENCES payroll_periods(id) ON DELETE CASCADE,
  base_salary numeric(12, 2) NOT NULL,
  allowances numeric(12, 2) DEFAULT 0,
  bonuses numeric(12, 2) DEFAULT 0,
  gross_pay numeric(12, 2) NOT NULL,
  tax numeric(12, 2) DEFAULT 0,
  deductions numeric(12, 2) DEFAULT 0,
  net_pay numeric(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_id)
);

-- Payroll Components
CREATE TABLE IF NOT EXISTS payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid REFERENCES payslips(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  name text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES departments(id),
  description text NOT NULL,
  requirements text,
  employment_type text NOT NULL,
  salary_range_min numeric(12, 2),
  salary_range_max numeric(12, 2),
  status text NOT NULL DEFAULT 'draft',
  posted_date date,
  closing_date date,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Applicants
CREATE TABLE IF NOT EXISTS applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  cover_letter text,
  status text NOT NULL DEFAULT 'applied',
  applied_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid REFERENCES applicants(id) ON DELETE CASCADE,
  interviewer_id uuid REFERENCES users(id),
  scheduled_date timestamptz NOT NULL,
  location text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  feedback text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_applicants_job ON applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "HR and admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for employees table
CREATE POLICY "Employees can view own data"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view team data"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.id = employees.manager_id
    )
  );

CREATE POLICY "HR and admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "HR and admins can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Employees can view own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = attendance.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create own attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = attendance.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and managers can view team attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- RLS Policies for leave_requests
CREATE POLICY "Employees can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and HR can view all leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

CREATE POLICY "Managers and HR can update leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Employees can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = expenses.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = expenses.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and HR can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

CREATE POLICY "Managers and HR can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- RLS Policies for payslips
CREATE POLICY "Employees can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = payslips.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and admins can manage payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for performance_reviews
CREATE POLICY "Employees can view own reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = performance_reviews.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and HR can view all reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

CREATE POLICY "Managers and HR can manage reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- RLS Policies for goals
CREATE POLICY "Employees can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = goals.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = goals.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = goals.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and HR can manage all goals"
  ON goals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager', 'manager')
    )
  );

-- RLS Policies for job_postings (public read for open positions)
CREATE POLICY "Anyone can view open job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (status = 'open');

CREATE POLICY "HR and admins can manage job postings"
  ON job_postings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for applicants
CREATE POLICY "HR and admins can view applicants"
  ON applicants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "HR and admins can manage applicants"
  ON applicants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- RLS Policies for interviews
CREATE POLICY "HR and interviewers can view interviews"
  ON interviews FOR SELECT
  TO authenticated
  USING (
    interviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "HR and admins can manage interviews"
  ON interviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Simple read policies for reference tables
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Authenticated users can view shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR can manage shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Authenticated users can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view performance cycles"
  ON performance_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view payroll periods"
  ON payroll_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can view own employee shifts"
  ON employee_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_shifts.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage employee shifts"
  ON employee_shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Employees can view own leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_balances.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage leave balances"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "Employees can view own payroll components"
  ON payroll_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payslips p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.id = payroll_components.payslip_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage payroll components"
  ON payroll_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr_manager')
    )
  );