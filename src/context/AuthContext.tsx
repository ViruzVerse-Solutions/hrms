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
import { CORE_PERSONAS } from '@/lib/constants';
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
  const [currentUser, setCurrentUser] = useState<User>(CORE_PERSONAS[1]); // Default Eleanor Vance (HR Admin)
  
  // Data stores
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requisitions, setRequisitions] = useState<ManpowerRequisition[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    { id: 'notif_1', title: 'System Ready', message: 'Viruzverse Solutions HRM platform connected to PostgreSQL database', type: 'success', module: 'reports_dashboard', createdAt: new Date().toISOString(), read: false, link: '/dashboard' },
  ]);

  // Initial database sync on mount & role switch
  useEffect(() => {
    // 1. Fetch Employees
    fetch('/api/employees', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.employees) {
          setEmployees(data.data.employees);
        }
      })
      .catch(() => {});

    // 2. Fetch Leaves
    fetch('/api/leaves', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.leaves) {
          setLeaveRequests(data.data.leaves);
        }
      })
      .catch(() => {});

    // 3. Fetch Payroll Runs
    fetch('/api/payroll/runs', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.payrollRuns) {
          setPayrollRuns(data.data.payrollRuns);
        }
        if (data?.data?.payslips) {
          setPayslips(data.data.payslips);
        }
      })
      .catch(() => {});

    // 4. Fetch Attendance Records
    fetch('/api/attendance', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.attendanceRecords) {
          setAttendanceRecords(data.data.attendanceRecords);
        }
      })
      .catch(() => {});

    // 5. Fetch Recruitment (Requisitions & Candidates)
    fetch('/api/recruitment', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.requisitions) {
          setRequisitions(data.data.requisitions);
        }
        if (data?.data?.candidates) {
          setCandidates(data.data.candidates);
        }
      })
      .catch(() => {});

    // 6. Fetch Performance Reviews
    fetch('/api/performance', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.performanceReviews) {
          setPerformanceReviews(data.data.performanceReviews);
        }
      })
      .catch(() => {});

    // 7. Fetch Grievances
    fetch('/api/grievances', {
      headers: { 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.grievances) {
          setGrievances(data.data.grievances);
        }
      })
      .catch(() => {});

    // 8. Fetch Audit Logs (Admin only)
    if (currentRole === 'hr_admin' || currentRole === 'super_admin') {
      fetch('/api/audit-logs', {
        headers: { 'x-user-role': currentRole },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.data?.auditLogs) {
            setAuditLogs(data.data.auditLogs);
          }
        })
        .catch(() => {});
    }
  }, [currentRole, currentUser.employeeId]);

  // Sync user profile synchronously when role is changed
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
  };

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
    
    // Backend persistence
    fetch('/api/leaves/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
      body: JSON.stringify(req),
    }).catch(() => {});

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

  const updateLeaveStatus = (id: string, status: 'approved' | 'rejected', comment?: string) => {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status, approverComment: comment } : lr))
    );
    logAuditAction(`LEAVE_${status.toUpperCase()}`, 'attendance_leave', id, `Leave marked as ${status}`);

    // Backend persistence
    fetch(`/api/leaves/${id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': currentRole,
      },
      body: JSON.stringify({ status, comment }),
    }).catch(() => {});
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

    // Backend persistence
    fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': currentRole,
        'x-employee-id': currentEmployee.id,
      },
      body: JSON.stringify({ status }),
    }).catch(() => {});
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
    fetch('/api/recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
      body: JSON.stringify({ action: 'update_candidate_stage', candidateId: id, stage }),
    }).catch(() => {});
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
    fetch('/api/recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole },
      body: JSON.stringify(req),
    }).catch(() => {});
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
    fetch('/api/grievances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': currentRole, 'x-employee-id': currentUser.employeeId || 'emp_001' },
      body: JSON.stringify(grv),
    }).catch(() => {});
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
