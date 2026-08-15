'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { formatDate, getStatusColorBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LeaveType } from '@/types';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function LeavesPage() {
  return (
    <RBACGuard module="attendance_leave">
      <LeavesContent />
    </RBACGuard>
  );
}

function LeavesContent() {
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
  } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [dateError, setDateError] = useState('');
  const [form, setForm] = useState({
    leaveType: 'casual' as LeaveType,
    fromDate: todayStr,
    toDate: todayStr,
    reason: '',
  });

  const empId = currentEmployee?.id || currentUser?.employeeId || (employees[0]?.id ?? '');
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
      approverName: currentEmployee?.reportingManagerName || 'Dr. Vikramaditya Rathore',
    });
    setApplyModalOpen(false);
    setForm({ leaveType: 'casual', fromDate: todayStr, toDate: todayStr, reason: '' });
  };

  const canConfigurePolicy = currentRole === 'hr_head' || currentRole === 'managing_director';
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

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Leave Management & Approvals</span>
            <Badge variant="outline" className="text-xs font-semibold">
              Automated Balance Deduction
            </Badge>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Apply for time off, review leave balances, and manage multi-tier approval chains
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                      <option value="maternity">Maternity Leave</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Annual Allocated Days Quota</label>
                    <Input
                      type="number"
                      required
                      min={1}
                      max={365}
                      value={policyForm.allocatedDays}
                      onChange={(e) => setPolicyForm({ ...policyForm, allocatedDays: Number(e.target.value) })}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Save Policy Quota & Recalculate DB Balances
                  </Button>
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
            <Button className="gap-2 shadow-md text-xs">
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

                    return (
                      <>
                        <option value="casual">Casual Leave (CL) - Balance: {getAvailBal('casual', 12)} Days</option>
                        <option value="sick">Sick Leave (SL) - Balance: {getAvailBal('sick', 10)} Days</option>
                        <option value="earned">Earned / Privilege Leave (EL) - Balance: {getAvailBal('earned', 15)} Days</option>
                        <option value="maternity">Maternity Leave - Balance: 180 Days</option>
                        <option value="unpaid">Loss of Pay (LOP / Unpaid)</option>
                      </>
                    );
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                  <Input
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
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                  <Input
                    type="date"
                    required
                    min={form.fromDate || todayStr}
                    value={form.toDate}
                    onChange={(e) => {
                      setForm({ ...form, toDate: e.target.value });
                      setDateError('');
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reason / Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide brief context for your reporting manager..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <Button type="submit" className="w-full">
                Submit for Manager Approval
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Leave Balances Grid */}
      {(() => {
        const calcLeaveStats = (type: string, defAlloc: number) => {
          const alloc = leaveAllocations.find((a) => a.leaveType === type);
          const approvedCount = visibleLeaves.filter((l) => l.leaveType === type && l.status === 'approved').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);
          const pendingCount = visibleLeaves.filter((l) => l.leaveType === type && l.status === 'pending').reduce((acc, l) => acc + Number(l.daysCount || 0), 0);

          const totalAllocated = alloc ? Number(alloc.totalAllocated || (alloc as any).allocatedDays || defAlloc) : defAlloc;
          const used = alloc ? Math.max(Number(alloc.used || (alloc as any).usedDays || 0), approvedCount) : approvedCount;
          const pending = alloc ? Math.max(Number(alloc.pending || (alloc as any).pendingDays || 0), pendingCount) : pendingCount;
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

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Holiday Calendar 2026</span>
                  <FileCheck className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">14 Days</div>
                <div className="text-xs text-amber-600 mt-1 font-medium">Next: 15 Aug (Independence Day)</div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Leave Requests & Approvals Queue */}
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
    </div>
  );
}
