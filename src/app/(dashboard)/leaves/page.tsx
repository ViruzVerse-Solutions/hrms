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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/LoadingState';

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
  const [activeTab, setActiveTab] = useState(tabParam === 'holidays' ? 'holidays' : 'applications');

  useEffect(() => {
    if (tabParam === 'holidays') setActiveTab('holidays');
    else if (tabParam === 'applications') setActiveTab('applications');
  }, [tabParam]);
  const {
    leaveRequests,
    leaveAllocations,
    setLeaveAllocations,
    addLeaveRequest,
    updateLeaveStatus,
    currentUser,
    currentEmployee,
    currentRole,
    employees,
    can,
    isLoadingData,
  } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

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

  const empId = currentEmployee?.id || currentUser?.employeeId || '';
  const empName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : currentUser.name;

  const visibleLeaves = currentRole === 'employee'
    ? leaveRequests.filter((l) => l.employeeId === empId || l.employeeName === empName)
    : leaveRequests;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.fromDate < todayStr) {
      setDateError('Leave start date cannot be in the past. Please select today or a future date.');
      return;
    }
    if (form.toDate < form.fromDate) {
      setDateError('Leave end date cannot be earlier than start date.');
      return;
    }
    setDateError('');

    const d1 = new Date(form.fromDate);
    const d2 = new Date(form.toDate);
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
    setForm({ leaveType: 'casual', fromDate: todayStr, toDate: todayStr, reason: '' });
  };

  const handleApplyOD = (e: React.FormEvent) => {
    e.preventDefault();
    if (odForm.fromDate < todayStr) {
      setDateError('On Duty start date cannot be in the past.');
      return;
    }
    if (odForm.toDate < odForm.fromDate) {
      setDateError('On Duty end date cannot be earlier than start date.');
      return;
    }
    setDateError('');

    const d1 = new Date(odForm.fromDate);
    const d2 = new Date(odForm.toDate);
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
    setOdForm({ fromDate: todayStr, toDate: todayStr, fromTime: '09:00', toTime: '18:00', location: '', reason: '' });
  };

  const canConfigurePolicy = currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'chairman';
  const canConfigureHoliday = ['hr_head', 'compliance_statutory', 'managing_director', 'chairman'].includes(currentRole);
  const canApproveHoliday = ['managing_director', 'chairman'].includes(currentRole);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    leaveType: 'casual' as LeaveType,
    allocatedDays: 12,
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
      body: JSON.stringify(policyForm),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setPolicySuccessMsg(data.message || 'Leave quota policy updated successfully');
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

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Leave Management & Holiday Calendar</span>
            <Badge variant="outline" className="text-xs font-semibold">
              Enterprise Governance
            </Badge>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Apply for time off, manage leave quota policies, and review/approve official company holidays
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfigureHoliday && (
            <Button
              onClick={() => setHolidayModalOpen(true)}
              variant="outline"
              className="gap-1.5 text-xs border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
            >
              <FileCheck className="h-4 w-4 text-amber-600" />
              <span>Configure Holiday Calendar</span>
            </Button>
          )}

          {canConfigurePolicy && (
            <Dialog open={policyModalOpen} onOpenChange={(open) => {
              setPolicyModalOpen(open);
              if (open) setPolicySuccessMsg('');
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 shadow-sm text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <AlertTriangle className="h-4 w-4 text-indigo-600" />
                  <span>Configure Leave Quotas</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Company Leave Quota Policy</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdatePolicy} className="space-y-4 pt-2 text-xs">
                  {policySuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                      {policySuccessMsg}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Leave Type</label>
                    <select
                      value={policyForm.leaveType}
                      onChange={(e) => setPolicyForm({ ...policyForm, leaveType: e.target.value as LeaveType })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="casual">Casual Leave (CL)</option>
                      <option value="sick">Sick Leave (SL)</option>
                      <option value="earned">Earned / Privilege Leave (EL)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Annual Quota Allocation (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={policyForm.allocatedDays}
                      onChange={(e) => setPolicyForm({ ...policyForm, allocatedDays: Number(e.target.value) })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="outline" onClick={() => setPolicyModalOpen(false)}>
                      Close
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Save Quota Policy
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Apply Leave Modal */}
          <Dialog open={applyModalOpen} onOpenChange={(open) => {
            setApplyModalOpen(open);
            if (open) {
              setForm({ leaveType: 'casual', fromDate: todayStr, toDate: todayStr, reason: '' });
              setDateError('');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4" />
                <span>Apply for Leave</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Leave Application</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleApply} className="space-y-4 pt-2 text-xs">
                {dateError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {dateError}
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
                      const getAvailBal = (t: string, defAlloc: number) => {
                        const alloc = leaveAllocations.find((a) => a.leaveType === t);
                        const usedReq = visibleLeaves.filter((l) => l.leaveType === t && l.status === 'approved').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);
                        const pendReq = visibleLeaves.filter((l) => l.leaveType === t && l.status === 'pending').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);
                        const allocated = alloc ? Number(alloc.totalAllocated || (alloc as any).allocatedDays || defAlloc) : defAlloc;
                        const used = alloc ? Math.max(Number(alloc.used || (alloc as any).usedDays || 0), usedReq) : usedReq;
                        const pending = alloc ? Math.max(Number(alloc.pending || (alloc as any).pendingDays || 0), pendReq) : pendReq;
                        return Math.max(0, allocated - (used + pending));
                      };

                      const empGender = (currentEmployee as any)?.gender || 'female';

                      return (
                        <>
                          <option value="casual">Casual Leave (CL) - Balance: {getAvailBal('casual', 12)} Days</option>
                          <option value="sick">Sick Leave (SL) - Balance: {getAvailBal('sick', 10)} Days</option>
                          <option value="earned">Earned / Privilege Leave (EL) - Balance: {getAvailBal('earned', 15)} Days</option>
                          {empGender === 'female' && (
                            <option value="maternity">Maternity Leave (Female Only) - Balance: 180 Days</option>
                          )}
                          {empGender === 'male' && (
                            <option value="paternity">Paternity Leave (Male Only) - Balance: 15 Days</option>
                          )}
                          <option value="unpaid">Loss of Pay (LOP / Unpaid)</option>
                        </>
                      );
                    })()}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                    <input
                      type="date"
                      required
                      value={form.fromDate}
                      onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                    <input
                      type="date"
                      required
                      value={form.toDate}
                      onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

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

          {/* Apply On Duty (OD) Modal */}
          <Dialog open={odModalOpen} onOpenChange={(open) => {
            setOdModalOpen(open);
            if (open) {
              setOdForm({ fromDate: todayStr, toDate: todayStr, fromTime: '09:00', toTime: '18:00', location: '', reason: '' });
              setDateError('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold">
                <Building className="h-4 w-4 text-indigo-600" />
                <span>Request On Duty (OD)</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit On-Duty (OD) Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleApplyOD} className="space-y-4 pt-2 text-xs">
                {dateError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {dateError}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                    <input
                      type="date"
                      required
                      value={odForm.fromDate}
                      onChange={(e) => setOdForm({ ...odForm, fromDate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                    <input
                      type="date"
                      required
                      value={odForm.toDate}
                      onChange={(e) => setOdForm({ ...odForm, toDate: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
        </div>
      </div>

      {/* Leave Balances & Holiday Summary Grid */}
      {(() => {
        const calcLeaveStats = (type: string, defAlloc: number) => {
          const alloc = leaveAllocations.find((a) => a.leaveType === type);
          const approvedCount = visibleLeaves.filter((l) => l.leaveType === type && l.status === 'approved').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);
          const pendingCount = visibleLeaves.filter((l) => l.leaveType === type && l.status === 'pending').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);

          const totalAllocated = alloc ? Number(alloc.allocatedDays || (alloc as any).totalAllocated || defAlloc) : defAlloc;
          const used = alloc?.usedDays !== undefined ? Number(alloc.usedDays) : approvedCount;
          const pending = alloc?.pendingDays !== undefined ? Number(alloc.pendingDays) : pendingCount;
          const balance = Math.max(0, totalAllocated - used);

          return { totalAllocated, used, pending, balance };
        };

        const cl = calcLeaveStats('casual', 12);
        const sl = calcLeaveStats('sick', 10);
        const el = calcLeaveStats('earned', 15);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Casual Leave (CL)</span>
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{cl.balance} / {cl.totalAllocated}</div>
                <div className="text-xs text-slate-500 mt-1">{cl.used} used • {cl.pending} pending approval</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Sick Leave (SL)</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{sl.balance} / {sl.totalAllocated}</div>
                <div className="text-xs text-slate-500 mt-1">{sl.used} used • {sl.pending} pending approval</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Earned Leave (EL)</span>
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold text-purple-600 mt-2 font-mono">{el.balance} / {el.totalAllocated}</div>
                <div className="text-xs text-slate-500 mt-1">{el.used} used • {el.pending} pending approval</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-amber-50/30">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Holiday Calendar 2026</span>
                  <FileCheck className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{holidays.length} Days</div>
                <div className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Configured & Approved</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Navigation Tabs for Leave Applications, Outdoor Duty & Holiday Calendar */}
      <Tabs defaultValue="applications" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="applications">Leave Applications</TabsTrigger>
          <TabsTrigger value="od_requests">Outdoor Duty (OD)</TabsTrigger>
          <TabsTrigger value="holidays">Holiday Calendar ({holidays.length})</TabsTrigger>
        </TabsList>

        {/* 1. Leave Applications Queue */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Leave Requests & Multi-Tier Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">From</th>
                      <th className="p-3">To</th>
                      <th className="p-3">Days</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLeaves.map((req) => {
                      const canApprove = can('approve', 'attendance_leave');

                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">
                            {req.employeeName}
                          </td>
                          <td className="p-3 capitalize font-semibold text-indigo-600">
                            {req.leaveType}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{formatDate(req.fromDate)}</td>
                          <td className="p-3 text-slate-600 font-medium">{formatDate(req.toDate)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{req.daysCount} days</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">
                            {req.reason}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'destructive'}
                              className="text-[10px] capitalize"
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {req.status === 'pending' && canApprove ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="h-7 px-2.5 text-[11px]"
                                  onClick={() => updateLeaveStatus(req.id, 'approved', 'Approved by Manager')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2.5 text-[11px]"
                                  onClick={() => updateLeaveStatus(req.id, 'rejected', 'Staff coverage constraint')}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                {req.approverComment || 'Processed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Outdoor Duty (OD) Requests Tab */}
        <TabsContent value="od_requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  <span>Outdoor Duty (OD) Requests & Approvals</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Off-site client work, factory site visits, and external audit assignments</p>
              </div>
              <Button
                onClick={() => setOdModalOpen(true)}
                size="sm"
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Apply for OD</span>
              </Button>
            </CardHeader>
            <CardContent>
              {(() => {
                const odRequestsList = visibleLeaves.filter(
                  (l) => l.leaveType === 'compensatory_off' || l.reason.includes('[ON DUTY') || l.reason.includes('[OD]')
                );

                if (odRequestsList.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No Outdoor Duty (OD) requests found in database.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
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
                      <tbody className="divide-y divide-slate-100">
                        {odRequestsList.map((od) => {
                          const canApprove = can('approve', 'attendance_leave');
                          return (
                            <tr key={od.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{od.employeeName}</td>
                              <td className="p-3 text-slate-700 max-w-xs">{od.reason}</td>
                              <td className="p-3 font-medium text-slate-600">{formatDate(od.fromDate)}</td>
                              <td className="p-3 font-medium text-slate-600">{formatDate(od.toDate)}</td>
                              <td className="p-3 font-mono font-bold text-slate-900">{od.daysCount} Days</td>
                              <td className="p-3">
                                <Badge
                                  variant={od.status === 'approved' ? 'success' : od.status === 'pending' ? 'warning' : 'destructive'}
                                  className="text-[10px] capitalize"
                                >
                                  {od.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                {od.status === 'pending' && canApprove ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="h-7 px-2.5 text-[11px]"
                                      onClick={() => updateLeaveStatus(od.id, 'approved', 'Approved OD Duty Assignment')}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 px-2.5 text-[11px]"
                                      onClick={() => updateLeaveStatus(od.id, 'rejected', 'OD Request Rejected')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">
                                    {od.approverComment || 'Processed'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Official Holiday Calendar Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-600" />
                <span>Official Annual Company Holiday Calendar (2026)</span>
              </CardTitle>

              {canConfigureHoliday && (
                <Button
                  onClick={() => setHolidayModalOpen(true)}
                  size="sm"
                  className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Holiday Entry</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingHolidays ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading company holiday calendar...</div>
              ) : holidays.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No official company holidays configured in database.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {holidays.map((h) => (
                    <div key={h.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{h.title}</span>
                          <Badge variant="outline" className="text-[10px] font-mono capitalize">
                            {h.category.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant={h.status === 'approved' ? 'success' : h.status === 'pending_approval' ? 'warning' : 'destructive'} className="text-[10px] uppercase">
                            {h.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-4">
                          <span>Date: <strong className="text-slate-800">{formatDate(h.date)} ({h.dayOfWeek})</strong></span>
                          {h.description && <span>Note: {h.description}</span>}
                        </div>
                      </div>

                      {/* Governance Authority Pill */}
                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px]">
                          <div className="text-slate-600 font-semibold">
                            Configured by: <span className="text-indigo-600">{h.createdByName || h.createdByRole}</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {h.approvedByName ? `Approved by: ${h.approvedByName}` : 'Pending Executive Approval'}
                          </div>
                        </div>

                        {h.status === 'pending_approval' && canApproveHoliday && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => handleApproveHoliday(h.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve & Publish</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleRejectHoliday(h.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure Holiday Modal */}
      {holidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Configure Company Holiday</h3>
              <button onClick={() => setHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Founders' Day / Ugadi Festival"
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Holiday Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg outline-none"
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
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional directives or plant shift regulations..."
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 space-y-1">
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
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
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
