-- =====================================================================
-- POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation & RBAC enforcement directly in the database engine
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current authenticated user role
CREATE OR REPLACE FUNCTION auth_user_roles()
RETURNS user_role_enum[] AS $$
  SELECT roles FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Employees RLS
-- Super Admin, HR Admin can read/write all
-- Reporting managers can view their direct team
-- Employees can view their own record only (confidential fields guarded)
CREATE POLICY employees_admin_all ON employees
  FOR ALL TO authenticated
  USING (
    'super_admin' = ANY(auth_user_roles()) OR
    'hr_admin' = ANY(auth_user_roles())
  );

CREATE POLICY employees_manager_read ON employees
  FOR SELECT TO authenticated
  USING (
    reporting_manager_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY employees_self_read ON employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Payslips RLS
-- Payroll Officer, HR Admin, Super Admin can manage
-- Employee can ONLY select their own published payslips
CREATE POLICY payslips_payroll_all ON payslips
  FOR ALL TO authenticated
  USING (
    'payroll_officer' = ANY(auth_user_roles()) OR
    'super_admin' = ANY(auth_user_roles())
  );

CREATE POLICY payslips_employee_self ON payslips
  FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'published'
  );

-- 3. Attendance & Leave RLS
CREATE POLICY leaves_manager_read_approve ON leave_requests
  FOR ALL TO authenticated
  USING (
    approver_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR
    'hr_admin' = ANY(auth_user_roles()) OR
    'hr_executive' = ANY(auth_user_roles())
  );

CREATE POLICY leaves_employee_self ON leave_requests
  FOR ALL TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- 4. Disciplinary & Grievances RLS (High Confidentiality)
CREATE POLICY disciplinary_hr_admin_only ON disciplinary_cases
  FOR ALL TO authenticated
  USING (
    'hr_admin' = ANY(auth_user_roles()) OR
    'super_admin' = ANY(auth_user_roles())
  );

-- 5. Audit Log (Append Only / Immutable)
CREATE POLICY audit_log_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY audit_log_select ON audit_logs
  FOR SELECT TO authenticated
  USING (
    'super_admin' = ANY(auth_user_roles()) OR
    'hr_admin' = ANY(auth_user_roles())
  );
