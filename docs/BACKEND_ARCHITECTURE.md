# Viruzverse Solutions HRM — Backend Architecture & Security Blueprint

## 1. System Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │            Next.js App Router Frontend (React 19)      │
 └─────────────────────────┬──────────────────────────────┘
                           │ (JSON API / Server Actions)
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │           API Security & RBAC Middleware Layer         │
 │   • getApiUserContext()                                │
 │   • requireModuleAccess(role, module)                  │
 │   • requireActionPermission(role, action, module)      │
 │   • Field-level CTC / Bank Account Redaction           │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │           Core Operations & Calculation Engine         │
 │   • Attendance & Overtime Engine                       │
 │   • Multi-tier Leave State Machine                     │
 │   • Gross-to-Net Payroll & Statutory Formula           │
 │   • ATS Stage Transition Controller                    │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │           Prisma ORM & PostgreSQL Database             │
 │   • Multi-tenancy Isolation (Organization, Branch)     │
 │   • Immutable Audit Chaining (SHA-256 Hashes)          │
 │   • 17-Stage Employee Lifecycle Tracking               │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Security & Compliance Protocols

### A. Field-Level Confidentiality
* **Salary & Compensation**: The `Employee.ctc` and `BankDetails` are filtered at the API layer. Visible **only** to:
  1. `super_admin`
  2. `hr_admin`
  3. `payroll_officer`
  4. The employee themselves (`isSelf = true`).
  * Non-authorized roles (`hr_executive`, `reporting_manager`, other employees) receive `ctc: 0` and omitted bank data.

### B. Tamper-Proof Audit Logging
* Every high-privilege action (payroll disbursement, leave approval, employee status change) creates an immutable `AuditLog` row containing:
  * `payloadBefore` and `payloadAfter` (JSON)
  * `integrityHash` = `SHA-256(previousHash + action + timestamp + payloadAfter)`
* Ensures non-repudiation for statutory labor audits (Factory Act, EPF, ESI).

---

## 3. Core REST API Reference

| Endpoint | Method | RBAC Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/session` | `GET` | Any authenticated user | Returns active user persona and assigned roles. |
| `/api/employees` | `GET` | `employee_records` (View) | List employees with search, department filter, and salary masking. |
| `/api/employees/[id]` | `GET` | `employee_records` (View) | Detailed 360 employee profile with statutory & bank tabs. |
| `/api/attendance/checkin` | `POST` | `attendance_leave` (Edit/Self) | Submits web or biometric check-in timestamp. |
| `/api/leaves` | `GET` | `attendance_leave` (View) | Returns leave list filtered by caller's role (self vs. team vs. plant). |
| `/api/leaves/apply` | `POST` | `attendance_leave` (Self) | Submits leave request with automatic balance deduction calculation. |
| `/api/leaves/[id]/action` | `POST` | `attendance_leave` (Approve) | Reporting manager or HR Admin approves/rejects leave request. |
| `/api/payroll/runs` | `GET` | `payroll_benefits` (View) | Monthly payroll runs (Admins) or personal payslips (Employees). |
| `/api/audit-logs` | `GET` | `system_settings` (View) | Immutable security audit trail with integrity validation. |
