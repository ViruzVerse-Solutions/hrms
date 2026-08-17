import { LifecycleStage, LifecycleTrack, User } from '@/types';

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  { key: 'manpower_planning', label: 'Manpower Planning', order: 1, description: 'Plant workforce requisition & budget approval', track: 'standard_staff' },
  { key: 'recruitment', label: 'Recruitment', order: 2, description: 'Sourcing, screening & technical interview rounds', track: 'standard_staff' },
  { key: 'selection', label: 'Selection', order: 3, description: 'Technical scorecard & candidate selection', track: 'standard_staff' },
  { key: 'offer', label: 'Offer & Pre-Joining', order: 4, description: 'Offer letter rollout & credential verification', track: 'standard_staff' },
  { key: 'joining', label: 'Joining & Day 1', order: 5, description: 'Plant safety kit, ID issuance & workstation setup', track: 'standard_staff' },
  { key: 'onboarding', label: 'Onboarding & KRAs', order: 6, description: 'EHS signoff, supervisor buddy & operational goals', track: 'standard_staff' },
  { key: 'attendance_leave', label: 'Attendance & Leave', order: 7, description: 'Shift biometric capture & statutory leave records', track: 'standard_staff' },
  { key: 'payroll', label: 'Payroll & Benefits', order: 8, description: 'Monthly wage processing & PF/ESI/PT statutory filing', track: 'standard_staff' },
  { key: 'performance', label: 'Performance Appraisal', order: 9, description: 'Plant KRA review & annual calibration', track: 'standard_staff' },
  { key: 'training', label: 'Training & Skill Dev', order: 10, description: 'Industrial safety, ISO 9001 & technical upskilling', track: 'standard_staff' },
  { key: 'engagement', label: 'Engagement & Welfare', order: 11, description: 'Plant committee, surveys & grievance resolution', track: 'standard_staff' },
  { key: 'transfer_promotion', label: 'Transfer & Promotion', order: 12, description: 'Inter-plant transfers, grade upgrades & promotions', track: 'standard_staff' },
  { key: 'compliance', label: 'Policy & Compliance', order: 13, description: 'Factory Act registers, EHS audits & inspections', track: 'standard_staff' },
  { key: 'resignation', label: 'Resignation Notice', order: 14, description: 'Resignation submission & notice period calculation', track: 'standard_staff' },
  { key: 'clearance', label: 'Department Clearance', order: 15, description: 'Plant tools, IT, Finance, & HR digital sign-offs', track: 'standard_staff' },
  { key: 'ff_settlement', label: 'Full & Final (F&F)', order: 16, description: 'Final dues, leave encashment & gratuity clearance', track: 'standard_staff' },
  { key: 'exit_documentation', label: 'Exit & Archival', order: 17, description: 'Relieving certificate & permanent statutory archival', track: 'standard_staff' },
];

export const EXECUTIVE_LIFECYCLE_STAGES: LifecycleStage[] = [
  { key: 'exec_nomination', label: 'Board Nomination', order: 1, description: 'Executive search & nomination committee clearance', track: 'executive' },
  { key: 'exec_agreement', label: 'Terms & Compensation', order: 2, description: 'Executive remuneration & contract terms agreement', track: 'executive' },
  { key: 'exec_appointment', label: 'Board Resolution', order: 3, description: 'Board of Directors appointment & statutory DIN filing', track: 'executive' },
  { key: 'exec_induction', label: 'Executive Induction', order: 4, description: 'Corporate governance induction & fiduciary charter', track: 'executive' },
  { key: 'exec_compensation', label: 'Executive Payroll', order: 5, description: 'Executive payroll, profit-share & statutory benefits', track: 'executive' },
  { key: 'exec_evaluation', label: 'Strategic OKRs & Review', order: 6, description: 'Annual enterprise KPIs, EBITDA & Board evaluation', track: 'executive' },
  { key: 'exec_succession', label: 'Leadership Succession', order: 7, description: 'Succession planning & executive mandate extension', track: 'executive' },
  { key: 'exec_transition', label: 'Board Exit & Transition', order: 8, description: 'Board resolution, directorship release & archival', track: 'executive' },
];

export function getLifecycleStagesForTrack(track: LifecycleTrack = 'standard_staff'): LifecycleStage[] {
  if (track === 'executive') {
    return EXECUTIVE_LIFECYCLE_STAGES;
  }
  if (track === 'board_governance' || track === 'exempt') {
    return [];
  }
  return LIFECYCLE_STAGES;
}

export const CORE_PERSONAS: User[] = [
  {
    id: 'usr_chairman',
    employeeId: 'VV-001',
    name: 'Devraj Ananth',
    email: 'dev@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Devraj+Ananth&background=4f46e5&color=ffffff',
    roles: ['chairman'],
    activeRole: 'chairman',
    status: 'active',
    lastLogin: '2026-08-14T08:45:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'usr_md',
    employeeId: 'VV-002',
    name: 'Ganesh Ramachandran',
    email: 'ganesh@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Ganesh+Ramachandran&background=4f46e5&color=ffffff',
    roles: ['managing_director'],
    activeRole: 'managing_director',
    status: 'active',
    lastLogin: '2026-08-14T08:00:00Z',
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'usr_hr_head',
    employeeId: 'VV-003',
    name: 'Steffania Rossi',
    email: 'steffania@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Steffania+Rossi&background=4f46e5&color=ffffff',
    roles: ['hr_head'],
    activeRole: 'hr_head',
    status: 'active',
    lastLogin: '2026-08-14T09:12:00Z',
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'usr_internal_audit',
    employeeId: 'VV-004',
    name: 'Rajeshwari Nair',
    email: 'rajeshwari.nair@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Rajeshwari+Nair&background=4f46e5&color=ffffff',
    roles: ['internal_audit_head'],
    activeRole: 'internal_audit_head',
    status: 'active',
    lastLogin: '2026-08-14T06:00:00Z',
    createdAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'usr_compliance',
    employeeId: 'VV-005',
    name: 'Senthil Kumar',
    email: 'senthil@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Senthil+Kumar&background=4f46e5&color=ffffff',
    roles: ['compliance_statutory'],
    activeRole: 'compliance_statutory',
    status: 'active',
    lastLogin: '2026-08-14T07:30:00Z',
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'usr_employee',
    employeeId: 'VV-006',
    name: 'Vishwa Nathan',
    email: 'vishwa@viruzverse.com',
    avatar: 'https://ui-avatars.com/api/?name=Vishwa+Nathan&background=4f46e5&color=ffffff',
    roles: ['employee'],
    activeRole: 'employee',
    status: 'active',
    lastLogin: '2026-08-14T08:30:00Z',
    createdAt: '2025-01-15T00:00:00Z',
  },
];

export function getPersonaAvatar(codeOrEmail?: string, fallbackName?: string): string {
  const name = (fallbackName || codeOrEmail || 'User').trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=ffffff`;
}
