-- =====================================================================
-- HRM ENTERPRISE DATABASE SCHEMA
-- Matches 14 HR Functional Modules + 4 Core Infrastructure Modules
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role_enum AS ENUM (
  'super_admin',
  'hr_admin',
  'hr_executive',
  'payroll_officer',
  'reporting_manager',
  'employee'
);

CREATE TYPE employment_status_enum AS ENUM (
  'probation',
  'active',
  'notice_period',
  'resigned',
  'terminated',
  'retired'
);

CREATE TYPE leave_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TYPE payroll_status_enum AS ENUM (
  'draft',
  'under_review',
  'approved',
  'processed',
  'disbursed'
);

-- 1. Master Reference Tables
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  head_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE designations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  grade VARCHAR(50) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  roles user_role_enum[] NOT NULL DEFAULT '{employee}',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employee Master Record
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  avatar_url TEXT,
  gender VARCHAR(20),
  dob DATE,
  date_of_joining DATE NOT NULL,
  department_id UUID REFERENCES departments(id),
  designation_id UUID REFERENCES designations(id),
  reporting_manager_id UUID REFERENCES employees(id),
  branch_id UUID REFERENCES branches(id),
  employment_status employment_status_enum NOT NULL DEFAULT 'probation',
  current_lifecycle_stage VARCHAR(100) NOT NULL DEFAULT 'joining',
  ctc_annual NUMERIC(15, 2) NOT NULL,
  bank_account_encrypted TEXT,
  bank_name VARCHAR(255),
  ifsc_code VARCHAR(50),
  pan VARCHAR(50),
  pf_number VARCHAR(100),
  esi_number VARCHAR(100),
  uan VARCHAR(100),
  emergency_contact_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  in_time TIMESTAMPTZ,
  out_time TIMESTAMPTZ,
  total_hours NUMERIC(4, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'present',
  source VARCHAR(50) NOT NULL DEFAULT 'biometric',
  regularization_status VARCHAR(50) DEFAULT 'none',
  regularization_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- 5. Leave Applications & Balances
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  total_allocated INT NOT NULL DEFAULT 0,
  used INT NOT NULL DEFAULT 0,
  pending INT NOT NULL DEFAULT 0,
  balance INT NOT NULL DEFAULT 0,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type, year)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_count NUMERIC(4, 1) NOT NULL,
  reason TEXT NOT NULL,
  status leave_status_enum NOT NULL DEFAULT 'pending',
  approver_id UUID REFERENCES employees(id),
  approver_comment TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ
);

-- 6. Payroll Runs & Payslips
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period VARCHAR(20) NOT NULL UNIQUE, -- e.g. "2026-07"
  month_name VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  status payroll_status_enum NOT NULL DEFAULT 'draft',
  total_employees INT NOT NULL DEFAULT 0,
  total_gross_pay NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_net_pay NUMERIC(15, 2) NOT NULL DEFAULT 0,
  variance_count INT NOT NULL DEFAULT 0,
  run_date TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL,
  paid_days INT NOT NULL,
  lop_days INT NOT NULL DEFAULT 0,
  breakup_json JSONB NOT NULL,
  payment_mode VARCHAR(50) DEFAULT 'bank_transfer',
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

-- 7. Recruitment & Candidates
CREATE TABLE manpower_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id),
  position_title VARCHAR(255) NOT NULL,
  openings_count INT NOT NULL DEFAULT 1,
  urgency VARCHAR(50) NOT NULL DEFAULT 'medium',
  requested_by UUID REFERENCES employees(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
  target_date DATE,
  min_experience VARCHAR(50),
  justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_id UUID REFERENCES manpower_requisitions(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  position VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'applied',
  score NUMERIC(5, 2),
  resume_url TEXT,
  interview_date TIMESTAMPTZ,
  interviewer_id UUID REFERENCES employees(id),
  scorecard_json JSONB,
  offer_details_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Performance Management
CREATE TABLE performance_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  period VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES performance_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  kras_json JSONB NOT NULL,
  self_rating NUMERIC(3, 2),
  manager_rating NUMERIC(3, 2),
  final_rating NUMERIC(3, 2),
  manager_comments TEXT,
  hr_calibration_notes TEXT,
  recommendation VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending_self',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Grievance & Disciplinary
CREATE TABLE grievances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  category VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  sla_deadline TIMESTAMPTZ NOT NULL,
  assigned_to_user_id UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disciplinary_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  violation_type VARCHAR(100) NOT NULL,
  incident_date DATE NOT NULL,
  reported_by UUID REFERENCES employees(id),
  severity VARCHAR(50) NOT NULL DEFAULT 'minor',
  current_stage VARCHAR(100) NOT NULL DEFAULT 'show_cause_issued',
  action_taken VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Resignation & Separation
CREATE TABLE resignation_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date DATE NOT NULL,
  requested_lwd DATE NOT NULL,
  approved_lwd DATE,
  notice_period_days INT NOT NULL DEFAULT 30,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  clearances_json JSONB NOT NULL DEFAULT '{}',
  ff_settlement_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Immutable Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  role user_role_enum NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details TEXT NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ultra-high performance query plans
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id);
CREATE INDEX idx_attendance_date ON attendance(date, employee_id);
CREATE INDEX idx_leaves_status ON leave_requests(status, approver_id);
CREATE INDEX idx_candidates_stage ON candidates(current_stage, requisition_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
