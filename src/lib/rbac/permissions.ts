import { UserRole, ModuleKey, PermissionLevel } from '@/types';

/**
 * Role x Module Permission Matrix from Section 4 of the HRM Specification
 * F = Full Access (Create/Read/Update/Delete/Approve)
 * E = Edit/Process own work area
 * A = Approve only (for their own team)
 * V = View only
 * S = Self-service only (own record)
 * NONE = No access (—)
 */
export const ROLE_PERMISSIONS: Record<ModuleKey, Record<UserRole, PermissionLevel>> = {
  recruitment: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'F',
    payroll_officer: 'NONE',
    reporting_manager: 'A',
    employee: 'NONE',
  },
  onboarding: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'F',
    payroll_officer: 'V',
    reporting_manager: 'V',
    employee: 'S',
  },
  attendance_leave: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'V',
    reporting_manager: 'A',
    employee: 'S',
  },
  payroll_benefits: {
    super_admin: 'V',
    hr_admin: 'V',
    hr_executive: 'NONE',
    payroll_officer: 'F',
    reporting_manager: 'NONE',
    employee: 'S',
  },
  employee_records: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'V',
    reporting_manager: 'V', // for their team
    employee: 'S',
  },
  performance_mgmt: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'NONE',
    reporting_manager: 'A', // for their team
    employee: 'S',
  },
  training_dev: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'NONE',
    reporting_manager: 'V',
    employee: 'S',
  },
  engagement_welfare: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'NONE',
    reporting_manager: 'V',
    employee: 'S',
  },
  policy_compliance: {
    super_admin: 'F',
    hr_admin: 'F',
    hr_executive: 'V',
    payroll_officer: 'V',
    reporting_manager: 'V',
    employee: 'V',
  },
  transfer_promotion: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'NONE',
    reporting_manager: 'A',
    employee: 'S',
  },
  disciplinary_actions: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'NONE',
    reporting_manager: 'A',
    employee: 'S',
  },
  resignation_exit: {
    super_admin: 'V',
    hr_admin: 'F',
    hr_executive: 'E',
    payroll_officer: 'E', // F&F
    reporting_manager: 'A',
    employee: 'S',
  },
  system_settings: {
    super_admin: 'F',
    hr_admin: 'V',
    hr_executive: 'NONE',
    payroll_officer: 'NONE',
    reporting_manager: 'NONE',
    employee: 'NONE',
  },
  reports_dashboard: {
    super_admin: 'F',
    hr_admin: 'F',
    hr_executive: 'V',
    payroll_officer: 'F', // payroll reports
    reporting_manager: 'V',
    employee: 'S',
  },
};

export const ROLE_LABELS: Record<UserRole, { title: string; description: string; badgeColor: string }> = {
  super_admin: {
    title: 'Super Admin',
    description: 'System owner & IT administration',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  hr_admin: {
    title: 'HR Admin / Manager',
    description: 'Full operational access across 14 HR modules',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  },
  hr_executive: {
    title: 'HR Executive / Recruiter',
    description: 'Day-to-day hiring, onboarding & operations',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  payroll_officer: {
    title: 'Payroll / Finance Officer',
    description: 'Salary structures, payroll runs & F&F settlements',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  reporting_manager: {
    title: 'Reporting Manager',
    description: 'Team leave, attendance & performance approvals',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  employee: {
    title: 'Employee (Self-Service)',
    description: 'Personal profile, payslips, leaves & requests',
    badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  },
};

export function hasModuleAccess(role: UserRole, module: ModuleKey): boolean {
  const perm = ROLE_PERMISSIONS[module]?.[role];
  return perm !== undefined && perm !== 'NONE';
}

export function getModulePermission(role: UserRole, module: ModuleKey): PermissionLevel {
  return ROLE_PERMISSIONS[module]?.[role] || 'NONE';
}

export function canPerformAction(
  role: UserRole,
  module: ModuleKey,
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self'
): boolean {
  const perm = getModulePermission(role, module);
  if (perm === 'F') return true;
  if (perm === 'E' && ['create', 'read', 'update', 'self'].includes(action)) return true;
  if (perm === 'A' && ['read', 'approve'].includes(action)) return true;
  if (perm === 'V' && action === 'read') return true;
  if (perm === 'S' && action === 'self') return true;
  return false;
}

/**
 * Field-level confidentiality checks:
 * - Salary details: only HR Admin, Payroll Officer, Super Admin, and the employee themselves
 * - Grievance notes & disciplinary proceedings: confidential to HR Admin & Super Admin
 */
export function canViewSensitiveSalary(role: UserRole, isOwnProfile = false): boolean {
  if (isOwnProfile) return true;
  return ['super_admin', 'hr_admin', 'payroll_officer'].includes(role);
}

export function canViewDisciplinaryCases(role: UserRole): boolean {
  return ['super_admin', 'hr_admin'].includes(role);
}
