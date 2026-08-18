import { UserRole, ModuleKey, PermissionLevel } from '@/types';

/**
 * Role x Module Permission Matrix strictly matching enterprise specifications:
 * F = Full Access (Create/Read/Update/Delete/Approve)
 * E = Edit/Process own work area
 * A = Approve only (for their own team)
 * V = View only
 * S = Self-service only (own record)
 * NONE = No access (Hidden from Sidebar)
 */
export const ROLE_PERMISSIONS: Record<ModuleKey, Record<UserRole, PermissionLevel>> = {
  reports_dashboard: {
    chairman: 'F',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'V',
    employee: 'S',
  },
  employee_records: {
    chairman: 'V',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'V',
    employee: 'S',
  },
  recruitment: {
    chairman: 'NONE',
    managing_director: 'A',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'NONE',
    employee: 'NONE',
  },
  onboarding: {
    chairman: 'NONE',
    managing_director: 'V',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'E',
    employee: 'S',
  },
  attendance_leave: {
    chairman: 'NONE',
    managing_director: 'A',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'V',
    employee: 'S',
  },
  payroll_benefits: {
    chairman: 'NONE',
    managing_director: 'A',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'E',
    employee: 'S',
  },
  performance_mgmt: {
    chairman: 'F',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'NONE',
    employee: 'S',
  },
  training_dev: {
    chairman: 'NONE',
    managing_director: 'V',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'E',
    employee: 'S',
  },
  engagement_welfare: {
    chairman: 'NONE',
    managing_director: 'V',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'E',
    employee: 'S',
  },
  policy_compliance: {
    chairman: 'F',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'F',
    employee: 'NONE',
  },
  transfer_promotion: {
    chairman: 'NONE',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'NONE',
    employee: 'NONE',
  },
  disciplinary_actions: {
    chairman: 'NONE',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'V',
    employee: 'NONE',
  },
  resignation_exit: {
    chairman: 'NONE',
    managing_director: 'A',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'E',
    employee: 'S',
  },
  tasks_work: {
    chairman: 'NONE',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'NONE',
    compliance_statutory: 'NONE',
    employee: 'S',
  },
  system_settings: {
    chairman: 'V',
    managing_director: 'F',
    hr_head: 'F',
    internal_audit_head: 'V',
    compliance_statutory: 'V',
    employee: 'NONE',
  },
};

export const ROLE_LABELS: Record<UserRole, { title: string; description: string; badgeColor: string }> = {
  chairman: {
    title: 'Chairman',
    description: 'Board governance, strategic oversight & executive policies',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  managing_director: {
    title: 'Managing Director (MD)',
    description: 'Executive leadership, strategic approvals & organizational KPIs',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  },
  hr_head: {
    title: 'HR Head / Director',
    description: 'Complete operational authority across all 17 lifecycle stages',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  internal_audit_head: {
    title: 'Internal Audit Head',
    description: 'Company audit, salary check, rule compliance & activity history',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  compliance_statutory: {
    title: 'Compliance & Statutory Officer',
    description: 'Factory Act, labor laws, POSH & EPF/ESI/TDS statutory filings',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  employee: {
    title: 'Employee (Self-Service)',
    description: 'Personal profile, payslips, leaves, attendance & grievances',
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

export function canViewSensitiveSalary(role: UserRole, isOwnProfile = false): boolean {
  if (isOwnProfile) return true;
  return ['chairman', 'managing_director', 'hr_head', 'internal_audit_head', 'compliance_statutory'].includes(role);
}

export function canViewDisciplinaryCases(role: UserRole): boolean {
  return ['chairman', 'managing_director', 'hr_head', 'internal_audit_head', 'compliance_statutory'].includes(role);
}

export type ApprovalCategory =
  | 'leaves'
  | 'outdoor_duty'
  | 'requisitions'
  | 'transfers'
  | 'payroll'
  | 'exits'
  | 'holidays'
  | 'disciplinary';

export interface ApprovalPermissionConfig {
  canView: UserRole[];
  canApprove: UserRole[];
  module: ModuleKey;
  label: string;
}

export const APPROVAL_CATEGORY_PERMISSIONS: Record<ApprovalCategory, ApprovalPermissionConfig> = {
  leaves: {
    canView: ['managing_director', 'hr_head', 'compliance_statutory'],
    canApprove: ['managing_director', 'hr_head'],
    module: 'attendance_leave',
    label: 'Leave Requests',
  },
  outdoor_duty: {
    canView: ['managing_director', 'hr_head', 'compliance_statutory'],
    canApprove: ['managing_director', 'hr_head'],
    module: 'attendance_leave',
    label: 'Outdoor Duty (OD)',
  },
  requisitions: {
    canView: ['chairman', 'managing_director', 'hr_head'],
    canApprove: ['chairman', 'managing_director', 'hr_head'],
    module: 'recruitment',
    label: 'Job Requisitions',
  },
  transfers: {
    canView: ['chairman', 'managing_director', 'hr_head'],
    canApprove: ['chairman', 'managing_director', 'hr_head'],
    module: 'transfer_promotion',
    label: 'Transfers & Promotions',
  },
  payroll: {
    canView: ['chairman', 'managing_director', 'hr_head', 'internal_audit_head', 'compliance_statutory'],
    canApprove: ['managing_director', 'hr_head'],
    module: 'payroll_benefits',
    label: 'Payroll Disbursals',
  },
  exits: {
    canView: ['chairman', 'managing_director', 'hr_head', 'compliance_statutory'],
    canApprove: ['managing_director', 'hr_head'],
    module: 'resignation_exit',
    label: 'Exit Clearances',
  },
  holidays: {
    canView: ['chairman', 'managing_director', 'hr_head', 'compliance_statutory'],
    canApprove: ['chairman', 'managing_director'],
    module: 'attendance_leave',
    label: 'Holiday Calendar',
  },
  disciplinary: {
    canView: ['chairman', 'managing_director', 'hr_head', 'internal_audit_head', 'compliance_statutory'],
    canApprove: ['managing_director', 'hr_head', 'internal_audit_head'],
    module: 'disciplinary_actions',
    label: 'Disciplinary Cases',
  },
};

export function canUserApproveCategory(role: UserRole, category: ApprovalCategory): boolean {
  return APPROVAL_CATEGORY_PERMISSIONS[category]?.canApprove.includes(role) || false;
}

export function canUserViewApprovalCategory(role: UserRole, category: ApprovalCategory): boolean {
  return APPROVAL_CATEGORY_PERMISSIONS[category]?.canView.includes(role) || false;
}
