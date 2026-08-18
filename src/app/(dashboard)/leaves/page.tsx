'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileCheck,
  ShieldCheck,
  Building,
  Check,
  Lock,
  X,
  Sliders,
  Clock,
  Users,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { useAuth } from '@/context/AuthContext';
import { LeaveType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/LoadingState';
import { isOdRecord, formatLeaveTypeLabel, compareLeavesChronologically } from '@/lib/leave-utils';

interface CompanyHolidayItem {
  id: string;
  title: string;
  date: string;
  dayOfWeek: string;
  category: string;
  description?: string;
  status: string;
  createdByName?: string;
  createdByRole?: string;
  approvedByName?: string;
  approvedByRole?: string;
  year: number;
}

export default function LeavesPage() {
  return (
    <RBACGuard module="attendance_leave">
      <Suspense fallback={<div className="p-8 max-w-7xl mx-auto"><LoadingState variant="table" rows={6} /></div>}>
        <LeavesContent />
      </Suspense>
    </RBACGuard>
  );
}

function LeavesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam === 'holidays') return 'holidays';
    if (tabParam === 'od_requests' || tabParam === 'od') return 'od_requests';
    return 'applications';
  });

  useEffect(() => {
    if (tabParam === 'holidays') setActiveTab('holidays');
    else if (tabParam === 'od_requests' || tabParam === 'od') setActiveTab('od_requests');
    else if (tabParam === 'applications') setActiveTab('applications');
  }, [tabParam]);
  const {
    leaveRequests,
    leaveAllocations,
    setLeaveAllocations,
    addLeaveRequest,
    updateLeaveStatus,
    refreshLeaves,
    currentUser,
    currentEmployee,
    currentRole,
    employees,
    can,
    isLoadingData,
  } = useAuth();

  useEffect(() => {
    refreshLeaves();

    const handleSync = () => {
      refreshLeaves();
    };

    window.addEventListener('hrms_data_mutation', handleSync);
    window.addEventListener('hrms_cache_invalidated', handleSync);
    return () => {
      window.removeEventListener('hrms_data_mutation', handleSync);
      window.removeEventListener('hrms_cache_invalidated', handleSync);
    };
  }, [currentRole, refreshLeaves]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, { status: 'pending' | 'approved' | 'rejected' | 'cancelled'; comment?: string }>>({});

  const handleProcessLeave = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    setOptimisticStatus((prev) => ({ ...prev, [id]: { status, comment } }));
    await updateLeaveStatus(id, status, comment);
  };

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [odModalOpen, setOdModalOpen] = useState(false);
  const [dateError, setDateError] = useState('');
  const [form, setForm] = useState({
    leaveType: 'casual' as LeaveType,
    fromDate: todayStr,
    toDate: todayStr,
    reason: '',
  });

  const [odForm, setOdForm] = useState({
    fromDate: todayStr,
    toDate: todayStr,
    fromTime: '09:00',
    toTime: '18:00',
    location: '',
    reason: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const empId = currentEmployee?.id || currentUser?.employeeId || '';
  const empCode = currentEmployee?.employeeCode || currentUser?.employeeId || '';
  const empName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : currentUser.name;

  const isHrOrAdmin = currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'chairman' || currentRole === 'compliance_statutory';

  const visibleLeaves = currentRole === 'employee'
    ? leaveRequests.filter((l) => {
        if (!l) return false;
        if (l.id && l.id.startsWith('lr_')) return true;
        if (empId && (l.employeeId === empId || l.employeeId === currentEmployee?.id)) return true;
        if (empCode && (l.employeeCode === empCode || l.employeeId === empCode || l.employeeCode === currentUser?.employeeId)) return true;
        if (empName && l.employeeName && l.employeeName.toLowerCase().trim() === empName.toLowerCase().trim()) return true;
        return !isHrOrAdmin;
      })
    : leaveRequests;

  // Reactively calculate status based on active mutations / approvals
  const effectiveLeaves = visibleLeaves.map((l) => {
    const opt = optimisticStatus[l.id];
    return opt ? { ...l, status: opt.status, approverComment: opt.comment || l.approverComment } : l;
  });

  const effectiveAllLeaves = leaveRequests.map((l) => {
    const opt = optimisticStatus[l.id];
    return opt ? { ...l, status: opt.status, approverComment: opt.comment || l.approverComment } : l;
  });

  const regularLeaves = effectiveLeaves.filter((l) => !isOdRecord(l));

  const filteredLeaves = regularLeaves
    .filter((l) => {
      const matchesSearch = !searchQuery || l.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) || l.reason?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesType = typeFilter === 'all' || l.leaveType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort(compareLeavesChronologically);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate) {
      setDateError('Please select valid From and To dates.');
      return;
    }
    if (form.fromDate < todayStr) {
      setDateError('Leave can only be applied for today or future dates.');
      return;
    }
    if (form.toDate < form.fromDate) {
      setDateError('The "To Date" must be greater than or equal to the "From Date".');
      return;
    }
    setDateError('');

    const d1 = new Date(`${form.fromDate}T00:00:00`);
    const d2 = new Date(`${form.toDate}T00:00:00`);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    addLeaveRequest({
      employeeId: empId,
      employeeName: empName,
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate,
      daysCount: Math.max(1, daysCount),
      reason: form.reason,
      approverId: currentEmployee?.reportingManagerId || '',
      approverName: currentEmployee?.reportingManagerName || 'Reporting Manager',
    });
    setApplyModalOpen(false);
    setActiveTab('applications');
    setForm({ leaveType: 'casual', fromDate: todayStr, toDate: todayStr, reason: '' });
  };

  const handleApplyOD = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odForm.fromDate || !odForm.toDate) {
      setDateError('Please select valid From and To dates for Outdoor Duty.');
      return;
    }
    if (odForm.fromDate < todayStr) {
      setDateError('On Duty start date can only be today or future dates.');
      return;
    }
    if (odForm.toDate < odForm.fromDate) {
      setDateError('The "To Date" must be greater than or equal to the "From Date".');
      return;
    }
    setDateError('');

    const d1 = new Date(`${odForm.fromDate}T00:00:00`);
    const d2 = new Date(`${odForm.toDate}T00:00:00`);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    addLeaveRequest({
      employeeId: empId,
      employeeName: empName,
      leaveType: 'compensatory_off',
      fromDate: odForm.fromDate,
      toDate: odForm.toDate,
      daysCount: Math.max(1, daysCount),
      reason: `[ON DUTY (OD) - ${odForm.location || 'Client Location'} | ${odForm.fromTime} to ${odForm.toTime}] ${odForm.reason}`,
      approverId: currentEmployee?.reportingManagerId || '',
      approverName: currentEmployee?.reportingManagerName || 'Reporting Manager',
    });
    setOdModalOpen(false);
    setActiveTab('od_requests');
    setOdForm({ fromDate: todayStr, toDate: todayStr, fromTime: '09:00', toTime: '18:00', location: '', reason: '' });
  };

  const canConfigurePolicy = currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'chairman';
  const canConfigureHoliday = ['hr_head', 'compliance_statutory', 'managing_director', 'chairman'].includes(currentRole);
  const canApproveHoliday = ['managing_director', 'chairman'].includes(currentRole);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    casual: 12,
    sick: 10,
    earned: 15,
    maternity: 180,
    paternity: 15,
    compensatory_off: 5,
    bereavement: 5,
    marriage: 5,
  });
  const [policySuccessMsg, setPolicySuccessMsg] = useState('');

  const handleUpdatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/leaves/allocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': currentRole,
      },
      body: JSON.stringify({ quotas: policyForm }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setPolicySuccessMsg(data.message || 'All company leave quotas updated successfully');
          fetch('/api/leaves', {
            headers: {
              'x-user-role': currentRole,
              'x-employee-id': currentUser.employeeId || '',
            },
          })
            .then((r) => r.json())
            .then((d) => {
              if (d?.data?.leaveAllocations) setLeaveAllocations(d.data.leaveAllocations);
            });
          setTimeout(() => {
            setPolicyModalOpen(false);
            setPolicySuccessMsg('');
          }, 1200);
        }
      })
      .catch(() => {});
  };

  // Holiday Calendar State
  const [holidays, setHolidays] = useState<CompanyHolidayItem[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    date: todayStr,
    category: 'mandatory',
    description: '',
  });

  const fetchHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await fetch('/api/holidays', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json();
      if (data?.data?.holidays) {
        setHolidays(data.data.holidays);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentRole]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.title || !holidayForm.date) return;

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify(holidayForm),
      });
      const data = await res.json();
      if (data.success) {
        setHolidayModalOpen(false);
        setHolidayForm({ title: '', date: todayStr, category: 'mandatory', description: '' });
        fetchHolidays();
      }
    } catch (err) {
      console.error('Failed to configure holiday:', err);
    }
  };

  const handleApproveHoliday = async (holidayId: string) => {
    try {
      const res = await fetch('/api/holidays', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ holidayId, action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchHolidays();
      }
    } catch (err) {
      console.error('Failed to approve holiday:', err);
    }
  };

  const handleRejectHoliday = async (holidayId: string) => {
    try {
      const res = await fetch('/api/holidays', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ holidayId, action: 'reject' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchHolidays();
      }
    } catch (err) {
      console.error('Failed to reject holiday:', err);
    }
  };

  // Compute summary stats with live reactive state
  const pendingApprovalsCount = effectiveAllLeaves.filter((l) => l.status === 'pending' && !isOdRecord(l)).length;
  const approvedLeavesCount = effectiveAllLeaves.filter((l) => l.status === 'approved' && !isOdRecord(l)).length;
  const odRequestsList = effectiveLeaves
    .filter((l) => isOdRecord(l))
    .sort(compareLeavesChronologically);

  const calcLeaveStats = (type: string) => {
    const alloc = leaveAllocations.find((a) => a.leaveType === type);
    const approvedCount = effectiveLeaves
      .filter((l) => l.leaveType === type && l.status === 'approved' && !isOdRecord(l))
      .reduce((acc, l) => acc + Number(l.daysCount || 0), 0);
    const pendingCount = effectiveLeaves
      .filter((l) => l.leaveType === type && l.status === 'pending' && !isOdRecord(l))
      .reduce((acc, l) => acc + Number(l.daysCount || 0), 0);

    const totalAllocated = alloc?.allocatedDays !== undefined
      ? Number(alloc.allocatedDays)
      : ((alloc as any)?.totalAllocated !== undefined ? Number((alloc as any).totalAllocated) : 0);

    const used = approvedCount;
    const pending = pendingCount;
    const balance = Math.max(0, totalAllocated - used);

    return { totalAllocated, used, pending, balance };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Sleek Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {currentRole === 'employee' ? 'Leave Portal & Official Holidays' : 'Leave Operations & Holiday Governance'}
            </h1>
            <Badge variant="outline" className="text-[11px] font-semibold">
              {currentRole === 'employee' ? 'ESS Portal' : 'Enterprise HR Operations'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {currentRole === 'employee'
              ? 'Check live quota balances, apply for time off, request outdoor duty, and view company holidays.'
              : 'Govern company-wide leave quotas, process pending applications, and manage published annual holidays.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canConfigurePolicy && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPolicyModalOpen(true);
                setPolicySuccessMsg('');
              }}
              className="gap-1.5 text-xs border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              <span>Configure Leave Quotas</span>
            </Button>
          )}

          {currentRole === 'employee' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOdModalOpen(true);
                  setDateError('');
                }}
                className="gap-1.5 text-xs border-slate-200 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Building className="h-3.5 w-3.5 text-slate-500" />
                <span>Request On-Duty</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setApplyModalOpen(true);
                  setDateError('');
                }}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Apply for Leave</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Role-Aware KPI Summary Cards */}
      {isLoadingData && leaveRequests.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isHrOrAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <Card
            onClick={() => setActiveTab('applications')}
            className="cursor-pointer transition-all hover:border-amber-300 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
          >
            <CardContent className="p-5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Pending Approvals</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2 font-mono">{pendingApprovalsCount}</div>
              <div className="text-xs text-slate-500 mt-1">Requires supervisor/HR action</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardContent className="p-5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Approved Leaves</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{approvedLeavesCount}</div>
              <div className="text-xs text-slate-500 mt-1">Active leaves in record</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('od_requests')}
            className="cursor-pointer transition-all hover:border-indigo-300 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
          >
            <CardContent className="p-5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Outdoor Duty (OD)</span>
                <Building className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{odRequestsList.length}</div>
              <div className="text-xs text-slate-500 mt-1">Plant visits & client sites</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('holidays')}
            className="cursor-pointer transition-all hover:border-purple-300 border-purple-200/60 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs"
          >
            <CardContent className="p-5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Company Holidays</span>
                <FileCheck className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">{holidays.length} Days</div>
              <div className="text-xs text-purple-700 dark:text-purple-400 mt-1 font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                <span>Published Calendar 2026</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Regular Employee ESS Balances */
        (() => {
          if (isLoadingData && leaveAllocations.length === 0) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardContent className="p-5 space-y-3">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          }

          const cl = calcLeaveStats('casual');
          const sl = calcLeaveStats('sick');
          const el = calcLeaveStats('earned');

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Casual Leave (CL)</span>
                    <Calendar className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{cl.balance} / {cl.totalAllocated}</div>
                  <div className="text-xs text-slate-500 mt-1">{cl.used} used • {cl.pending} pending</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Sick Leave (SL)</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{sl.balance} / {sl.totalAllocated}</div>
                  <div className="text-xs text-slate-500 mt-1">{sl.used} used • {sl.pending} pending</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Earned Leave (EL)</span>
                    <CalendarDays className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-2 font-mono">{el.balance} / {el.totalAllocated}</div>
                  <div className="text-xs text-slate-500 mt-1">{el.used} used • {el.pending} pending</div>
                </CardContent>
              </Card>

              <Card
                onClick={() => setActiveTab('holidays')}
                className="cursor-pointer transition-all hover:border-amber-300 border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs"
              >
                <CardContent className="p-5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Holiday Calendar</span>
                    <FileCheck className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">{holidays.length} Days</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span>View Calendar 2026</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()
      )}

      {/* 3. Navigation Tabs */}
      <Tabs
        defaultValue="applications"
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', val);
            window.history.replaceState({}, '', url.toString());
          }
        }}
        className="w-full space-y-5"
      >
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs gap-1.5">
          <TabsTrigger value="applications" className="py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs transition-all">
            Leave Applications {pendingApprovalsCount > 0 && isHrOrAdmin && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">{pendingApprovalsCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="od_requests" className="py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs transition-all">
            Outdoor Duty (OD) ({odRequestsList.length})
          </TabsTrigger>
          <TabsTrigger value="holidays" className="py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs transition-all">
            Holiday Calendar ({holidays.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Leave Applications */}
        <TabsContent value="applications">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Leave Requests & Approvals</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Formal leave applications, balance tracking, and manager approvals</p>
              </div>

              {/* Responsive Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search employee / reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border text-xs bg-white dark:bg-slate-900 w-full sm:w-48 outline-none"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none flex-1 sm:flex-initial"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none flex-1 sm:flex-initial"
                >
                  <option value="all">All Types</option>
                  <option value="casual">Casual (CL)</option>
                  <option value="sick">Sick (SL)</option>
                  <option value="earned">Earned (EL)</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="compensatory_off">Comp-off</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingData && leaveRequests.length === 0 ? (
                <div className="py-8">
                  <LoadingState variant="table" rows={4} />
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {visibleLeaves.length === 0 ? 'No leave applications recorded in database.' : 'No leaves match the selected filter criteria.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Leave Type</th>
                        <th className="p-3">From</th>
                        <th className="p-3">To</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLeaves.map((req) => {
                        const canApprove = can('approve', 'attendance_leave') || isHrOrAdmin;
                        const effStatus = optimisticStatus[req.id]?.status || req.status;
                        const effComment = optimisticStatus[req.id]?.comment || req.approverComment;

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {req.employeeName}
                            </td>
                            <td className="p-3 capitalize font-semibold text-indigo-600 dark:text-indigo-400">
                              {req.leaveType?.replace(/_/g, ' ')}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">{formatDate(req.fromDate)}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">{formatDate(req.toDate)}</td>
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-200">{req.daysCount} days</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {req.reason}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={effStatus === 'approved' ? 'success' : effStatus === 'pending' ? 'warning' : 'destructive'}
                                className="text-[10px] capitalize font-bold"
                              >
                                {effStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {effStatus === 'pending' && canApprove ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="h-7 px-2.5 text-[11px]"
                                    onClick={() => handleProcessLeave(req.id, 'approved', 'Approved by Manager')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2.5 text-[11px]"
                                    onClick={() => handleProcessLeave(req.id, 'rejected', 'Staff coverage constraint')}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-medium text-[11px]">
                                  {effComment || (effStatus === 'approved' ? 'Approved' : effStatus === 'rejected' ? 'Rejected' : 'Processed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Outdoor Duty (OD) */}
        <TabsContent value="od_requests">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span>Outdoor Duty (OD) Logs</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Off-site client work, factory site visits, and external audit assignments</p>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingData && leaveRequests.length === 0 ? (
                <div className="py-8">
                  <LoadingState variant="table" rows={3} />
                </div>
              ) : odRequestsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No Outdoor Duty (OD) requests found in database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Location & Purpose</th>
                        <th className="p-3">From Date</th>
                        <th className="p-3">To Date</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {odRequestsList.map((od) => {
                        const canApprove = can('approve', 'attendance_leave') || isHrOrAdmin;
                        const effStatus = optimisticStatus[od.id]?.status || od.status;
                        const effComment = optimisticStatus[od.id]?.comment || od.approverComment;

                        return (
                          <tr key={od.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{od.employeeName}</td>
                            <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs">{od.reason}</td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{formatDate(od.fromDate)}</td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{formatDate(od.toDate)}</td>
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-200">{od.daysCount} Days</td>
                            <td className="p-3">
                              <Badge
                                variant={effStatus === 'approved' ? 'success' : effStatus === 'pending' ? 'warning' : 'destructive'}
                                className="text-[10px] capitalize font-bold"
                              >
                                {effStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {effStatus === 'pending' && canApprove ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="h-7 px-2.5 text-[11px]"
                                    onClick={() => handleProcessLeave(od.id, 'approved', 'Approved OD Duty Assignment')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2.5 text-[11px]"
                                    onClick={() => handleProcessLeave(od.id, 'rejected', 'OD Request Rejected')}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-medium text-[11px]">
                                  {effComment || (effStatus === 'approved' ? 'Approved' : effStatus === 'rejected' ? 'Rejected' : 'Processed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Official Holiday Calendar */}
        <TabsContent value="holidays">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-purple-600" />
                  <span>Official Annual Company Holiday Calendar (2026)</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Approved national, mandatory, and regional public holidays for all plant & office staff</p>
              </div>

              {canConfigureHoliday && (
                <Button
                  onClick={() => setHolidayModalOpen(true)}
                  size="sm"
                  className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Holiday Entry</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingHolidays ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading company holiday calendar...</div>
              ) : holidays.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No official company holidays configured in database.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {holidays.map((h) => {
                    const holidayDate = new Date(h.date);
                    const monthName = isNaN(holidayDate.getTime()) ? '' : holidayDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const dayNum = isNaN(holidayDate.getTime()) ? '' : holidayDate.getDate();

                    return (
                      <div
                        key={h.id}
                        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Date Block */}
                          <div className="shrink-0 w-12 h-14 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col items-center justify-center text-purple-700 dark:text-purple-300">
                            <span className="text-[10px] font-bold tracking-wider">{monthName || 'DATE'}</span>
                            <span className="text-base font-black leading-none">{dayNum || '--'}</span>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={h.title}>{h.title}</h4>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                              <span>{h.dayOfWeek}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">
                                {h.category?.replace(/_/g, ' ') || 'Mandatory'}
                              </Badge>
                            </div>
                            {h.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{h.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Status & Approvals */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <Badge
                            variant={h.status === 'approved' ? 'success' : h.status === 'pending_approval' ? 'warning' : 'destructive'}
                            className="text-[9px] uppercase font-semibold"
                          >
                            {h.status?.replace(/_/g, ' ')}
                          </Badge>

                          {h.status === 'pending_approval' && canApproveHoliday ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5"
                                onClick={() => handleApproveHoliday(h.id)}
                              >
                                <Check className="h-3 w-3" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => handleRejectHoliday(h.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              {h.approvedByName ? `Approved by ${h.approvedByName}` : `Created by ${h.createdByName || h.createdByRole || 'HR'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Configure Quota Policy */}
      {canConfigurePolicy && (
        <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Configure Company Leave Quota Policy</DialogTitle>
              <p className="text-xs text-slate-500">Configure annual statutory quota allocations for all leave categories simultaneously</p>
            </DialogHeader>
            <form onSubmit={handleUpdatePolicy} className="space-y-4 pt-2 text-xs">
              {policySuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{policySuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Casual Leave (CL)</label>
                    <Badge variant="outline" className="text-[10px]">All Staff</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={policyForm.casual}
                    onChange={(e) => setPolicyForm({ ...policyForm, casual: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Sick / Medical Leave (SL)</label>
                    <Badge variant="outline" className="text-[10px]">All Staff</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={policyForm.sick}
                    onChange={(e) => setPolicyForm({ ...policyForm, sick: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Earned / Privilege (EL)</label>
                    <Badge variant="outline" className="text-[10px]">Statutory Annual</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={policyForm.earned}
                    onChange={(e) => setPolicyForm({ ...policyForm, earned: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-pink-50/40 dark:bg-pink-950/20 border-pink-200/60 dark:border-pink-900/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-pink-900 dark:text-pink-200">Maternity Leave (ML)</label>
                    <Badge variant="outline" className="text-[10px] bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 border-pink-300">Female Only</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={policyForm.maternity}
                    onChange={(e) => setPolicyForm({ ...policyForm, maternity: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-blue-900 dark:text-blue-200">Paternity Leave (PL)</label>
                    <Badge variant="outline" className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300">Male Only</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={policyForm.paternity}
                    onChange={(e) => setPolicyForm({ ...policyForm, paternity: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Compensatory Off</label>
                    <Badge variant="outline" className="text-[10px]">Overtime / Shift</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={policyForm.compensatory_off}
                    onChange={(e) => setPolicyForm({ ...policyForm, compensatory_off: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Bereavement Leave</label>
                    <Badge variant="outline" className="text-[10px]">Compassionate</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={policyForm.bereavement}
                    onChange={(e) => setPolicyForm({ ...policyForm, bereavement: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">Marriage Leave</label>
                    <Badge variant="outline" className="text-[10px]">Nuptial</Badge>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={policyForm.marriage}
                    onChange={(e) => setPolicyForm({ ...policyForm, marriage: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setPolicyModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save All Quotas
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: Apply for Leave */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit Leave Application</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4 pt-2 text-xs">
            {dateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{dateError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Leave Type</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              >
                {(() => {
                  const targetEmp = currentEmployee || employees.find((e) =>
                    (currentUser?.employeeId && (e.id === currentUser.employeeId || e.employeeCode === currentUser.employeeId)) ||
                    (currentUser?.email && e.email?.toLowerCase() === currentUser.email.toLowerCase())
                  );
                  const empGender = ((targetEmp as any)?.gender || 'male').toLowerCase();

                  const clStats = calcLeaveStats('casual');
                  const slStats = calcLeaveStats('sick');
                  const elStats = calcLeaveStats('earned');
                  const matStats = calcLeaveStats('maternity');
                  const patStats = calcLeaveStats('paternity');
                  const compStats = calcLeaveStats('compensatory_off');
                  const berStats = calcLeaveStats('bereavement');

                  return (
                    <>
                      <option value="casual">Casual Leave (CL) - Available Balance: {clStats.balance} Days</option>
                      <option value="sick">Sick Leave (SL) - Available Balance: {slStats.balance} Days</option>
                      <option value="earned">Earned / Privilege Leave (EL) - Available Balance: {elStats.balance} Days</option>
                      {empGender === 'female' && (
                        <option value="maternity">Maternity Leave (Female Only) - Available Balance: {matStats.balance} Days</option>
                      )}
                      {empGender === 'male' && (
                        <option value="paternity">Paternity Leave (Male Only) - Available Balance: {patStats.balance} Days</option>
                      )}
                      <option value="compensatory_off">Compensatory Off - Available Balance: {compStats.balance} Days</option>
                      <option value="bereavement">Bereavement Leave - Available Balance: {berStats.balance} Days</option>
                      <option value="unpaid">Loss of Pay (LOP / Unpaid)</option>
                    </>
                  );
                })()}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={form.fromDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      fromDate: val,
                      toDate: prev.toDate < val ? val : prev.toDate,
                    }));
                    setDateError('');
                  }}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                <input
                  type="date"
                  required
                  min={form.fromDate || todayStr}
                  value={form.toDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({ ...prev, toDate: val }));
                    if (val < form.fromDate) {
                      setDateError('The "To Date" must be greater than or equal to the "From Date".');
                    } else {
                      setDateError('');
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {form.fromDate && form.toDate && form.toDate >= form.fromDate && (
              <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Selected: <strong>{formatDate(form.fromDate)}</strong> to <strong>{formatDate(form.toDate)}</strong> ({Math.ceil(Math.abs(new Date(`${form.toDate}T00:00:00`).getTime() - new Date(`${form.fromDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)) + 1} {form.fromDate === form.toDate ? 'Day' : 'Days'})
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Enter reason for leave..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Submit Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Request On Duty (OD) */}
      <Dialog open={odModalOpen} onOpenChange={setOdModalOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit On-Duty (OD) Request</DialogTitle>
            <p className="text-xs text-slate-500">Log external work assignments, factory plant visits, or offsite audits</p>
          </DialogHeader>
          <form onSubmit={handleApplyOD} className="space-y-4 pt-2 text-xs">
            {dateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{dateError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">OD Work Location / Client Site</label>
              <input
                type="text"
                required
                placeholder="e.g. Pune Factory Site / Client HQ / Off-site Audit"
                value={odForm.location}
                onChange={(e) => setOdForm({ ...odForm, location: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={odForm.fromDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOdForm((prev) => ({
                      ...prev,
                      fromDate: val,
                      toDate: prev.toDate < val ? val : prev.toDate,
                    }));
                    setDateError('');
                  }}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                <input
                  type="date"
                  required
                  min={odForm.fromDate || todayStr}
                  value={odForm.toDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOdForm((prev) => ({ ...prev, toDate: val }));
                    if (val < odForm.fromDate) {
                      setDateError('The "To Date" must be greater than or equal to the "From Date".');
                    } else {
                      setDateError('');
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {odForm.fromDate && odForm.toDate && odForm.toDate >= odForm.fromDate && (
              <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Selected: <strong>{formatDate(odForm.fromDate)}</strong> to <strong>{formatDate(odForm.toDate)}</strong> ({Math.ceil(Math.abs(new Date(`${odForm.toDate}T00:00:00`).getTime() - new Date(`${odForm.fromDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)) + 1} {odForm.fromDate === odForm.toDate ? 'Day' : 'Days'})
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">From Time</label>
                <input
                  type="time"
                  required
                  value={odForm.fromTime}
                  onChange={(e) => setOdForm({ ...odForm, fromTime: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">To Time</label>
                <input
                  type="time"
                  required
                  value={odForm.toTime}
                  onChange={(e) => setOdForm({ ...odForm, toTime: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Purpose / Detailed Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Provide details about outdoor duty assignment..."
                value={odForm.reason}
                onChange={(e) => setOdForm({ ...odForm, reason: e.target.value })}
                className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOdModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Submit OD Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Configure Holiday Modal */}
      {holidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-lg w-[95vw] sm:w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Configure Company Holiday</h3>
              <button onClick={() => setHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Holiday Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Founders' Day / Ugadi Festival"
                  className="w-full px-3 py-2 border rounded-xl outline-none bg-white dark:bg-slate-900"
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Holiday Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-xl outline-none bg-white dark:bg-slate-900"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none bg-white dark:bg-slate-900"
                    value={holidayForm.category}
                    onChange={(e) => setHolidayForm({ ...holidayForm, category: e.target.value })}
                  >
                    <option value="mandatory">Mandatory Holiday</option>
                    <option value="national">National Holiday</option>
                    <option value="restricted_optional">Restricted / Optional</option>
                    <option value="regional">Regional Plant Holiday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional directives or plant shift regulations..."
                  className="w-full px-3 py-2 border rounded-xl outline-none bg-white dark:bg-slate-900"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Governance & Approval Matrix</span>
                </div>
                <p>
                  <strong>Configured by:</strong> {currentUser.name} ({currentRole})<br />
                  <strong>Approval Required:</strong> Managing Director / Chairman sign-off is required before publishing company-wide.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setHolidayModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Save & Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
