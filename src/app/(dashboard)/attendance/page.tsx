'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Filter,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function AttendancePage() {
  return (
    <RBACGuard module="attendance_leave">
      <AttendanceContent />
    </RBACGuard>
  );
}

function AttendanceContent() {
  const {
    attendanceRecords,
    currentRole,
    currentEmployee,
    updateAttendanceCheckin,
  } = useAuth();

  const [filterDate, setFilterDate] = useState('2026-08-14');
  const [sourceFilter, setSourceFilter] = useState('all');

  const baseRecords = currentRole === 'employee' && currentEmployee
    ? attendanceRecords.filter((r) => r.employeeId === currentEmployee.id)
    : attendanceRecords;

  const filteredRecords = baseRecords.filter((rec) => {
    const matchesDate = !filterDate || rec.date === filterDate;
    const matchesSource = sourceFilter === 'all' || rec.source === sourceFilter;
    return matchesDate && matchesSource;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Daily Attendance & Biometric Logs</span>
            <Badge variant="success" className="text-xs">
              Live Biometric Sync
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time biometric capture, web check-ins, overtime calculations, and regularizations
          </p>
        </div>

        {/* Quick Checkin Action */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => updateAttendanceCheckin('present')}
            className="gap-2 bg-indigo-600 shadow-md text-xs"
          >
            <Clock className="h-4 w-4" />
            <span>Mark Web Check-In</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              {attendanceRecords.filter((a) => a.status === 'present').length}
            </div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">96.4% on-time attendance</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Half-Day & Permissions</span>
            <div className="text-3xl font-extrabold text-amber-500 mt-2">
              {attendanceRecords.filter((a) => a.status === 'half_day').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">4.5 hours shift recorded</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Regularization Requests</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2">1 Approved</div>
            <div className="text-xs text-indigo-600 mt-1">Audit log updated</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Biometric Gateway Status</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected (API v2)
            </div>
            <div className="text-xs text-slate-400 mt-1">Last synced 2 mins ago</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44 text-xs"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="biometric">Biometric Device</option>
            <option value="web_checkin">Web ESS Check-in</option>
            <option value="manual">Manual Regularization</option>
          </select>
        </div>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Attendance Verification Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">In-Time</th>
                  <th className="p-3">Out-Time</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Capture Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Regularization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {rec.employeeName}
                    </td>
                    <td className="p-3 text-slate-500">{formatDate(rec.date)}</td>
                    <td className="p-3 font-mono">{rec.inTime || '—'}</td>
                    <td className="p-3 font-mono">{rec.outTime || '—'}</td>
                    <td className="p-3 font-mono font-semibold">{rec.totalHours} hrs</td>
                    <td className="p-3 capitalize">
                      <Badge variant="outline" className="text-[10px]">
                        {rec.source.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={rec.status === 'present' ? 'success' : 'warning'}
                        className="text-[10px] capitalize"
                      >
                        {rec.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {rec.regularizationStatus && rec.regularizationStatus !== 'none' ? (
                        <span className="text-[11px] text-indigo-600 font-semibold">
                          {rec.regularizationStatus}: {rec.regularizationReason}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
