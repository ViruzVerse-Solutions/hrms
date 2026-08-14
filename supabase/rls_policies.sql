-- ==============================================================================
-- VIRUZVERSE SOLUTIONS HRM — PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- Execute in Supabase Dashboard -> SQL Editor
-- ==========================================

-- Helper Function: Get Current Authenticated User Role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.user_role', true),
    (SELECT "activeRole"::text FROM "User" WHERE "id" = auth.uid()::text)
  );
$$ LANGUAGE sql STABLE;

-- Helper Function: Get Current Authenticated Employee ID
CREATE OR REPLACE FUNCTION auth_employee_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.employee_id', true),
    (SELECT "employeeId" FROM "User" WHERE "id" = auth.uid()::text)
  );
$$ LANGUAGE sql STABLE;

-- ==========================================
-- 1. EMPLOYEE MASTER & DIRECTORY
-- ==========================================
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;

-- Admins: Full Access
CREATE POLICY "Admins full access on Employee"
ON "Employee" FOR ALL
TO authenticated
USING (auth_user_role() IN ('super_admin', 'hr_admin', 'hr_executive'));

-- Managers: View self and team subordinates
CREATE POLICY "Managers view team on Employee"
ON "Employee" FOR SELECT
TO authenticated
USING (
  auth_user_role() = 'reporting_manager' AND (
    "id" = auth_employee_id() OR "reportingManagerId" = auth_employee_id()
  )
);

-- Employees: View self and company directory (basic info)
CREATE POLICY "Employees view directory"
ON "Employee" FOR SELECT
TO authenticated
USING (true);

-- ==========================================
-- 2. CONFIDENTIAL SENSITIVE DATA (BANK & STATUTORY)
-- ==========================================
ALTER TABLE "BankDetails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatutoryInfo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confidential access on BankDetails"
ON "BankDetails" FOR ALL
TO authenticated
USING (
  auth_user_role() IN ('super_admin', 'hr_admin', 'payroll_officer') OR
  "employeeId" = auth_employee_id()
);

CREATE POLICY "Confidential access on StatutoryInfo"
ON "StatutoryInfo" FOR ALL
TO authenticated
USING (
  auth_user_role() IN ('super_admin', 'hr_admin', 'payroll_officer') OR
  "employeeId" = auth_employee_id()
);

-- ==========================================
-- 3. ATTENDANCE RECORDS
-- ==========================================
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on Attendance"
ON "AttendanceRecord" FOR ALL
TO authenticated
USING (auth_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "Managers view team Attendance"
ON "AttendanceRecord" FOR SELECT
TO authenticated
USING (
  auth_user_role() = 'reporting_manager' AND (
    "employeeId" = auth_employee_id() OR
    "employeeId" IN (SELECT "id" FROM "Employee" WHERE "reportingManagerId" = auth_employee_id())
  )
);

CREATE POLICY "Employees own Attendance checkins"
ON "AttendanceRecord" FOR ALL
TO authenticated
USING ("employeeId" = auth_employee_id())
WITH CHECK ("employeeId" = auth_employee_id());

-- ==========================================
-- 4. LEAVE REQUESTS & APPROVALS
-- ==========================================
ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on LeaveRequest"
ON "LeaveRequest" FOR ALL
TO authenticated
USING (auth_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "Managers review team LeaveRequests"
ON "LeaveRequest" FOR ALL
TO authenticated
USING (
  auth_user_role() = 'reporting_manager' AND (
    "employeeId" = auth_employee_id() OR "approverId" = auth_employee_id()
  )
);

CREATE POLICY "Employees manage own LeaveRequests"
ON "LeaveRequest" FOR ALL
TO authenticated
USING ("employeeId" = auth_employee_id())
WITH CHECK ("employeeId" = auth_employee_id());

-- ==========================================
-- 5. PAYROLL RUNS & PAYSLIPS
-- ==========================================
ALTER TABLE "PayrollRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payroll Officers manage PayrollRuns"
ON "PayrollRun" FOR ALL
TO authenticated
USING (auth_user_role() IN ('super_admin', 'payroll_officer'));

CREATE POLICY "Payroll Officers manage Payslips"
ON "Payslip" FOR ALL
TO authenticated
USING (auth_user_role() IN ('super_admin', 'payroll_officer'));

CREATE POLICY "Employees view own Payslips"
ON "Payslip" FOR SELECT
TO authenticated
USING ("employeeId" = auth_employee_id());

-- ==========================================
-- 6. IMMUTABLE AUDIT TRAIL
-- ==========================================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view AuditLogs"
ON "AuditLog" FOR SELECT
TO authenticated
USING (auth_user_role() IN ('super_admin', 'hr_admin'));

CREATE POLICY "System append AuditLogs"
ON "AuditLog" FOR INSERT
TO authenticated
WITH CHECK (true);

-- Disallow UPDATE and DELETE on AuditLog for all roles (Zero Tampering)
-- (No UPDATE/DELETE policies created -> default deny)
