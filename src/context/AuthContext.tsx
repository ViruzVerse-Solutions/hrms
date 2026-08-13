'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  ModuleKey,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  PayrollRun,
  Payslip,
  Candidate,
  ManpowerRequisition,
  PerformanceReview,
  GrievanceTicket,
  AuditLogItem,
  SystemNotification,
} from '@/types';
import {
  MOCK_USERS,
  MOCK_EMPLOYEES,
  MOCK_LEAVE_REQUESTS,
  MOCK_ATTENDANCE,
  MOCK_PAYROLL_RUNS,
  MOCK_PAYSLIPS,
  MOCK_CANDIDATES,
  MOCK_REQUISITIONS,
  MOCK_PERFORMANCE_REVIEWS,
  MOCK_GRIEVANCES,
  MOCK_AUDIT_LOGS,
  MOCK_NOTIFICATIONS,
} from '@/lib/mock-data';
import {
  hasModuleAccess,
  canPerformAction,
  canViewSensitiveSalary,
  ROLE_LABELS,
} from '@/lib/rbac/permissions';

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentEmployee?: Employee;
  hasAccess: (module: ModuleKey) => boolean;
  can: (action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self', module: ModuleKey) => boolean;
  isSalaryVisible: (isOwnProfile?: boolean) => boolean;
  roleDetails: { title: string; description: string; badgeColor: string };
  // Reactive Global State
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  candidates: Candidate[];
  requisitions: ManpowerRequisition[];
  performanceReviews: PerformanceReview[];
  grievances: GrievanceTicket[];
  auditLogs: AuditLogItem[];
  notifications: SystemNotification[];
  // State Mutators
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'appliedAt' | 'status'>) => void;
  updateLeaveStatus: (id: string, status: 'approved' | 'rejected', comment?: string) => void;
  updateAttendanceCheckin: (status: 'present' | 'half_day') => void;
  approvePayrollRun: (id: string) => void;
  updateCandidateStage: (id: string, stage: Candidate['currentStage']) => void;
  addRequisition: (req: Omit<ManpowerRequisition, 'id' | 'createdAt' | 'status'>) => void;
  submitGrievance: (grv: Omit<GrievanceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'status' | 'slaDeadline'>) => void;
  markNotificationRead: (id: string) => void;
  logAuditAction: (action: string, module: ModuleKey, entityId: string, details: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('hr_admin');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]); // Default Eleanor Vance (HR Admin)
  
  // Data stores
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(MOCK_PAYROLL_RUNS);
  const [payslips, setPayslips] = useState<Payslip[]>(MOCK_PAYSLIPS);
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [requisitions, setRequisitions] = useState<ManpowerRequisition[]>(MOCK_REQUISITIONS);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>(MOCK_PERFORMANCE_REVIEWS);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>(MOCK_GRIEVANCES);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(MOCK_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(MOCK_NOTIFICATIONS);

  // Sync user profile when currentRole changes
  useEffect(() => {
    const matchingUser = MOCK_USERS.find((u) => u.roles.includes(currentRole)) || MOCK_USERS[0];
    setCurrentUser({
      ...matchingUser,
      activeRole: currentRole,
    });
  }, [currentRole]);

  const currentEmployee = employees.find((e) => e.userId === currentUser.id || e.id === currentUser.employeeId);

  const hasAccess = (module: ModuleKey) => hasModuleAccess(currentRole, module);
  const can = (action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self', module: ModuleKey) =>
    canPerformAction(currentRole, module, action);
  const isSalaryVisible = (isOwnProfile = false) => canViewSensitiveSalary(currentRole, isOwnProfile);
  const roleDetails = ROLE_LABELS[currentRole];

  const logAuditAction = (action: string, module: ModuleKey, entityId: string, details: string) => {
    const newLog: AuditLogItem = {
      id: `aud_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentRole,
      action,
      module,
      entityId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Session)',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'appliedAt' | 'status'>) => {
    const newLeave: LeaveRequest = {
      ...req,
      id: `lr_${Date.now()}`,
      appliedAt: new Date().toISOString(),
      status: 'pending',
    };
    setLeaveRequests((prev) => [newLeave, ...prev]);
    logAuditAction('APPLIED_LEAVE', 'attendance_leave', newLeave.id, `Applied for ${req.daysCount} days ${req.leaveType} leave`);
    
    // Add notification
    const newNotif: SystemNotification = {
      id: `notif_${Date.now()}`,
      title: 'New Leave Application',
      message: `${req.employeeName} submitted a ${req.leaveType} leave request for ${req.fromDate}`,
      type: 'info',
      module: 'attendance_leave',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/leaves',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const updateLeaveStatus = (id: string, status: 'approved' | 'rejected', comment?: string) => {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status, approverComment: comment } : lr))
    );
    logAuditAction(`LEAVE_${status.toUpperCase()}`, 'attendance_leave', id, `Leave marked as ${status}`);
  };

  const updateAttendanceCheckin = (status: 'present' | 'half_day') => {
    if (!currentEmployee) return;
    const today = new Date().toISOString().split('T')[0];
    const existing = attendanceRecords.find((a) => a.employeeId === currentEmployee.id && a.date === today);
    
    if (existing) return;

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      employeeId: currentEmployee.id,
      employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
      date: today,
      inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalHours: status === 'half_day' ? 4.5 : 8.5,
      status,
      source: 'web_checkin',
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
    logAuditAction('WEB_CHECKIN', 'attendance_leave', newRecord.id, `Self check-in recorded for ${today}`);
  };

  const approvePayrollRun = (id: string) => {
    setPayrollRuns((prev) =>
      prev.map((pr) =>
        pr.id === id
          ? {
              ...pr,
              status: 'approved',
              approvedBy: currentUser.name,
              approvedAt: new Date().toISOString(),
            }
          : pr
      )
    );
    logAuditAction('APPROVED_PAYROLL', 'payroll_benefits', id, `Payroll cycle ${id} officially approved for disbursement`);
  };

  const updateCandidateStage = (id: string, stage: Candidate['currentStage']) => {
    setCandidates((prev) =>
      prev.map((cand) => (cand.id === id ? { ...cand, currentStage: stage } : cand))
    );
    logAuditAction('MOVED_CANDIDATE_PIPELINE', 'recruitment', id, `Candidate moved to stage ${stage}`);
  };

  const addRequisition = (req: Omit<ManpowerRequisition, 'id' | 'createdAt' | 'status'>) => {
    const newReq: ManpowerRequisition = {
      ...req,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
    };
    setRequisitions((prev) => [newReq, ...prev]);
    logAuditAction('CREATED_REQUISITION', 'recruitment', newReq.id, `Created requisition for ${req.positionTitle}`);
  };

  const submitGrievance = (grv: Omit<GrievanceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'status' | 'slaDeadline'>) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5);

    const newTicket: GrievanceTicket = {
      ...grv,
      id: `grv_${Date.now()}`,
      ticketNumber: `GRV-2026-${randomNum}`,
      createdAt: new Date().toISOString(),
      status: 'submitted',
      slaDeadline: deadline.toISOString(),
    };
    setGrievances((prev) => [newTicket, ...prev]);
    logAuditAction('SUBMITTED_GRIEVANCE', 'engagement_welfare', newTicket.id, `Grievance ticket ${newTicket.ticketNumber} filed`);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        setCurrentRole,
        currentEmployee,
        hasAccess,
        can,
        isSalaryVisible,
        roleDetails,
        employees,
        leaveRequests,
        attendanceRecords,
        payrollRuns,
        payslips,
        candidates,
        requisitions,
        performanceReviews,
        grievances,
        auditLogs,
        notifications,
        addLeaveRequest,
        updateLeaveStatus,
        updateAttendanceCheckin,
        approvePayrollRun,
        updateCandidateStage,
        addRequisition,
        submitGrievance,
        markNotificationRead,
        logAuditAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
