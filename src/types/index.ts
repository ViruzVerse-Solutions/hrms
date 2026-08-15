export type UserRole =
  | 'chairman'
  | 'managing_director'
  | 'hr_head'
  | 'internal_audit_head'
  | 'compliance_statutory'
  | 'employee';

export type PermissionLevel = 'F' | 'E' | 'A' | 'V' | 'S' | 'NONE';

export type ModuleKey =
  | 'recruitment'
  | 'onboarding'
  | 'attendance_leave'
  | 'payroll_benefits'
  | 'employee_records'
  | 'performance_mgmt'
  | 'training_dev'
  | 'engagement_welfare'
  | 'policy_compliance'
  | 'transfer_promotion'
  | 'disciplinary_actions'
  | 'resignation_exit'
  | 'system_settings'
  | 'reports_dashboard';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: UserRole[];
  activeRole: UserRole;
  employeeId?: string;
  departmentId?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headId?: string;
  headName?: string;
  employeeCount: number;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
  grade: string;
  level: number;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  country: string;
  isHeadquarters: boolean;
}

export type EmploymentStatus = 'probation' | 'active' | 'notice_period' | 'resigned' | 'terminated' | 'retired';

export interface Employee {
  id: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  gender?: 'male' | 'female' | 'other' | string;
  dob?: string;
  dateOfJoining?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationTitle?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  branchId?: string;
  branchName?: string;
  employmentStatus: EmploymentStatus;
  currentLifecycleStage?: LifecycleStageKey;
  ctc?: number; // Confidential
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    pan?: string;
  };
  statutory?: {
    pfNumber?: string;
    esiNumber?: string;
    uan?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
}

export type LifecycleStageKey =
  | 'manpower_planning'
  | 'recruitment'
  | 'selection'
  | 'offer'
  | 'joining'
  | 'onboarding'
  | 'attendance_leave'
  | 'payroll'
  | 'performance'
  | 'training'
  | 'engagement'
  | 'transfer_promotion'
  | 'compliance'
  | 'resignation'
  | 'clearance'
  | 'ff_settlement'
  | 'exit_documentation';

export interface LifecycleStage {
  key: LifecycleStageKey;
  label: string;
  order: number;
  description: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  inTime?: string;
  outTime?: string;
  totalHours: number;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'weekend';
  source: 'biometric' | 'manual' | 'web_checkin';
  regularizationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  regularizationReason?: string;
}

export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approverId: string;
  approverName: string;
  appliedAt: string;
  approverComment?: string;
}

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  totalAllocated: number;
  used: number;
  pending: number;
  balance: number;
}

export interface SalaryBreakup {
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  grossEarnings: number;
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;
  netPay: number;
  pfEmployer: number;
  esiEmployer: number;
  ctcMonthly: number;
  ctcAnnual: number;
}

export interface PayrollRun {
  id: string;
  period: string; // e.g. "2026-07"
  monthName: string;
  year: number;
  status: 'draft' | 'under_review' | 'approved' | 'processed' | 'disbursed';
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  varianceCount: number;
  runDate: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  period: string;
  paidDays: number;
  lopDays: number;
  breakup: SalaryBreakup;
  paymentMode: 'bank_transfer' | 'cheque' | 'cash';
  status: 'published' | 'draft';
}

export interface Candidate {
  id: string;
  requisitionId: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  experienceYears: number;
  currentStage: 'applied' | 'screened' | 'interview' | 'offered' | 'selected' | 'rejected';
  score?: number;
  resumeUrl?: string;
  interviewDate?: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerScorecard?: {
    technicalRating: number;
    cultureRating: number;
    communicationRating: number;
    comments: string;
    recommendation: 'hire' | 'reject' | 'hold';
  };
  offerDetails?: {
    offeredCtc: number;
    joiningDate: string;
    status: 'draft' | 'sent' | 'accepted' | 'declined';
  };
}

export interface ManpowerRequisition {
  id: string;
  departmentId: string;
  departmentName: string;
  positionTitle: string;
  openingsCount: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedById: string;
  requestedByName: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'closed';
  targetDate: string;
  minExperience: string;
  justification: string;
  createdAt: string;
}

export interface PerformanceCycle {
  id: string;
  title: string; // e.g. "Annual Appraisal 2025-2026"
  period: string;
  status: 'active' | 'in_review' | 'calibration' | 'completed';
  deadline: string;
  totalEligible: number;
  submittedCount: number;
  reviewedCount: number;
}

export interface PerformanceReview {
  id: string;
  cycleId?: string;
  cycleName?: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  kras?: Array<{
    title: string;
    weightage: number;
    target: string;
    selfScore: number;
    managerScore: number;
  }>;
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  kraScore?: number;
  nineBoxGrid?: string;
  managerComments?: string;
  hrCalibrationNotes?: string;
  recommendation?: 'promotion' | 'increment' | 'pip' | 'retain';
  status: 'pending_self' | 'pending_manager' | 'in_calibration' | 'finalized' | 'completed' | string;
  completedAt?: string | null;
}

export interface GrievanceTicket {
  id: string;
  ticketNumber: string;
  employeeId?: string;
  employeeName?: string;
  isAnonymous: boolean;
  category: 'harassment' | 'payroll_dispute' | 'work_environment' | 'policy_violation' | 'other';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'under_investigation' | 'action_pending' | 'resolved' | 'closed';
  slaDeadline: string;
  assignedToName?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  trainer: string;
  category: 'technical' | 'soft_skills' | 'compliance' | 'leadership';
  startDate: string;
  endDate: string;
  mode: 'internal' | 'external_vendor';
  vendorName?: string;
  capacity: number;
  enrolledCount: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  feedbackAvgScore?: number;
}

export interface PolicyDocument {
  id: string;
  title: string;
  category: 'code_of_conduct' | 'leave_attendance' | 'posh' | 'it_security' | 'compensation' | 'safety_ehs' | string;
  version: string;
  effectiveDate: string;
  acknowledgedCount: number;
  totalEmployees: number;
  fileUrl: string;
  createdByName?: string;
  createdByRole?: UserRole;
  status?: string;
}

export interface ResignationCase {
  id: string;
  employeeId: string;
  employeeName: string;
  resignationDate: string;
  requestedLwd: string;
  approvedLwd: string;
  noticePeriodDays: number;
  reason: string;
  status: 'submitted' | 'manager_approved' | 'clearance_in_progress' | 'settled' | 'exited';
  clearances: {
    it: { status: 'pending' | 'cleared'; clearedBy?: string; notes?: string };
    admin: { status: 'pending' | 'cleared'; clearedBy?: string; notes?: string };
    finance: { status: 'pending' | 'cleared'; clearedBy?: string; notes?: string };
    hr: { status: 'pending' | 'cleared'; clearedBy?: string; notes?: string };
  };
  fnfDetails?: {
    grossAmount: number;
    deductions: number;
    netAmount: number;
    status: 'pending' | 'processed' | 'disbursed';
  };
  ffSettlement?: {
    pendingSalary: number;
    leaveEncashment: number;
    bonusGratuity: number;
    noticeShortfallDeduction: number;
    assetDeduction: number;
    totalNetSettlement: number;
    status: 'draft' | 'approved' | 'paid';
  };
}

export interface DisciplinaryCase {
  id: string;
  caseNumber?: string;
  employeeId: string;
  employeeName: string;
  violationType: 'absenteeism' | 'insubordination' | 'misconduct' | 'breach_of_policy' | 'posh_violation' | string;
  incidentDate: string;
  reportedBy: string;
  severity: 'minor' | 'major' | 'critical' | 'severe' | string;
  currentStage: 'show_cause_notice' | 'show_cause_issued' | 'explanation_received' | 'inquiry_panel' | 'action_taken' | 'capa_active' | 'closed' | string;
  actionTaken?: string;
  description?: string;
  createdAt: string;
}

export interface TransferPromotionCase {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'transfer' | 'promotion' | 'relocation' | 'role_change' | string;
  currentDepartment: string;
  newDepartment: string;
  currentDesignation: string;
  newDesignation: string;
  currentBranch: string;
  newBranch: string;
  effectiveDate: string;
  initiatedBy: string;
  status: 'draft' | 'pending' | 'pending_approval' | 'approved' | 'completed' | string;
  approvalChain: string[];
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  module: ModuleKey;
  entityId: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  integrityHash?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  module: ModuleKey;
  createdAt: string;
  read: boolean;
  link?: string;
}
