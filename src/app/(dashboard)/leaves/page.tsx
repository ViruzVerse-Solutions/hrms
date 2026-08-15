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
    addLeaveRequest,
    updateLeaveStatus,
    currentUser,
    currentEmployee,
    currentRole,
    can,
  } = useAuth();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'casual' as LeaveType,
    fromDate: '2026-08-20',
    toDate: '2026-08-21',
    reason: '',
  });

  const empId = currentEmployee?.id || currentUser?.employeeId || 'emp_005';
  const empName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : currentUser.name;

  const visibleLeaves = currentRole === 'employee'
    ? leaveRequests.filter((l) => l.employeeId === empId || l.employeeId === 'emp_005' || l.employeeName === empName || l.employeeName?.includes('Vishwadharan'))
    : leaveRequests;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
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
      approverId: currentEmployee?.reportingManagerId || 'emp_004',
      approverName: currentEmployee?.reportingManagerName || 'Dr. Vikramaditya Rathore',
    });
    setApplyModalOpen(false);
    setForm({ leaveType: 'casual', fromDate: '2026-08-20', toDate: '2026-08-21', reason: '' });
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

        {/* Apply Leave Modal */}
        <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
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
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="casual">Casual Leave (CL) - Balance: 7 Days</option>
                  <option value="sick">Sick Leave (SL) - Balance: 8 Days</option>
                  <option value="earned">Earned / Privilege Leave (EL) - Balance: 11 Days</option>
                  <option value="maternity">Maternity Leave - Balance: 180 Days</option>
                  <option value="unpaid">Loss of Pay (LOP / Unpaid)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">From Date</label>
                  <Input
                    type="date"
                    required
                    value={form.fromDate}
                    onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">To Date</label>
                  <Input
                    type="date"
                    required
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
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

      {/* Leave Balances Grid */}
      {(() => {
        const getAlloc = (type: string) => leaveAllocations.find((a) => a.leaveType === type);
        const cl = getAlloc('casual');
        const sl = getAlloc('sick');
        const el = getAlloc('earned');

        const clBal = cl ? cl.balance : 7;
        const clAlloc = cl ? cl.totalAllocated : 12;
        const clUsed = cl ? cl.used : 3;
        const clPend = cl ? cl.pending : 2;

        const slBal = sl ? sl.balance : 8;
        const slAlloc = sl ? sl.totalAllocated : 10;
        const slUsed = sl ? sl.used : 2;

        const elBal = el ? el.balance : 11;
        const elAlloc = el ? el.totalAllocated : 15;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Casual Leave (CL)</span>
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{clBal} / {clAlloc}</div>
                <div className="text-xs text-slate-500 mt-1">{clUsed} used • {clPend} pending approval</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Sick Leave (SL)</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{slBal} / {slAlloc}</div>
                <div className="text-xs text-slate-500 mt-1">{slUsed} used this calendar year</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Earned Leave (EL)</span>
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold text-purple-600 mt-2 font-mono">{elBal} / {elAlloc}</div>
                <div className="text-xs text-slate-500 mt-1">Encashable balance on exit</div>
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
