/*
  # Seed Initial Data

  ## Overview
  Populates the database with initial reference data for testing and demonstration.

  ## Data Inserted
  1. Leave Types
    - Annual Leave
    - Sick Leave
    - Personal Leave
    - Unpaid Leave
  
  2. Expense Categories
    - Travel
    - Meals
    - Office Supplies
    - Training
    - Equipment
  
  3. Shifts
    - Morning Shift (9:00 AM - 5:00 PM)
    - Evening Shift (2:00 PM - 10:00 PM)
    - Night Shift (10:00 PM - 6:00 AM)
  
  4. Departments
    - Engineering
    - Human Resources
    - Sales
    - Marketing
    - Finance
*/

-- Insert Leave Types
INSERT INTO leave_types (name, annual_quota, is_paid, requires_approval)
VALUES
  ('Annual Leave', 20, true, true),
  ('Sick Leave', 10, true, true),
  ('Personal Leave', 5, true, true),
  ('Unpaid Leave', 0, false, true)
ON CONFLICT DO NOTHING;

-- Insert Expense Categories
INSERT INTO expense_categories (name, description)
VALUES
  ('Travel', 'Business travel expenses including flights, accommodation'),
  ('Meals', 'Business meal expenses'),
  ('Office Supplies', 'General office supplies and stationery'),
  ('Training', 'Professional development and training courses'),
  ('Equipment', 'Computer equipment and accessories')
ON CONFLICT DO NOTHING;

-- Insert Shifts
INSERT INTO shifts (name, start_time, end_time)
VALUES
  ('Morning Shift', '09:00:00', '17:00:00'),
  ('Evening Shift', '14:00:00', '22:00:00'),
  ('Night Shift', '22:00:00', '06:00:00')
ON CONFLICT DO NOTHING;

-- Insert Departments
INSERT INTO departments (name, description)
VALUES
  ('Engineering', 'Software development and technology team'),
  ('Human Resources', 'People operations and talent management'),
  ('Sales', 'Revenue generation and client relations'),
  ('Marketing', 'Brand, content, and growth marketing'),
  ('Finance', 'Financial operations and accounting')
ON CONFLICT DO NOTHING;