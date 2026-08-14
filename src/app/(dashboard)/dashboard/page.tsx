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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 text-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Apex Operations • RBAC Session</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              {currentRole === 'super_admin' && 'Enterprise infrastructure is operational. System audit logs, security policies, and master tables are synchronized.'}
              {currentRole === 'hr_admin' && 'Full operational visibility across plant departments, active requisitions, leave queues, and compliance checklists.'}
              {currentRole === 'hr_executive' && 'You have active technical interview rounds, onboarding documentation queues, and attendance monitoring tasks.'}
              {currentRole === 'payroll_officer' && 'August 2026 plant wage calculations and statutory deduction reports (PF, ESI, TDS) are ready for review.'}
              {currentRole === 'reporting_manager' && 'Supervising direct reports: track daily shift attendance, approve pending leave applications, and review performance KRAs.'}
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
            {currentRole === 'hr_admin' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/recruitment">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Requisition
                </Link>
              </Button>
            )}
            {currentRole === 'payroll_officer' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/payroll">
                  <Wallet className="h-4 w-4 mr-2" />
                  Open Payroll Run
                </Link>
              </Button>
            )}
            {currentRole === 'reporting_manager' && (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/leaves">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Review Team Leaves
                </Link>
              </Button>
            )}
            {currentRole === 'super_admin' && (
              <Button asChild variant="outline">
                <Link href="/settings">
                  <Server className="h-4 w-4 mr-2" />
                  System Master Setup
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">System Availability</span>
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">99.99%</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">All plant nodes operational</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Staff</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">{employees.length} Users</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">6 Active RBAC Roles</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Storage & Vault</span>
                  <Server className="h-4 w-4 text-slate-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">4.8 GB</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Encrypted Personnel Vault</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Audit Trail Events</span>
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">{auditLogs.length} Events</div>
                <div className="text-xs text-purple-600 font-medium mt-1">Immutable Log Store</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span>Security & RBAC Audit Stream</span>
              </CardTitle>
              <Link href="/settings" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All System Logs
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {log.action}
                      </Badge>
                      <span>{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      User: {log.userName} ({log.role}) • Host: {log.ipAddress}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Plant Headcount</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold mt-3 text-slate-900 dark:text-white">
                  {employees.length}
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+6.2% workforce growth</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Open Positions</span>
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
                  98.5%
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-2">
                  Factory Act registers auditable
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Center Grid */}
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
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
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
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Production & Ops</span>
                    <span>38 staff (35%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Quality Assurance & QC</span>
                    <span>16 staff (15%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Supply Chain & Logistics</span>
                    <span>18 staff (17%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '17%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Engineering & Utilities</span>
                    <span>14 staff (13%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '13%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HR EXECUTIVE DASHBOARD */}
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
                <div className="text-xs text-indigo-600 font-medium mt-1">2 Open plant requisitions</div>
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
                <div className="text-xs text-purple-600 font-medium mt-1">Safety & document clearance</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Candidate Sourcing Pipeline</CardTitle>
              <Button asChild size="sm">
                <Link href="/recruitment">Open Recruitment Pipeline</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {['applied', 'screened', 'interview', 'offered'].map((stage) => {
                  const count = candidates.filter((c) => c.currentStage === stage).length;
                  return (
                    <div key={stage} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
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
                <span className="text-xs font-semibold text-slate-500">Total Net Disbursal</span>
                <div className="text-2xl font-extrabold mt-2 text-emerald-600">
                  {formatCurrency(6940000)}
                </div>
                <div className="text-xs text-slate-400 mt-1">110 plant staff members</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Full & Final (F&F)</span>
                <div className="text-2xl font-extrabold mt-2 text-slate-900 dark:text-white">1 Pending</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Sneha Kulkarni (Exit Settlement)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Statutory Compliance Calendar</CardTitle>
              <Button asChild size="sm">
                <Link href="/payroll">Manage Payroll Runs</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Provident Fund (PF) Monthly Filing & ECR</div>
                  <div className="text-slate-400">Due: 15th August 2026</div>
                </div>
                <Badge variant="success">Challan Ready</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">ESI Monthly Contribution Deposit</div>
                  <div className="text-slate-400">Due: 15th August 2026</div>
                </div>
                <Badge variant="success">Calculated</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">TDS (Section 192B) Salary Remittance</div>
                  <div className="text-slate-400">Due: 07th September 2026</div>
                </div>
                <Badge variant="info">Scheduled</Badge>
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
                <span className="text-xs font-semibold text-slate-500">Team Attendance Today</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  3 / 3 On Duty
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-1">100% Team On Shift</div>
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
                <span className="text-xs font-semibold text-slate-500">Appraisal Reviews</span>
                <div className="text-3xl font-extrabold mt-2 text-slate-900 dark:text-white">
                  1 In Progress
                </div>
                <div className="text-xs text-indigo-600 font-medium mt-1">Annual Operational Review</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Direct Reports Roster</CardTitle>
              <Button asChild size="sm">
                <Link href="/leaves">Review Team Requests</Link>
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
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {emp.designationTitle} • {emp.departmentName}
                          </div>
                        </div>
                      </div>
                      <Badge variant="success" className="text-xs">Active Shift</Badge>
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
                <div className="text-xs text-slate-400 mt-1">Disbursed via Bank Transfer</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-500">Mandatory Training</span>
                <div className="text-base font-bold mt-2 text-slate-900 dark:text-white">
                  Industrial Safety & PPE
                </div>
                <div className="text-xs text-purple-600 font-medium mt-1">Scheduled for Aug 22, 2026</div>
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
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Quarterly EHS Safety & PPE Verification</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Mandatory protective equipment audits scheduled across all manufacturing units next week.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Annual Employee Health Checkup Camp</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Complimentary industrial health screening on Aug 25-26 at the on-site health center.
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
