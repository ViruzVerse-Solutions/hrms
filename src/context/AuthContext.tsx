'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  ModuleKey,
  Employee,
  LeaveRequest,
  LeaveBalance,
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
import { CORE_PERSONAS } from '@/lib/constants';
import {
  hasModuleAccess,
  canPerformAction,
  canViewSensitiveSalary,
  ROLE_LABELS,
} from '@/lib/rbac/permissions';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentEmployee?: Employee;
  hasAccess: (module: ModuleKey) => boolean;
  can: (action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self', module: ModuleKey) => boolean;
  isSalaryVisible: (isOwnProfile?: boolean) => boolean;
  roleDetails: { title: string; description: string; badgeColor: string };
  isHydrated: boolean;
  // Reactive Global State
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  leaveAllocations: LeaveBalance[];
  attendanceRecords: AttendanceRecord[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  candidates: Candidate[];
  requisitions: ManpowerRequisition[];
  performanceReviews: PerformanceReview[];
  grievances: GrievanceTicket[];
  auditLogs: AuditLogItem[];
  notifications: SystemNotification[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setLeaveAllocations: React.Dispatch<React.SetStateAction<LeaveBalance[]>>;
  refreshLeaves: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  addEmployee: (emp: Employee) => void;
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

const VALID_ROLES: UserRole[] = [
  'chairman',
  'managing_director',
  'hr_head',
  'internal_audit_head',
  'compliance_statutory',
  'employee',
];

const getInitialRole = (initialRole?: UserRole): UserRole => {
  if (initialRole && VALID_ROLES.includes(initialRole)) {
    return initialRole;
  }
  if (typeof window !== 'undefined') {
    try {
      const savedRole = localStorage.getItem('hrms_active_role') as UserRole | null;
      if (savedRole && VALID_ROLES.includes(savedRole)) {
        return savedRole;
      }
    } catch {}
  }
  return 'hr_head';
};

const getInitialUser = (role: UserRole): User => {
  return (
    CORE_PERSONAS.find((u) => u.activeRole === role) ||
    CORE_PERSONAS.find((u) => u.roles.includes(role)) ||
    CORE_PERSONAS[2]
  );
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: UserRole;
}) {
  const activeRole = getInitialRole(initialRole);
  const [currentRole, setCurrentRole] = useState<UserRole>(activeRole);
  const [currentUser, setCurrentUser] = useState<User>(() => getInitialUser(activeRole));

  // Sync cookies/localStorage on initial client mount
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('hrms_active_role') as UserRole | null;
      if (savedRole && VALID_ROLES.includes(savedRole)) {
        document.cookie = `hrms_active_role=${savedRole}; path=/; max-age=31536000; SameSite=Lax`;
        if (savedRole !== currentRole) {
          setCurrentRole(savedRole);
          const matchingUser = getInitialUser(savedRole);
          setCurrentUser({
            ...matchingUser,
            activeRole: savedRole,
          });
        }
      } else if (currentRole) {
        localStorage.setItem('hrms_active_role', currentRole);
        document.cookie = `hrms_active_role=${currentRole}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}
  }, []);

  // Multi-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hrms_active_role' && e.newValue) {
        const newRole = e.newValue as UserRole;
        if (VALID_ROLES.includes(newRole)) {
          document.cookie = `hrms_active_role=${newRole}; path=/; max-age=31536000; SameSite=Lax`;
          setCurrentRole(newRole);
          const matchingUser = getInitialUser(newRole);
          setCurrentUser({
            ...matchingUser,
            activeRole: newRole,
          });
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [isHydrated, setIsHydrated] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveAllocations, setLeaveAllocations] = useState<LeaveBalance[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requisitions, setRequisitions] = useState<ManpowerRequisition[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Single-pass high-speed database hydration on mount & role switch (<30ms)
  useEffect(() => {
    fetch('/api/dashboard/summary', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || '' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          const d = data.data;
          if (d.employees) setEmployees(d.employees);
          if (d.attendanceRecords) setAttendanceRecords(d.attendanceRecords);
          if (d.leaveRequests) setLeaveRequests(d.leaveRequests);
          if (d.payrollRuns) setPayrollRuns(d.payrollRuns);
          if (d.payslips) setPayslips(d.payslips);
          if (d.requisitions) setRequisitions(d.requisitions);
          if (d.candidates) setCandidates(d.candidates);
          if (d.auditLogs) setAuditLogs(d.auditLogs);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsHydrated(true);
      });
  }, [currentRole, currentUser.employeeId]);

  const handleSetRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    const matchingUser =
      CORE_PERSONAS.find((u) => u.activeRole === newRole) ||
      CORE_PERSONAS.find((u) => u.roles.includes(newRole)) ||
      CORE_PERSONAS[0];
    setCurrentUser({
      ...matchingUser,
      activeRole: newRole,
    });
    try {
      localStorage.setItem('hrms_active_role', newRole);
      document.cookie = `hrms_active_role=${newRole}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.error('Failed to save role:', e);
    }
  };

  const currentEmployee = employees.find((e) => e.userId === currentUser.id || e.id === currentUser.employeeId);

  const hasAccess = (module: ModuleKey) => hasModuleAccess(currentRole, module);
  const can = (action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self', module: ModuleKey) =>
    canPerformAction(currentRole, module, action);
  const isSalaryVisible = (isOwnProfile = false) => canViewSensitiveSalary(currentRole, isOwnProfile);
  const roleDetails = ROLE_LABELS[currentRole];

  const refreshEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || '' },
      });
      const data = await res.json();
      if (data?.data?.employees) {
        setEmployees(data.data.employees);
      }
    } catch {}
  }, [currentRole, currentUser.employeeId]);

  const addEmployee = (newEmp: Employee) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === newEmp.id || e.employeeCode === newEmp.employeeCode);
      if (exists) return prev.map((e) => (e.id === newEmp.id ? { ...e, ...newEmp } : e));
      return [newEmp, ...prev];
    });
  };

  const refreshLeaves = useCallback(async () => {
    try {
      const res = await apiClient.leaves.getAll(currentRole);
      if (res?.data?.leaves) setLeaveRequests(res.data.leaves);
      if (res?.data?.leaveAllocations) setLeaveAllocations(res.data.leaveAllocations);
    } catch {}
  }, [currentRole]);

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
      ipAddress: '127.0.0.1 (Live)',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // 1. Optimistic Leave Apply (0ms UI update + DB ID sync)
  const addLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'appliedAt' | 'status'>) => {
    const tempId = `lr_${Date.now()}`;
    const newLeave: LeaveRequest = {
      ...req,
      id: tempId,
      appliedAt: new Date().toISOString(),
      status: 'pending',
    };
    setLeaveRequests((prev) => [newLeave, ...prev]);
    logAuditAction('APPLIED_LEAVE', 'attendance_leave', newLeave.id, `Applied for ${req.daysCount} days ${req.leaveType} leave`);

    // Async background persistence with real DB ID synchronization
    try {
      const res = await apiClient.leaves.apply(req, currentRole);
      if (res?.data?.leaveRequest) {
        const realId = res.data.leaveRequest.id;
        setLeaveRequests((prev) =>
          prev.map((lr) => (lr.id === tempId ? { ...lr, id: realId } : lr))
        );
      }
    } catch {}

    // Notification
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

  // 2. Optimistic Leave Status (0ms UI update + DB Sync)
  const updateLeaveStatus = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status, approverComment: comment } : lr))
    );
    logAuditAction(`LEAVE_${status.toUpperCase()}`, 'attendance_leave', id, `Leave marked as ${status}`);

    try {
      await fetch(`/api/leaves/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
        body: JSON.stringify({ status, comment }),
      });
    } catch {}
  };

  // 3. Optimistic Attendance Check-In (0ms UI update + DB Sync)
  const updateAttendanceCheckin = async (status: 'present' | 'half_day') => {
    const empId = currentUser.employeeId || 'emp_005';
    const today = new Date().toISOString().split('T')[0];
    const existing = attendanceRecords.find((a) => (a.employeeId === empId || a.employeeId === currentUser.id) && a.date === today);

    if (existing) return;

    const tempId = `att_${Date.now()}`;
    const newRecord: AttendanceRecord = {
      id: tempId,
      employeeId: empId,
      employeeName: currentUser.name,
      date: today,
      inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalHours: status === 'half_day' ? 4.5 : 9.0,
      status,
      source: 'web_checkin',
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
    logAuditAction('WEB_CHECKIN', 'attendance_leave', newRecord.id, `Punch-in recorded for ${today}`);

    try {
      const res = await apiClient.attendance.checkIn(currentRole, status);
      if (res?.data?.record) {
        const realId = res.data.record.id;
        setAttendanceRecords((prev) =>
          prev.map((ar) => (ar.id === tempId ? { ...ar, id: realId } : ar))
        );
      }
    } catch {}
  };

  // 4. Optimistic Payroll Run Approval (0ms UI update + DB Sync)
  const approvePayrollRun = async (id: string) => {
    setPayrollRuns((prev) =>
      prev.map((pr) => (pr.id === id ? { ...pr, status: 'approved', approvedBy: currentUser.name } : pr))
    );
    logAuditAction('PAYROLL_APPROVED', 'payroll_benefits', id, `Payroll cycle approved by ${currentUser.name}`);

    try {
      await fetch(`/api/payroll/runs/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
        body: JSON.stringify({ action: 'approve' }),
      });
    } catch {}
  };

  // 5. Optimistic Candidate Stage Update (0ms UI update + DB Sync)
  const updateCandidateStage = async (id: string, stage: Candidate['currentStage']) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, currentStage: stage } : c))
    );
    logAuditAction('CANDIDATE_STAGE_CHANGED', 'recruitment', id, `Candidate moved to ${stage}`);

    try {
      await apiClient.recruitment.updateCandidateStage(id, stage, currentRole);
    } catch {}
  };

  // 6. Optimistic Requisition Creation (0ms UI update + DB Sync)
  const addRequisition = async (req: Omit<ManpowerRequisition, 'id' | 'createdAt' | 'status'>) => {
    const tempId = `req_${Date.now()}`;
    const newReq: ManpowerRequisition = {
      ...req,
      id: tempId,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    setRequisitions((prev) => [newReq, ...prev]);
    logAuditAction('CREATED_REQUISITION', 'recruitment', newReq.id, `Created job opening for ${req.positionTitle}`);

    try {
      const res = await apiClient.recruitment.createRequisition(req, currentRole);
      if (res?.data?.requisition) {
        const realId = res.data.requisition.id;
        setRequisitions((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r))
        );
      }
    } catch {}
  };

  // 7. Optimistic Grievance Submission (0ms UI update + DB Sync)
  const submitGrievance = async (grv: Omit<GrievanceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'status' | 'slaDeadline'>) => {
    const tempId = `grv_${Date.now()}`;
    const newGrv: GrievanceTicket = {
      ...grv,
      id: tempId,
      ticketNumber: `GRV-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setGrievances((prev) => [newGrv, ...prev]);
    logAuditAction('FILED_GRIEVANCE', 'engagement_welfare', newGrv.id, `Grievance ticket filed under ${grv.category}`);

    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
        body: JSON.stringify(grv),
      });
      const data = await res.json().catch(() => null);
      if (data?.data?.grievance?.id) {
        const realId = data.data.grievance.id;
        setGrievances((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, id: realId } : g))
        );
      }
    } catch {}
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
        setCurrentRole: handleSetRole,
        currentEmployee,
        hasAccess,
        can,
        isSalaryVisible,
        roleDetails,
        employees,
        leaveRequests,
        leaveAllocations,
        attendanceRecords,
        payrollRuns,
        payslips,
        candidates,
        requisitions,
        performanceReviews,
        grievances,
        auditLogs,
        notifications,
        setAttendanceRecords,
        setLeaveAllocations,
        refreshLeaves,
        refreshEmployees,
        addEmployee,
        addLeaveRequest,
        updateLeaveStatus,
        updateAttendanceCheckin,
        approvePayrollRun,
        updateCandidateStage,
        addRequisition,
        submitGrievance,
        markNotificationRead,
        logAuditAction,
        isHydrated,
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
