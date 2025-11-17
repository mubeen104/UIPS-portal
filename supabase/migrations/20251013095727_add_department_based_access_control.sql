/*
  # Department-Based Access Control

  1. Schema Changes
    - Add `department_id` to users table
    - Add `manager_id` to departments table
    - Create department_managers junction table for multiple managers per department

  2. New Features
    - Managers can manage their assigned departments
    - Department-based employee visibility
    - Hierarchical access control

  3. Security
    - Update RLS policies to respect department boundaries
    - Managers can only see/edit employees in their departments
    - Admins have unrestricted access

  4. Important Notes
    - A user can belong to one department
    - A department can have multiple managers
    - Managers automatically get department-specific permissions
*/

-- Add department_id to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE users ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
  END IF;
END $$;

-- Create department_managers junction table
CREATE TABLE IF NOT EXISTS department_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(department_id, manager_id)
);

CREATE INDEX IF NOT EXISTS idx_department_managers_dept ON department_managers(department_id);
CREATE INDEX IF NOT EXISTS idx_department_managers_manager ON department_managers(manager_id);

-- Enable RLS
ALTER TABLE department_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_managers
CREATE POLICY "Everyone can view department managers"
  ON department_managers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage department managers"
  ON department_managers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to check if user manages a department
CREATE OR REPLACE FUNCTION user_manages_department(p_user_id uuid, p_department_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM department_managers
    WHERE manager_id = p_user_id
      AND department_id = p_department_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's managed departments
CREATE OR REPLACE FUNCTION get_managed_departments(p_user_id uuid)
RETURNS TABLE(department_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT dm.department_id
  FROM department_managers dm
  WHERE dm.manager_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update employees RLS to include department-based access
DROP POLICY IF EXISTS "Managers can view team data" ON employees;
CREATE POLICY "Managers can view department employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 FROM users emp_user
            WHERE emp_user.id = employees.user_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Managers can update employees in their departments
DROP POLICY IF EXISTS "Managers can update department employees" ON employees;
CREATE POLICY "Managers can update department employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 FROM users emp_user
            WHERE emp_user.id = employees.user_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 FROM users emp_user
            WHERE emp_user.id = employees.user_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Update attendance policies for department-based access
DROP POLICY IF EXISTS "HR and managers can view team attendance" ON attendance;
CREATE POLICY "Managers can view department attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = attendance.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Update leave requests for department-based access
DROP POLICY IF EXISTS "Managers and HR can view all leave requests" ON leave_requests;
CREATE POLICY "Managers can view department leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Admins and HR can see all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
    OR
    -- Managers can see their department's requests
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
      AND EXISTS (
        SELECT 1 
        FROM employees e
        JOIN users emp_user ON emp_user.id = e.user_id
        WHERE e.id = leave_requests.employee_id
        AND user_manages_department(auth.uid(), emp_user.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Managers and HR can update leave requests" ON leave_requests;
CREATE POLICY "Managers can approve department leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = leave_requests.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = leave_requests.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Update expenses for department-based access
DROP POLICY IF EXISTS "Managers and HR can view all expenses" ON expenses;
CREATE POLICY "Managers can view department expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = expenses.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Admins and HR can see all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
    OR
    -- Managers can see their department's expenses
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
      AND EXISTS (
        SELECT 1 
        FROM employees e
        JOIN users emp_user ON emp_user.id = e.user_id
        WHERE e.id = expenses.employee_id
        AND user_manages_department(auth.uid(), emp_user.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Managers and HR can update expenses" ON expenses;
CREATE POLICY "Managers can approve department expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = expenses.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = expenses.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Update performance reviews for department-based access
DROP POLICY IF EXISTS "Managers and HR can view all reviews" ON performance_reviews;
CREATE POLICY "Managers can view department reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = performance_reviews.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Admins and HR can see all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr_manager')
    )
    OR
    -- Managers can see their department's reviews
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'manager'
      AND EXISTS (
        SELECT 1 
        FROM employees e
        JOIN users emp_user ON emp_user.id = e.user_id
        WHERE e.id = performance_reviews.employee_id
        AND user_manages_department(auth.uid(), emp_user.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Managers and HR can manage reviews" ON performance_reviews;
CREATE POLICY "Managers can manage department reviews"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = performance_reviews.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = performance_reviews.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Update goals for department-based access
DROP POLICY IF EXISTS "Managers and HR can manage all goals" ON goals;
CREATE POLICY "Managers can manage department goals"
  ON goals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = goals.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr_manager')
        OR (
          u.role = 'manager'
          AND EXISTS (
            SELECT 1 
            FROM employees e
            JOIN users emp_user ON emp_user.id = e.user_id
            WHERE e.id = goals.employee_id
            AND user_manages_department(auth.uid(), emp_user.department_id)
          )
        )
      )
    )
  );

-- Add comments for clarity
COMMENT ON TABLE department_managers IS 'Junction table linking managers to departments they oversee';
COMMENT ON COLUMN users.department_id IS 'Department the user belongs to';
COMMENT ON FUNCTION user_manages_department IS 'Check if a user is assigned as manager of a specific department';
