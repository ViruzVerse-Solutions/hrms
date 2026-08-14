import { LifecycleStage, User } from '@/types';

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  { key: 'manpower_planning', label: 'Manpower Planning', order: 1, description: 'Plant workforce requisition & budget approval' },
  { key: 'recruitment', label: 'Recruitment', order: 2, description: 'Sourcing, screening & technical interview rounds' },
  { key: 'selection', label: 'Selection', order: 3, description: 'Technical scorecard & candidate selection' },
  { key: 'offer', label: 'Offer & Pre-Joining', order: 4, description: 'Offer letter rollout & credential verification' },
  { key: 'joining', label: 'Joining & Day 1', order: 5, description: 'Plant safety kit, ID issuance & workstation setup' },
  { key: 'onboarding', label: 'Onboarding & KRAs', order: 6, description: 'EHS signoff, supervisor buddy & operational goals' },
  { key: 'attendance_leave', label: 'Attendance & Leave', order: 7, description: 'Shift biometric capture & statutory leave records' },
  { key: 'payroll', label: 'Payroll & Benefits', order: 8, description: 'Monthly wage processing & PF/ESI/PT statutory filing' },
  { key: 'performance', label: 'Performance Appraisal', order: 9, description: 'Plant KRA review & annual calibration' },
  { key: 'training', label: 'Training & Skill Dev', order: 10, description: 'Industrial safety, ISO 9001 & technical upskilling' },
  { key: 'engagement', label: 'Engagement & Welfare', order: 11, description: 'Plant committee, surveys & grievance resolution' },
  { key: 'transfer_promotion', label: 'Transfer & Promotion', order: 12, description: 'Inter-plant transfers, grade upgrades & promotions' },
  { key: 'compliance', label: 'Policy & Compliance', order: 13, description: 'Factory Act registers, EHS audits & inspections' },
  { key: 'resignation', label: 'Resignation Notice', order: 14, description: 'Resignation submission & notice period calculation' },
  { key: 'clearance', label: 'Department Clearance', order: 15, description: 'Plant tools, IT, Finance, & HR digital sign-offs' },
  { key: 'ff_settlement', label: 'Full & Final (F&F)', order: 16, description: 'Final dues, leave encashment & gratuity clearance' },
  { key: 'exit_documentation', label: 'Exit & Archival', order: 17, description: 'Relieving certificate & permanent statutory archival' },
];

export const CORE_PERSONAS: User[] = [
  {
    id: 'usr_super_admin',
    name: 'Alexander Sterling',
    email: 'alexander.sterling@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    roles: ['super_admin'],
    activeRole: 'super_admin',
    status: 'active',
    lastLogin: '2026-08-14T08:45:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'usr_hr_admin',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    roles: ['hr_admin'],
    activeRole: 'hr_admin',
    employeeId: 'emp_001',
    departmentId: 'dept_hr',
    status: 'active',
    lastLogin: '2026-08-14T09:12:00Z',
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'usr_hr_exec',
    name: 'Priya Sharma',
    email: 'priya.sharma@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    roles: ['hr_executive'],
    activeRole: 'hr_executive',
    employeeId: 'emp_002',
    departmentId: 'dept_hr',
    status: 'active',
    lastLogin: '2026-08-14T07:30:00Z',
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'usr_payroll',
    name: 'Marcus Chen',
    email: 'marcus.chen@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    roles: ['payroll_officer'],
    activeRole: 'payroll_officer',
    employeeId: 'emp_003',
    departmentId: 'dept_fin',
    status: 'active',
    lastLogin: '2026-08-14T06:00:00Z',
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'usr_manager',
    name: 'Dr. Vikramaditya Rathore',
    email: 'vikram.rathore@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    roles: ['reporting_manager'],
    activeRole: 'reporting_manager',
    employeeId: 'emp_004',
    departmentId: 'dept_qc',
    status: 'active',
    lastLogin: '2026-08-14T08:00:00Z',
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'usr_employee',
    name: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@viruzverse.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    roles: ['employee'],
    activeRole: 'employee',
    employeeId: 'emp_005',
    departmentId: 'dept_qc',
    status: 'active',
    lastLogin: '2026-08-14T08:30:00Z',
    createdAt: '2025-01-15T00:00:00Z',
  },
];

export function getPersonaAvatar(codeOrEmail?: string, fallbackName?: string): string {
  const str = ((codeOrEmail || '') + ' ' + (fallbackName || '')).toLowerCase();
  if (str.includes('1001') || str.includes('eleanor') || str.includes('vance')) {
    return 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80';
  }
  if (str.includes('1002') || str.includes('priya') || str.includes('sharma')) {
    return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
  }
  if (str.includes('1003') || str.includes('marcus') || str.includes('chen')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
  }
  if (str.includes('1004') || str.includes('vikram') || str.includes('rathore')) {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
  }
  if (str.includes('1005') || str.includes('ananya') || str.includes('deshmukh')) {
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
  }
  if (str.includes('sterling') || str.includes('alexander') || str.includes('super_admin')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
}
