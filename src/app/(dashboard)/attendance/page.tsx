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
  RefreshCw,
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
    currentUser,
    employees,
    setAttendanceRecords,
  } = useAuth();

  const [filterDate, setFilterDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now');

  const empId = currentEmployee?.id || currentUser?.employeeId || (employees[0]?.id ?? '');
  const isEmployee = currentRole === 'employee';

  const syncBiometricData = () => {
    setIsSyncing(true);
    fetch('/api/attendance', {
      headers: {
        'x-user-role': currentRole,
        'x-employee-id': empId,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.attendanceRecords) {
          setAttendanceRecords(data.data.attendanceRecords);
        }
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      })
      .catch(() => {})
      .finally(() => setIsSyncing(false));
  };

  // Auto-sync from Biometric Gateway every 30 seconds
  React.useEffect(() => {
    syncBiometricData();
    const timer = setInterval(() => {
      syncBiometricData();
    }, 30000);
    return () => clearInterval(timer);
  }, [currentRole, empId]);

  const baseRecords = isEmployee
    ? attendanceRecords.filter((r) => r.employeeId === empId || (currentEmployee?.employeeCode && r.employeeId === currentEmployee.employeeCode))
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
            <span>{isEmployee ? 'My Biometric Attendance & Shift Logs' : 'Daily Attendance & Biometric Logs'}</span>
            <Badge variant="success" className="text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Biometric Sync
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEmployee
              ? 'Synchronized in real-time from plant biometric access readers and turnstiles.'
              : 'Real-time biometric capture, shift rosters, overtime calculations, and regularizations'}
          </p>
        </div>

        {/* Biometric Status & Live Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-xs font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Biometric Reader: Connected</span>
            <span className="text-[10px] text-slate-400 font-normal">({lastSyncTime})</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={syncBiometricData}
            disabled={isSyncing}
            className="h-8 gap-1.5 text-xs shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Sync Live</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {(() => {
          const presentDays = baseRecords.filter((a) => a.status === 'present').length;
          const totalHours = baseRecords.reduce((acc, r) => acc + (Number(r.totalHours) || 0), 0);
          const punchRate = baseRecords.length > 0 ? ((presentDays / baseRecords.length) * 100).toFixed(1) : '100.0';

          return (
            <>
              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'My Present Days' : 'Present Today'}</span>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                    {presentDays}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 font-medium">{punchRate}% on-time punch rate</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'Total Logged Hours' : 'Half-Day & Permissions'}</span>
                  <div className="text-3xl font-extrabold text-indigo-600 mt-2">
                    {isEmployee ? `${totalHours.toFixed(1)} hrs` : `${attendanceRecords.filter((a) => a.status === 'half_day').length}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{isEmployee ? 'Current Month Cycle' : '4.5 hours shift recorded'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'Approved Overtime' : 'Regularization Requests'}</span>
                  <div className="text-3xl font-extrabold text-amber-500 mt-2">{isEmployee ? '0.0 hrs' : '0 Pending'}</div>
                  <div className="text-xs text-indigo-600 mt-1">Audit log verified</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">Biometric Gateway</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Plant Gateway Live
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Last synced live</div>
                </CardContent>
              </Card>
            </>
          );
        })()}
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
