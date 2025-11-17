/*
  # Fix All Remaining RLS Policies with Old Roles

  ## Overview
  Removes all references to hr_manager and manager roles across all tables
  and replaces them with the new three-tier system (admin, super_user, simple_user).

  ## Tables Updated
  - applicants, attendance, attendance_anomalies, attendance_logs, attendance_sessions
  - biometric_devices, biometric_templates, departments, device_sync_logs
  - employee_shifts, expense_categories, expenses, fingerprint_templates
  - goals, interviews, job_postings, leave_balances, leave_requests, leave_types
  - payroll_components, payroll_periods, payslips, performance_cycles, performance_reviews, shifts

  ## Changes
  All policies that checked for 'hr_manager' or 'manager' now check for:
  - 'admin' for full access
  - 'super_user' for configurable department/employee access (where applicable)
*/

-- ============================================
-- APPLICANTS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage applicants" ON applicants;
DROP POLICY IF EXISTS "HR and admins can view applicants" ON applicants;

CREATE POLICY "Admins can manage applicants" ON applicants FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can view applicants" ON applicants FOR SELECT TO authenticated USING (is_admin());

-- ============================================
-- ATTENDANCE (remaining policies)
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage attendance" ON attendance;

-- Already covered by previous migration

-- ============================================
-- ATTENDANCE_ANOMALIES
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage anomalies" ON attendance_anomalies;

CREATE POLICY "Admins can manage anomalies" ON attendance_anomalies FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- ATTENDANCE_LOGS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can delete logs" ON attendance_logs;
DROP POLICY IF EXISTS "HR and admins can manage logs" ON attendance_logs;
DROP POLICY IF EXISTS "HR and managers can view all logs" ON attendance_logs;

CREATE POLICY "Admins can view all logs" ON attendance_logs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can manage logs" ON attendance_logs FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete logs" ON attendance_logs FOR DELETE TO authenticated USING (is_admin());

-- ============================================
-- ATTENDANCE_SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can view all attendance sessions" ON attendance_sessions;

CREATE POLICY "Admins can view all attendance sessions" ON attendance_sessions FOR SELECT TO authenticated USING (is_admin());

-- ============================================
-- BIOMETRIC_DEVICES
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage devices" ON biometric_devices;
DROP POLICY IF EXISTS "Users with attendance permission can view devices" ON biometric_devices;

CREATE POLICY "Admins can manage devices" ON biometric_devices FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "All authenticated users can view devices" ON biometric_devices FOR SELECT TO authenticated USING (true);

-- ============================================
-- BIOMETRIC_TEMPLATES
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage templates" ON biometric_templates;

CREATE POLICY "Admins can manage templates" ON biometric_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- DEPARTMENTS
-- ============================================
DROP POLICY IF EXISTS "HR can manage departments" ON departments;

-- Admins already have full access, no need to add more

-- ============================================
-- DEVICE_SYNC_LOGS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage sync logs" ON device_sync_logs;
DROP POLICY IF EXISTS "HR and admins can view sync logs" ON device_sync_logs;

CREATE POLICY "Admins can view sync logs" ON device_sync_logs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can manage sync logs" ON device_sync_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- EMPLOYEE_SHIFTS
-- ============================================
DROP POLICY IF EXISTS "HR can manage employee shifts" ON employee_shifts;

CREATE POLICY "Admins can manage employee shifts" ON employee_shifts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- EXPENSE_CATEGORIES
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage expense categories" ON expense_categories;

CREATE POLICY "Admins can manage expense categories" ON expense_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- EXPENSES
-- ============================================
DROP POLICY IF EXISTS "HR and admins can delete expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can approve department expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can view department expenses" ON expenses;

CREATE POLICY "Admins can view all expenses" ON expenses FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete expenses" ON expenses FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can update expenses" ON expenses FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Super users can view assigned expenses" ON expenses FOR SELECT TO authenticated 
USING (
  is_super_user() AND
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = expenses.employee_id
      AND (has_department_access(e.department_id, 'view') OR has_employee_access(e.id, 'view'))
  )
);

CREATE POLICY "Super users can approve assigned expenses" ON expenses FOR UPDATE TO authenticated
USING (
  is_super_user() AND
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = expenses.employee_id
      AND (has_department_access(e.department_id, 'approve') OR has_employee_access(e.id, 'edit'))
  )
)
WITH CHECK (
  is_super_user() AND
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = expenses.employee_id
      AND (has_department_access(e.department_id, 'approve') OR has_employee_access(e.id, 'edit'))
  )
);

-- ============================================
-- FINGERPRINT_TEMPLATES
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage fingerprint templates" ON fingerprint_templates;

CREATE POLICY "Admins can manage fingerprint templates" ON fingerprint_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- GOALS
-- ============================================
DROP POLICY IF EXISTS "Admins can delete goals" ON goals;
DROP POLICY IF EXISTS "Managers can manage department goals" ON goals;

CREATE POLICY "Admins can manage all goals" ON goals FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- INTERVIEWS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage interviews" ON interviews;
DROP POLICY IF EXISTS "HR and interviewers can view interviews" ON interviews;

CREATE POLICY "Admins can manage interviews" ON interviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can view interviews" ON interviews FOR SELECT TO authenticated USING (is_admin());

-- ============================================
-- JOB_POSTINGS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage job postings" ON job_postings;

CREATE POLICY "Admins can manage job postings" ON job_postings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- LEAVE_BALANCES
-- ============================================
DROP POLICY IF EXISTS "HR can manage leave balances" ON leave_balances;

CREATE POLICY "Admins can manage leave balances" ON leave_balances FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- LEAVE_REQUESTS (remaining)
-- ============================================
DROP POLICY IF EXISTS "HR and admins can delete leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can approve department leave requests" ON leave_requests;

-- Already covered by previous migration

-- ============================================
-- LEAVE_TYPES
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage leave types" ON leave_types;

CREATE POLICY "Admins can manage leave types" ON leave_types FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- PAYROLL_COMPONENTS
-- ============================================
DROP POLICY IF EXISTS "HR can manage payroll components" ON payroll_components;

CREATE POLICY "Admins can manage payroll components" ON payroll_components FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- PAYROLL_PERIODS
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage payroll periods" ON payroll_periods;

CREATE POLICY "Admins can manage payroll periods" ON payroll_periods FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- PAYSLIPS (remaining)
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage payslips" ON payslips;

-- Already covered by previous migration

-- ============================================
-- PERFORMANCE_CYCLES
-- ============================================
DROP POLICY IF EXISTS "HR and admins can manage performance cycles" ON performance_cycles;

CREATE POLICY "Admins can manage performance cycles" ON performance_cycles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- PERFORMANCE_REVIEWS
-- ============================================
DROP POLICY IF EXISTS "Managers can manage department reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Managers can view department reviews" ON performance_reviews;

CREATE POLICY "Admins can manage all reviews" ON performance_reviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can view all reviews" ON performance_reviews FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Super users can view assigned reviews" ON performance_reviews FOR SELECT TO authenticated
USING (
  is_super_user() AND
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = performance_reviews.employee_id
      AND (has_department_access(e.department_id, 'view') OR has_employee_access(e.id, 'view'))
  )
);

-- ============================================
-- SHIFTS
-- ============================================
DROP POLICY IF EXISTS "HR can manage shifts" ON shifts;

CREATE POLICY "Admins can manage shifts" ON shifts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
