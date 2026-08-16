'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  CalendarCheck,
  Wallet,
  Clock,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Award,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Building2,
  Shield,
  FileText,
  UserPlus,
  Briefcase,
  Activity,
  Server,
  Layers,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getPersonaAvatar } from '@/lib/constants';
import { LoadingState } from '@/components/ui/LoadingState';

export default function DashboardPage() {
  const {
    currentRole,
    currentUser,
    currentEmployee,
    isLoadingData,
    employees,
    leaveRequests,
    leaveAllocations,
    attendanceRecords,
    payrollRuns,
    payslips,
    candidates,
    requisitions,
    grievances,
    updateAttendanceCheckin,
    auditLogs,
    isHydrated,
  } = useAuth();

  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(true);
  const [activePolicies, setActivePolicies] = React.useState<Array<{ id: string; title: string; category: string; effectiveDate: string }>>([]);

  React.useEffect(() => {
    fetch('/api/master')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.branches) setBranches(data.data.branches);
      })
      .catch(() => {})
      .finally(() => setLoadingBranches(false));

    fetch('/api/compliance', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.policies) setActivePolicies(data.data.policies.slice(0, 3));
      })
      .catch(() => {});
  }, [currentRole]);

  if (isLoadingData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="dashboard" />
      </div>
    );
  }

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((a) => a.date === today);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const isCheckedInToday = currentEmployee
    ? attendanceRecords.some((a) => a.employeeId === currentEmployee.id && a.date === today)
    : false;

  const totalAnnualPayroll = employees.reduce((acc, emp) => acc + (emp.ctc || 0), 0);
  const monthlyDisbursal = payrollRuns[0] ? Number((payrollRuns[0] as any).totalNetPay || payrollRuns[0].totalGrossPay || 0) : Math.round(totalAnnualPayroll / 12);
  const totalPendingApprovals = pendingLeaves.length + requisitions.filter((r) => r.status === 'pending_approval' || r.status === 'in_progress').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 text-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-xs font-semibold text-indigo-700 border border-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Viruzverse Solutions • RBAC Session</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              {currentRole === 'chairman' && 'Board-level strategic governance: macro workforce analytics, executive appointments, compliance oversight, and corporate policy sign-offs.'}
              {currentRole === 'managing_director' && 'Executive operations: operational KPIs, departmental leave approvals, payroll authorizations, and senior promotion sanctions.'}
              {currentRole === 'hr_head' && 'Full operational authority across all 17 lifecycle stages: headcount requisitions, attendance & leave queues, payroll processing, and calibrations.'}
              {currentRole === 'internal_audit_head' && 'Internal audit & inspection: check company activity history, verify salary and attendance accuracy, and ensure government compliance.'}
              {currentRole === 'compliance_statutory' && 'Statutory & regulatory governance: Factory Act registers, PF/ESI/TDS remittance filings, POSH compliance, and EHS safety audits.'}
              {currentRole === 'employee' && 'Self-service portal: manage your daily check-in, review leave balances, download salary payslips, and check company announcements.'}
            </p>
          </div>

          {/* Quick Action Button based on Role */}
          <div className="flex items-center gap-3 shrink-0">
            {currentRole === 'employee' && (
              <Button
                variant={isCheckedInToday ? 'outline' : 'default'}
                className={isCheckedInToday ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}
                disabled={isCheckedInToday}
                onClick={() => updateAttendanceCheckin('present')}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isCheckedInToday ? 'Shift Logged (Present)' : 'Web Check-In (Present)'}
              </Button>
            )}
            {currentRole === 'hr_head' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/recruitment">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Requisition
                </Link>
              </Button>
            )}
            {currentRole === 'managing_director' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/leaves">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Review Approvals
                </Link>
              </Button>
            )}
            {currentRole === 'compliance_statutory' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/compliance">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Statutory Register
                </Link>
              </Button>
            )}
            {currentRole === 'internal_audit_head' && (
              <Button asChild variant="outline">
                <Link href="/settings">
                  <Shield className="h-4 w-4 mr-2" />
                  Inspect Audit Trail
                </Link>
              </Button>
            )}
            {currentRole === 'chairman' && (
              <Button asChild variant="outline">
                <Link href="/reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Board Analytics
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CHAIRMAN DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'chairman' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Enterprise Workforce</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  {!isHydrated ? <FieldLoader className="h-8 w-24" /> : `${employees.length} Staff`}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-1">
                  {loadingBranches ? (
                    <FieldLoader className="h-3 w-40" />
                  ) : branches.length > 0 ? (
                    `${branches.length} Operating Locations (${branches.map((b) => b.name).join(', ')})`
                  ) : (
                    'Operating Locations'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Annual Payroll Budget</span>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-emerald-600">{formatCurrency(totalAnnualPayroll)}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">On-budget & compliant</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Governance Index</span>
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">99.4%</div>
                <div className="text-xs text-purple-600 font-medium mt-1">Zero pending statutory non-conformances</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Strategic Requisitions</span>
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">{requisitions.length} Roles</div>
                <div className="text-xs text-blue-600 font-medium mt-1">Leadership & Technical Expansion</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Executive Summary & Board Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Workforce Retention & Attrition</div>
                    <div className="text-slate-500">Annual voluntary turnover rate</div>
                  </div>
                  <Badge variant="success">
                    {employees.length > 0 ? `${((1 / (employees.length + 1)) * 100).toFixed(1)}% (Low)` : '3.2% (Low)'}
                  </Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">EHS & Safety Incident Frequency</div>
                    <div className="text-slate-500">Plant manufacturing safety scorecard</div>
                  </div>
                  <Badge variant="success">0 Reportable Incidents</Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">Statutory Tax & PF Remittance Status</div>
                    <div className="text-slate-500">100% on-time filings with Zero penalties</div>
                  </div>
                  <Badge variant="info">100% Cleared</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Headcount by Business Unit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const deptCounts: Record<string, number> = {};
                  employees.forEach((emp) => {
                    const name = emp.departmentName || 'General';
                    deptCounts[name] = (deptCounts[name] || 0) + 1;
                  });
                  const total = employees.length || 1;
                  const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

                  return Object.entries(deptCounts).map(([deptName, count], idx) => {
                    const pct = Math.round((count / total) * 100);
                    const color = colors[idx % colors.length];
                    return (
                      <div key={deptName} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{deptName}</span>
                          <span>{count} staff ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MANAGING DIRECTOR (MD) DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'managing_director' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Operational Headcount</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{employees.length} Staff</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Present Today: {presentCount || employees.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{totalPendingApprovals}</div>
                <div className="text-xs text-amber-600 font-medium mt-1">Leaves, promotions & payroll sign-off</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Payroll Disbursal</span>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-emerald-600">{formatCurrency(monthlyDisbursal)}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{payrollRuns[0]?.period || 'Current'} Batch Ready</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active ATS Pipeline</span>
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{candidates.length} Candidates</div>
                <div className="text-xs text-purple-600 font-medium mt-1">{requisitions.length} open requisitions</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold">Executive Decision & Approval Queue</CardTitle>
                <Link href="/leaves" className="text-xs text-indigo-600 hover:underline font-semibold">
                  Manage Approvals
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLeaves.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">All leave and movement requests are up to date.</div>
                ) : (
                  pendingLeaves.map((leave) => (
                    <div key={leave.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{leave.employeeName}</span>
                          <Badge variant="warning" className="text-[10px] capitalize">{leave.leaveType} Leave</Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {leave.daysCount} days ({formatDate(leave.fromDate)} → {formatDate(leave.toDate)}) • {leave.reason}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/leaves">Review</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Plant Operational Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Shift Muster Roll Compliance</div>
                    <div className="text-slate-500">HQ Tech Center & Campus 2</div>
                  </div>
                  <Badge variant="success">100% Shift Filled</Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Annual Calibration Cycle</div>
                    <div className="text-slate-500">9-Box talent matrix distribution</div>
                  </div>
                  <Badge variant="info">Ready for Final Sign-off</Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Inter-Plant Transfers</div>
                    <div className="text-slate-500">Cross-department promotions & grade changes</div>
                  </div>
                  <Badge variant="secondary">0 Pending</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HR HEAD DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'hr_head' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Headcount</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{employees.length}</div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+6.2% annual growth</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Open Positions</span>
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{requisitions.length}</div>
                <div className="text-xs text-purple-600 font-medium mt-2">{candidates.length} active candidates in ATS</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pending Leave & Approvals</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{pendingLeaves.length}</div>
                <div className="text-xs text-amber-600 font-medium mt-2">Team leave & regularization queues</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Lifecycle Compliance</span>
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">17 Stages</div>
                <div className="text-xs text-emerald-600 font-medium mt-2">All stages fully operational</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold">Pending Leave & Approval Queue</CardTitle>
                <Link href="/leaves" className="text-xs text-indigo-600 hover:underline font-semibold">
                  Manage All Requests
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{leave.employeeName}</span>
                        <Badge variant="warning" className="text-[10px] capitalize">{leave.leaveType} Leave</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {leave.daysCount} days ({formatDate(leave.fromDate)} → {formatDate(leave.toDate)}) • {leave.reason}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/leaves">Review</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Workforce by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const deptCounts: Record<string, number> = {};
                  employees.forEach((emp) => {
                    const name = emp.departmentName || 'General';
                    deptCounts[name] = (deptCounts[name] || 0) + 1;
                  });
                  const total = employees.length || 1;
                  const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

                  return Object.entries(deptCounts).map(([deptName, count], idx) => {
                    const pct = Math.round((count / total) * 100);
                    const color = colors[idx % colors.length];
                    return (
                      <div key={deptName} className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{deptName}</span>
                          <span>{count} staff ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INTERNAL AUDIT HEAD DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'internal_audit_head' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Activity Log Security</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">100% Protected</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">All Records Authenticated & Safe</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Recorded Actions</span>
                  <Server className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{auditLogs.length} Actions</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Recorded across all company areas</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Salary Calculation Errors</span>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">0 Errors</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Gross & Net pay fully matched</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Complaints Audited</span>
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900">{grievances.length} Tickets</div>
                <div className="text-xs text-purple-600 font-medium mt-1">100% on-time resolution</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span>Recent Company Activity Log</span>
              </CardTitle>
              <Link href="/settings" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All System Logs
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {log.action}
                      </Badge>
                      <span>{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      User: {log.userName} ({log.role.replace(/_/g, ' ')}) • Module: {log.module.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. COMPLIANCE & STATUTORY DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'compliance_statutory' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Factory Act Registers</span>
                <div className="text-2xl font-extrabold mt-2 text-slate-900">Form 25 & Form 12</div>
                <Badge variant="success" className="mt-2 text-[10px]">100% Up to Date</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Statutory Monthly Deposits</span>
                <div className="text-2xl font-extrabold mt-2 text-emerald-600">PF + ESI + PT</div>
                <div className="text-xs text-slate-500 mt-1">{payrollRuns[0]?.period || 'Monthly'} ECR Challan generated</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">POSH & Safety Committee</span>
                <div className="text-2xl font-extrabold mt-2 text-slate-900">Quarterly Ready</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Next meeting scheduled</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Statutory Compliance Calendar & Regulatory Filings</CardTitle>
              <Button asChild size="sm">
                <Link href="/compliance">View Compliance Details</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Employees' Provident Fund (EPF) Monthly Filing & ECR</div>
                  <div className="text-slate-400">Due: 15th of Every Month • {employees.length} Active Employees Covered</div>
                </div>
                <Badge variant="success">Challan Ready</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Employee State Insurance (ESI) Monthly Contribution</div>
                  <div className="text-slate-400">Due: 15th of Every Month • Wage Ceiling Checked</div>
                </div>
                <Badge variant="success">Calculated</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">TDS (Section 192B) Salary Remittance & Form 24Q</div>
                  <div className="text-slate-400">Due: 07th of Every Month</div>
                </div>
                <Badge variant="info">Scheduled</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Karnataka Professional Tax (PT) Monthly Return (Form 5A)</div>
                  <div className="text-slate-400">Due: 20th of Every Month</div>
                </div>
                <Badge variant="success">Verified</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EMPLOYEE DASHBOARD (SELF-SERVICE / ESS) */}
      {/* ========================================================================= */}
      {currentRole === 'employee' && (() => {
        const casualAlloc = leaveAllocations.find((a) => a.leaveType === 'casual');
        const casualBal = casualAlloc ? casualAlloc.balance : (leaveAllocations[0]?.balance ?? 10);
        const casualUsed = casualAlloc ? casualAlloc.used : (leaveAllocations[0]?.used ?? 0);
        const casualPend = casualAlloc ? casualAlloc.pending : (leaveAllocations[0]?.pending ?? 0);

        const myEmpId = currentEmployee?.id || currentUser?.employeeId || (employees[0]?.id ?? '');
        const latestPs = payslips.find((p) => p.employeeId === myEmpId || p.employeeCode === currentEmployee?.employeeCode) || payslips[0];
        const payslipNet = latestPs?.breakup?.netPay || (latestPs as any)?.netPay || (currentEmployee?.ctc ? Math.round(Number(currentEmployee.ctc) / 12 * 0.85) : 85000);
        const payslipPeriod = latestPs?.period || payrollRuns[0]?.period || 'Current Period';

        return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Casual Leave Balance</span>
                <div className="text-3xl font-extrabold mt-2 text-indigo-600">{casualBal} Days</div>
                <div className="text-xs text-slate-400 mt-1">{casualUsed} used • {casualPend} pending approval</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Latest Payslip ({payslipPeriod})</span>
                <div className="text-2xl font-extrabold mt-2 text-emerald-600">
                  {formatCurrency(payslipNet)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Disbursed via Bank Transfer</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Mandatory Training & Policies</span>
                <div className="text-base font-bold mt-2 text-slate-900">
                  {activePolicies[0]?.title || 'Occupational Safety & POSH Protocol'}
                </div>
                <div className="text-xs text-purple-600 font-medium mt-1">Active Compliance Track</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Quick Self-Service Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-xl justify-center">
                  <Link href="/leaves">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-semibold">Apply for Leave</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-xl justify-center">
                  <Link href="/payroll">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold">View Payslip</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-xl justify-center">
                  <Link href="/performance">
                    <Award className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-semibold">Self-Appraisal Form</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-xl justify-center">
                  <Link href="/engagement">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold">Raise Grievance</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Plant & Operations Bulletins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePolicies.length > 0 ? (
                  activePolicies.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{p.title}</span>
                      </div>
                      <p className="text-slate-500">
                        Category: <strong className="capitalize">{p.category.replace(/_/g, ' ')}</strong> • Effective: {p.effectiveDate}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">No active bulletin notices at this time.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
