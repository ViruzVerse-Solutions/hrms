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
  1. `chairman`
  2. `managing_director`
  3. `hr_head`
  4. `internal_audit_head`
  5. `compliance_statutory` (Statutory wage data)
  6. The employee themselves (`isSelf = true`).
  * Regular employee queries across other staff receive `ctc: 0` and omitted sensitive bank details.

### B. Tamper-Proof Audit Logging
* Every high-privilege action (payroll disbursement, leave approval, employee status change) creates an immutable `AuditLog` row containing:
  * `payloadBefore` and `payloadAfter` (JSON)
  * `integrityHash` = `SHA-256(previousHash + action + timestamp + payloadAfter)`
* Ensures non-repudiation for statutory labor audits (Factory Act, EPF, ESI).

---

## 3. Core REST API Reference

| Endpoint | Method | Permitted RBAC Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/session` | `GET` | All 6 Roles | Returns active user persona and assigned roles. |
| `/api/employees` | `GET` | `chairman`, `managing_director`, `hr_head`, `internal_audit_head`, `compliance_statutory`, `employee` | List employees with search, department filter, and salary masking. |
| `/api/employees/[id]` | `GET` | All 6 Roles (Scoped) | Detailed 360 employee profile with statutory & bank tabs. |
| `/api/attendance/checkin` | `POST` | `employee`, `hr_head`, `managing_director` | Submits web or biometric check-in timestamp. |
| `/api/leaves` | `GET` | All 6 Roles | Returns leave list filtered by caller's role (self vs. team vs. plant). |
| `/api/leaves/apply` | `POST` | `employee`, `hr_head`, `managing_director` | Submits leave request with automatic balance deduction calculation. |
| `/api/leaves/[id]/action` | `POST` | `managing_director`, `hr_head` | MD or HR Head approves/rejects leave request. |
| `/api/payroll/runs` | `GET` | `chairman`, `managing_director`, `hr_head`, `internal_audit_head`, `compliance_statutory`, `employee` | Monthly payroll runs (Admins/Audit/MD) or personal payslips (Employees). |
| `/api/recruitment` | `GET`, `POST` | `chairman`, `managing_director`, `hr_head`, `internal_audit_head` | Manpower requisitions & Kanban candidate pipeline stages. |
| `/api/performance` | `GET` | `chairman`, `managing_director`, `hr_head`, `internal_audit_head`, `employee` | Annual KRA appraisals, 9-box talent matrix & calibration. |
| `/api/grievances` | `GET`, `POST` | All 6 Roles | Confidential POSH / HR grievance ticket submission & SLA tracker. |
| `/api/audit-logs` | `GET` | `chairman`, `managing_director`, `hr_head`, `internal_audit_head` | Immutable security audit trail with integrity validation. |
