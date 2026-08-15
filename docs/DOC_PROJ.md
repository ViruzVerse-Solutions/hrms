# Viruzverse Solutions HRM — Phase-by-Phase Master Implementation & Role Matrix

## 1. System Architecture & Tech Stack
* **Frontend**: Next.js 16 (React 19, TypeScript), Tailwind CSS (60-30-10 Light Theme), Lucide Icons.
* **Backend**: Next.js App Router Serverless Route Handlers (`src/app/api/`).
* **Database & ORM**: Supabase Managed PostgreSQL + Prisma ORM Client.
* **Security**: Multi-Tenant RBAC + PostgreSQL Row Level Security (RLS) + SHA-256 Audit Trail.

---

## 2. Enterprise Roles & Responsibilities Matrix

| # | Enterprise Role | Key Responsibilities | Primary Modules & Permissions |
| :--- | :--- | :--- | :--- |
| 1 | **Chairman** (`chairman`) | Board-level governance, strategic workforce oversight, executive appointments, board reporting, enterprise compensation budget approval. | **Full**: Reports & Dashboards, Performance Calibrations, Policy Compliance.<br>**Approve**: Key Transfers/Promotions.<br>**View**: Master Directory, Recruitment, Attendance, Payroll, Settings. |
| 2 | **Managing Director** (`managing_director`) | Chief executive operations, operational KPI management, inter-plant transfers, senior hiring authorizations, payroll run sign-off, disciplinary reviews. | **Full**: Master Directory, Performance Mgmt, Disciplinary Actions, Policy Compliance, Transfers & Promotions, System Settings.<br>**Approve**: Recruitment Requisitions, Leave Queues, Payroll Batches, Resignation Exits. |
| 3 | **HR Head** (`hr_head`) | Complete operational authority across all 17 lifecycle stages: manpower planning, recruitment, onboarding, biometric attendance, payroll processing, KRA appraisals, and F&F clearance. | **Full (F)** across all 14 HRM modules: Employee Records, Recruitment, Onboarding, Attendance/Leave, Payroll, Performance, Training, Engagement, Compliance, Movement, Disciplinary, Exit & Settings. |
| 4 | **Internal Audit Head** (`internal_audit_head`) | Independent forensic compliance, inspection of tamper-proof SHA-256 audit logs, gross-to-net payroll variance review, attendance integrity verification, and risk auditing. | **Full (F)**: Policy Compliance, System Settings (Immutable Audit Logs).<br>**View (V)**: Master Directory, Recruitment, Onboarding, Attendance, Payroll, Performance, Training, Engagement, Movement, Disciplinary, Exit. |
| 5 | **Compliance & Statutory** (`compliance_statutory`) | Statutory filings (EPF, ESI, TDS 192B, PT, LWF), Factory Act registers (Form 25 & 12), POSH committee operations, EHS safety audits, and statutory exit clearances. | **Full (F)**: Policy Compliance.<br>**Edit (E)**: Onboarding Verification, Payroll Statutory Calculations, Training (EHS/Safety), Welfare/POSH, Resignation Exit Clearances.<br>**View (V)**: Directory, Attendance Muster Roll, Settings. |
| 6 | **Employee** (`employee`) | Employee Self-Service (ESS): daily web clock-in, leave application, view/download monthly payslips, annual self-appraisal KRA submission, confidential grievances, policy acknowledgement. | **Self-Service (S)**: Dashboard, Profile 360, Attendance Check-In, Leave Requests, Payslips, Self-Appraisals, Training Enrolment, Grievance Filing, Resignation Notice.<br>**View (V)**: Policy & Compliance. |

---

## 3. Dynamic Screen & Sidebar Navigation by Role

```
┌─────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────────┬──────────────────────┬──────────────┐
│ HRM Navigation Module   │ Chairman     │ MD           │ HR Head      │ Int. Audit Head  │ Compliance/Statutory │ Employee     │
├─────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────────┼──────────────────────┼──────────────┤
│ Overview: Dashboard     │ Visible (F)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Visible (S)  │
│ Analytics & Reports     │ Visible (F)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Hidden (NONE)│
│ Employee Directory      │ Visible (V)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Visible (S)  │
│ Recruitment & ATS       │ Visible (V)  │ Visible (A)  │ Visible (F)  │ Visible (V)      │ Hidden (NONE)        │ Hidden (NONE)│
│ Attendance & Logs       │ Visible (V)  │ Visible (A)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Visible (S)  │
│ Leave Management        │ Visible (V)  │ Visible (A)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Visible (S)  │
│ Payroll & Benefits      │ Visible (V)  │ Visible (A)  │ Visible (F)  │ Visible (V)      │ Visible (E)          │ Visible (S)  │
│ Performance & KRAs      │ Visible (F)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Hidden (NONE)        │ Visible (S)  │
│ Training & Skills       │ Visible (V)  │ Visible (V)  │ Visible (F)  │ Visible (V)      │ Visible (E)          │ Visible (S)  │
│ Engagement & Welfare    │ Visible (V)  │ Visible (V)  │ Visible (F)  │ Visible (V)      │ Visible (E)          │ Visible (S)  │
│ Transfers & Promotions  │ Visible (A)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Hidden (NONE)        │ Visible (S)  │
│ Policy & Compliance     │ Visible (F)  │ Visible (F)  │ Visible (F)  │ Visible (F)      │ Visible (F)          │ Visible (V)  │
│ Disciplinary Records    │ Visible (V)  │ Visible (F)  │ Visible (F)  │ Visible (V)      │ Visible (V)          │ Hidden (NONE)│
│ Resignation & Exit      │ Visible (V)  │ Visible (A)  │ Visible (F)  │ Visible (V)      │ Visible (E)          │ Visible (S)  │
│ System Settings & Audit │ Visible (V)  │ Visible (F)  │ Visible (F)  │ Visible (F)      │ Visible (V)          │ Hidden (NONE)│
└─────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────────┴──────────────────────┴──────────────┘
```

---

## 4. Phase-by-Phase Implementation Roadmap & Status

```
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 1: Foundation, RBAC & Database Security (DONE)   │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 2: Employee 360 & Master Directory (DONE)       │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 3: Attendance, Leave Management & Approvals (DONE)│
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 4: Payroll Calculation, Statutory & Payslips (DONE)│
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 5: ATS Recruitment, KRA Appraisals & Grievances (DONE)│
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │  PHASE 6: End-to-End Persona Testing & Rehearsal (DONE) │
 └────────────────────────────────────────────────────────┘
```

---

### 🚀 PHASE 1: Database Architecture, RBAC & RLS Hardening
* **Status**: ✅ **COMPLETED**
* **Delivered Artifacts**:
  - `prisma/schema.prisma`: Enterprise models with 6-role RBAC enums.
  - `src/lib/rbac/permissions.ts`: 6-role permission matrix across 14 modules.
  - `src/lib/auth/rbac-guard-api.ts`: Route handler RBAC authorization layer.

---

### 🚀 PHASE 2: Employee 360 & Organizational Directory
* **Status**: ✅ **COMPLETED**
* **Delivered Artifacts**:
  - `GET /api/employees`: Live directory with salary masking based on active role.
  - `GET /api/employees/[id]`: 360 profile with bank, statutory, and 17-stage lifecycle tracker.

---

### 🚀 PHASE 3: Attendance, Leaves & Multi-Tier Approvals
* **Status**: ✅ **COMPLETED**
* **Delivered Artifacts**:
  - `POST /api/attendance/checkin`: Web check-in with reactive state updates.
  - `GET /api/leaves`: Scoped leave retrieval (Self vs Plant vs Approvals).
  - `POST /api/leaves/apply`: Balance validation and auto-calculation.
  - `POST /api/leaves/[id]/action`: Manager / MD / HR Head approval workflow.

---

### 🚀 PHASE 4: Payroll Batches & Statutory Payslips
* **Status**: ✅ **COMPLETED**
* **Delivered Artifacts**:
  - `GET /api/payroll/runs`: Plant wage batches & employee payslip generator.
  - `src/app/(dashboard)/payroll/page.tsx`: Gross-to-Net breakdown, EPF/ESI statutory calculations, and printable payslip modal.

---

### 🚀 PHASE 5: ATS Pipeline, Appraisals & Grievances
* **Status**: ✅ **COMPLETED**
* **Delivered Artifacts**:
  - `GET & POST /api/recruitment`: Manpower requisitions & Kanban candidate pipeline stage tracker.
  - `GET /api/performance`: Annual KRA scoring, 9-box grid talent review, and calibration.
  - `GET & POST /api/grievances`: Confidential grievance submission with 7-day SLA tracking.
* **Testing Checklist**:
  - [x] Candidate pipeline updates stage dynamically via `/api/recruitment` &rarr; Verified.
  - [x] Submit KRA appraisal score &rarr; Calculates overall rating & 9-box grid &rarr; Verified.
  - [x] Submit confidential grievance ticket &rarr; Assigns SLA resolution countdown &rarr; Verified.

---

### 🚀 PHASE 6: End-to-End Live Persona Demo Rehearsal
* **Status**: ✅ **COMPLETED**
* **Delivered Rehearsal Flow**:
  1. 👤 **Employee** (Ananya Deshmukh):
     - Opens Dashboard &rarr; Clicks "Web Check-In" &rarr; Submits 2-Day Casual Leave &rarr; Views Payslip &rarr; Submits KRA Self-Appraisal.
  2. 👔 **Managing Director** (Dr. Vikramaditya Rathore):
     - Switches role &rarr; Reviews plant attendance &rarr; Approves pending leave applications &rarr; Authorizes payroll run.
  3. 🛡️ **HR Head** (Eleanor Vance):
     - Switches role &rarr; Manages 17-stage employee lifecycle &rarr; Advances ATS candidate &rarr; Reviews grievance tickets.
  4. 🔍 **Internal Audit Head** (Marcus Chen):
     - Switches role &rarr; Inspects immutable SHA-256 audit stream &rarr; Validates zero payroll variances.
  5. ⚖️ **Compliance & Statutory** (Rajeshwari Nair):
     - Switches role &rarr; Verifies Factory Act registers (Form 25/12) & PF/ESI/TDS remittance filings.
  6. 👑 **Chairman** (Alexander Sterling):
     - Switches role &rarr; Inspects high-level board analytics & macro workforce growth metrics.

---

## 5. Verification Commands

```bash
# 1. Type Safety Check (0 Errors Required)
npx tsc --noEmit

# 2. Database Sync
npm run db:push

# 3. Database Seed
npm run db:seed
```
