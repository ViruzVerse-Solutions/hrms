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
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Building2,
  Shield,
  FileText,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    currentRole,
    currentUser,
    currentEmployee,
    employees,
    leaveRequests,
    attendanceRecords,
    payrollRuns,
    candidates,
    requisitions,
    grievances,
    updateAttendanceCheckin,
    auditLogs,
  } = useAuth();

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((a) => a.date === today);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const isCheckedInToday = currentEmployee
    ? attendanceRecords.some((a) => a.employeeId === currentEmployee.id && a.date === today)
    : false;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner with Dynamic Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white shadow-xl shadow-indigo-600/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>HRM Control Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-sm text-indigo-100 max-w-xl">
              {currentRole === 'super_admin' && 'System health is optimal. Active audit logs and master infrastructure controls are online.'}
              {currentRole === 'hr_admin' && 'All 14 HR Functional modules are active. 2 pending approvals require your attention.'}
              {currentRole === 'hr_executive' && 'You have 4 candidates in active interview stages and 2 onboarding workflows queued.'}
              {currentRole === 'payroll_officer' && 'August 2026 payroll input sheet has 3 attendance variances ready for review.'}
              {currentRole === 'reporting_manager' && 'Your engineering direct reports have 1 pending leave application and 1 regularization request.'}
              {currentRole === 'employee' && 'Your attendance for today is ready. View your latest payslip and track your leave balances.'}
            </p>
          </div>

          {/* Quick Action Button based on Role */}
          <div className="flex items-center gap-3">
            {currentRole === 'employee' && (
              <Button
                variant={isCheckedInToday ? 'secondary' : 'default'}
                className={isCheckedInToday ? 'bg-emerald-500/20 text-white border border-emerald-400/30' : 'bg-white text-indigo-900 hover:bg-white/90 shadow-lg'}
                disabled={isCheckedInToday}
                onClick={() => updateAttendanceCheckin('present')}
              >
                <Clock className="h-4 w-4 mr-1 text-emerald-400" />
                {isCheckedInToday ? 'Checked In Today ✓' : 'Web Check-In (Present)'}
              </Button>
            )}
            {currentRole === 'hr_admin' && (
              <Button asChild className="bg-white text-indigo-900 hover:bg-white/90 shadow-lg">
                <Link href="/recruitment">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Post Requisition
                </Link>
              </Button>
            )}
            {currentRole === 'payroll_officer' && (
              <Button asChild className="bg-white text-indigo-900 hover:bg-white/90 shadow-lg">
                <Link href="/payroll">
                  <Wallet className="h-4 w-4 mr-1" />
                  Open Payroll Run
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUPER ADMIN DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'super_admin' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">System Status</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">99.99%</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">All services operational</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Total Users</span>
                <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{employees.length} Staff</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">6 Active RBAC Roles</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Encrypted Document Vault</span>
                <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">4.2 GB</div>
                <div className="text-xs text-slate-400 font-medium mt-1">AES-256 Cloud Storage</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Audit Trail Events</span>
                <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{auditLogs.length} Logged</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Immutable PostgreSQL</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span>Real-Time Security & Compliance Audit Log</span>
              </CardTitle>
              <Link href="/settings" className="text-xs font-semibold text-indigo-600 hover:underline">
                View full audit stream
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {log.action}
                      </Badge>
                      <span>{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Initiated by {log.userName} ({log.role}) • IP: {log.ipAddress}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HR ADMIN DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'hr_admin' && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Headcount</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  {employees.length}
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+8.4% growth this quarter</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Open Requisitions</span>
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  {requisitions.length}
                </div>
                <div className="text-xs text-purple-600 font-medium mt-2">
                  {candidates.length} active candidates in pipeline
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  {pendingLeaves.length + 1}
                </div>
                <div className="text-xs text-amber-600 font-medium mt-2">
                  Leaves, requisitions & payroll
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Compliance Rate</span>
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  98.2%
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-2">
                  Statutory registers up-to-date
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Center Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Leave & Action Queue */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold">Action Queue & Approvals</CardTitle>
                <Link href="/leaves" className="text-xs text-indigo-600 hover:underline font-semibold">
                  Manage all
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {leave.employeeName}
                        </span>
                        <Badge variant="warning" className="text-[10px] capitalize">
                          {leave.leaveType} Leave
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {leave.daysCount} days ({formatDate(leave.fromDate)} → {formatDate(leave.toDate)}) • {leave.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/leaves">Review</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Workforce by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Engineering & AI</span>
                    <span>42 staff (40%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Sales & Enterprise</span>
                    <span>25 staff (24%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Operations & Facilities</span>
                    <span>15 staff (14%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '14%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Finance & HR</span>
                    <span>20 staff (22%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HR EXECUTIVE / RECRUITER DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'hr_executive' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Active Candidates</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  {candidates.length}
                </div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Across 2 open requisitions</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Today's Interviews</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">1 Scheduled</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Devraj Mukherjee (11:00 AM)</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Pending Onboarding</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">2 Joiners</div>
                <div className="text-xs text-purple-600 font-medium mt-1">Doc verification queue</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Quick Sourcing Pipeline Overview</CardTitle>
              <Button asChild size="sm">
                <Link href="/recruitment">Open Recruitment Kanban</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['applied', 'screened', 'interview', 'offered'].map((stage) => {
                  const count = candidates.filter((c) => c.currentStage === stage).length;
                  return (
                    <div key={stage} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border text-center">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {stage}
                      </span>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PAYROLL OFFICER DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'payroll_officer' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Current Payroll Cycle</span>
                <div className="text-2xl font-extrabold mt-2 text-slate-900 dark:text-white">August 2026</div>
                <Badge variant="warning" className="mt-2 text-[10px]">Under Review</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Est. Total Net Payout</span>
                <div className="text-2xl font-extrabold mt-2 text-emerald-600">
                  {formatCurrency(7625000)}
                </div>
                <div className="text-xs text-slate-400 mt-1">105 active employees</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Pending F&F Settlements</span>
                <div className="text-2xl font-extrabold mt-2 text-slate-900 dark:text-white">1 Exited</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Sneha Kulkarni (Notice Period)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Statutory Compliance Due Dates</CardTitle>
              <Button asChild size="sm">
                <Link href="/payroll">Manage Payroll Runs</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">PF Monthly Return & ECR Challan</div>
                  <div className="text-slate-400">Due: 15th August 2026</div>
                </div>
                <Badge variant="success">Challan Ready</Badge>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">ESI Monthly Contribution Deposit</div>
                  <div className="text-slate-400">Due: 15th August 2026</div>
                </div>
                <Badge variant="success">Calculated</Badge>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">TDS (Section 192B) Salary Remittance</div>
                  <div className="text-slate-400">Due: 07th September 2026</div>
                </div>
                <Badge variant="info">Upcoming</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REPORTING MANAGER DASHBOARD */}
      {/* ========================================================================= */}
      {currentRole === 'reporting_manager' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">My Team Attendance Today</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  3 / 3 Present
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-1">100% Team On Duty</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Pending Leave Approvals</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  1 Request
                </div>
                <div className="text-xs text-amber-600 font-medium mt-1">Ananya Deshmukh (2 days)</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Performance Reviews</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  1 Pending
                </div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Annual Appraisal Cycle</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Direct Reports Team Roster</CardTitle>
              <Button asChild size="sm">
                <Link href="/leaves">Approve Requests</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees
                  .filter((e) => e.reportingManagerId === currentEmployee?.id || e.id !== currentEmployee?.id)
                  .slice(0, 3)
                  .map((emp) => (
                    <div key={emp.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                          alt={emp.firstName}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {emp.designationTitle} • Stage: {emp.currentLifecycleStage}
                          </div>
                        </div>
                      </div>
                      <Badge variant="success" className="text-xs">Present</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EMPLOYEE DASHBOARD (SELF-SERVICE / ESS) */}
      {/* ========================================================================= */}
      {currentRole === 'employee' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Casual Leave Balance</span>
                <div className="text-3xl font-extrabold mt-2 text-indigo-600">7 Days</div>
                <div className="text-xs text-slate-400 mt-1">3 used • 2 pending approval</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Latest Payslip (July 2026)</span>
                <div className="text-2xl font-extrabold mt-2 text-emerald-600">
                  {formatCurrency(128450)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Disbursed via Direct Bank Transfer</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Upcoming Training</span>
                <div className="text-base font-bold mt-2 text-slate-900 dark:text-white">
                  CloudSec Workshop
                </div>
                <div className="text-xs text-purple-600 font-medium mt-1">Starts Aug 22, 2026</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold">Quick Self-Service Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pt-2">
                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-2xl justify-center">
                  <Link href="/leaves">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-semibold">Apply for Leave</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-2xl justify-center">
                  <Link href="/payroll">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold">Download Payslip</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-2xl justify-center">
                  <Link href="/performance">
                    <Award className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-semibold">Self-Appraisal Form</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-16 flex-col gap-1 rounded-2xl justify-center">
                  <Link href="/engagement">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold">Raise a Concern</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Company Announcements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20 text-xs">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200">
                    Independence Day Holiday & Celebration
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Office will remain closed on 15th August. Join us for the morning flag hoisting and cultural breakfast!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Annual Health & Wellness Checkup Camp
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Complimentary executive health checkups on Aug 25-26 in the campus medical center.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
