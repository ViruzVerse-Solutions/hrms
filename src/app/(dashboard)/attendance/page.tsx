'use client';

import React, { useState, useRef } from 'react';
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
  FileSpreadsheet,
  Download,
  FileText,
  X,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AttendancePage() {
  return (
    <RBACGuard module="attendance_leave">
      <AttendanceContent />
    </RBACGuard>
  );
}

interface ParsedBiometricRow {
  employeeCode: string;
  date: string;
  inTime: string;
  outTime: string;
  status: 'present' | 'absent' | 'half_day';
  totalHours: number;
}

function AttendanceContent() {
  const {
    attendanceRecords,
    currentRole,
    currentEmployee,
    currentUser,
    employees,
    setAttendanceRecords,
    isLoadingData,
  } = useAuth();

  const [filterDate, setFilterDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now');

  // Excel / CSV Biometric Sync Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedBiometricRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [syncErrorMsg, setSyncErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const empId = currentEmployee?.id || currentUser?.employeeId || '';
  const isEmployee = currentRole === 'employee';
  const canSyncExcel = currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'compliance_statutory';

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
        setLastSyncTime(formatTime(new Date(), true));
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

  // Handle Excel / CSV File Reading & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSyncErrorMsg('');
    setSyncStatusMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setSyncErrorMsg('The selected file appears to be empty.');
          return;
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length <= 1) {
          setSyncErrorMsg('File has no data rows. Expected header + at least 1 record.');
          return;
        }

        // Check header row or start parsing
        const rows: ParsedBiometricRow[] = [];
        const startIdx = lines[0].toLowerCase().includes('employee') || lines[0].toLowerCase().includes('code') ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          const employeeCode = cols[0];
          const date = cols[1] || new Date().toISOString().split('T')[0];
          const inTime = cols[2] || '09:00';
          const outTime = cols[3] || '18:00';
          const statusStr = (cols[4] || 'present').toLowerCase();
          const status = statusStr.includes('half') ? 'half_day' : statusStr.includes('absent') ? 'absent' : 'present';

          let hours = Number(cols[5]);
          if (isNaN(hours) || hours <= 0) {
            hours = status === 'present' ? 9.0 : status === 'half_day' ? 4.5 : 0;
          }

          if (employeeCode) {
            rows.push({
              employeeCode,
              date,
              inTime,
              outTime,
              status,
              totalHours: hours,
            });
          }
        }

        if (rows.length === 0) {
          setSyncErrorMsg('No valid biometric rows could be parsed. Check column formatting.');
        } else {
          setParsedRows(rows);
          setSyncStatusMsg(`Successfully read ${rows.length} attendance punch records from ${file.name}.`);
        }
      } catch (err: any) {
        setSyncErrorMsg(`Failed to parse file: ${err?.message || 'Invalid format'}`);
      }
    };

    reader.readAsText(file);
  };

  // Submit parsed biometric logs to backend API
  const handleUploadBiometricExcel = async () => {
    if (parsedRows.length === 0) {
      setSyncErrorMsg('No biometric records to sync. Please select a valid Excel/CSV file.');
      return;
    }

    try {
      setIsUploading(true);
      setSyncErrorMsg('');
      setSyncStatusMsg('Uploading and syncing punch records to PostgreSQL...');

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ records: parsedRows }),
      });

      const data = await res.json();
      if (data?.success) {
        if (data.data?.attendanceRecords) {
          setAttendanceRecords(data.data.attendanceRecords);
        }
        setSyncStatusMsg(`🎉 Success: Synchronized ${data.data?.syncedCount || parsedRows.length} biometric records from Excel!`);
        setLastSyncTime(formatTime(new Date(), true));
        setTimeout(() => {
          setIsExcelModalOpen(false);
          setParsedRows([]);
          setFileName('');
          setSyncStatusMsg('');
        }, 1800);
      } else {
        setSyncErrorMsg(data?.message || 'Failed to synchronize records.');
      }
    } catch (err: any) {
      setSyncErrorMsg(`Server error during Excel sync: ${err?.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const defaultEmpCodes = employees.slice(0, 3).map((e) => e.employeeCode).filter(Boolean);
    const code1 = defaultEmpCodes[0] || 'VV-3279';
    const code2 = defaultEmpCodes[1] || 'VV-1002';
    const today = new Date().toISOString().split('T')[0];

    const csvContent = `Employee_Code,Date,In_Time,Out_Time,Status,Total_Hours,Machine_ID\n${code1},${today},09:00,18:00,present,9.0,GATE-NORTH-01\n${code2},${today},09:15,18:15,present,9.0,GATE-SOUTH-02\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'biometric_sync_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const baseRecords = isEmployee
    ? attendanceRecords.filter((r) => r.employeeId === empId || (currentEmployee?.employeeCode && r.employeeId === currentEmployee.employeeCode))
    : attendanceRecords;

  const filteredRecords = baseRecords.filter((rec) => {
    const matchesDate = !filterDate || rec.date === filterDate;
    const matchesSource = sourceFilter === 'all' || rec.source === sourceFilter;
    return matchesDate && matchesSource;
  });

  if (isLoadingData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
            <span>{isEmployee ? 'My Biometric Attendance & Shift Logs' : 'Daily Attendance & Biometric Logs'}</span>
            <Badge variant="success" className="text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Biometric Sync
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEmployee
              ? 'Synchronized directly from biometric access readers and Excel device logs.'
              : 'Real-time biometric capture, Excel device log imports, and overtime tracking.'}
          </p>
        </div>

        {/* Biometric Status & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-xs font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Biometric Gateway: Active</span>
            <span className="text-[10px] text-slate-400 font-normal">({lastSyncTime})</span>
          </div>

          {/* Sync Biometric Data Through Excel Button (HR / Management) */}
          {canSyncExcel && (
            <Dialog open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-8 gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Sync Biometric Excel</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <span>Sync Biometric Punch Logs Through Excel</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Enterprise Biometric Importer</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                      Upload daily turnstile/fingerprint CSV or Excel exports. Records will be matched by Employee Code and mapped directly to attendance registers.
                    </p>
                  </div>

                  {/* Drag & Drop File Upload Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-colors text-center"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls, .txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-emerald-600" />
                    <div className="font-semibold text-slate-800 dark:text-white">
                      {fileName ? fileName : 'Click to select or drop biometric CSV/Excel file'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Supports .csv, .xlsx, or .txt punch logs (Max 10MB)
                    </div>
                  </div>

                  {/* Template Download & Preview */}
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700 gap-1.5 px-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Sample Excel Template</span>
                    </Button>
                    {parsedRows.length > 0 && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {parsedRows.length} Rows Ready
                      </Badge>
                    )}
                  </div>

                  {/* Parsed Rows Preview Table */}
                  {parsedRows.length > 0 && (
                    <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 sticky top-0">
                          <tr>
                            <th className="p-2">Code</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">In</th>
                            <th className="p-2">Out</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {parsedRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold">{row.employeeCode}</td>
                              <td className="p-2">{row.date}</td>
                              <td className="p-2 font-mono">{row.inTime}</td>
                              <td className="p-2 font-mono">{row.outTime}</td>
                              <td className="p-2 capitalize">
                                <Badge variant={row.status === 'present' ? 'success' : 'warning'} className="text-[9px]">
                                  {row.status}
                                </Badge>
                              </td>
                              <td className="p-2 font-mono">{row.totalHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedRows.length > 5 && (
                        <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 border-t">
                          + {parsedRows.length - 5} more records ready to sync...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status & Error Messages */}
                  {syncStatusMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      {syncStatusMsg}
                    </div>
                  )}
                  {syncErrorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                      {syncErrorMsg}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExcelModalOpen(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadBiometricExcel}
                      disabled={parsedRows.length === 0 || isUploading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Syncing Records...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Sync {parsedRows.length > 0 ? `${parsedRows.length} Rows` : 'To Database'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={syncBiometricData}
            disabled={isSyncing}
            className="h-8 gap-1.5 text-xs shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(() => {
          const presentDays = baseRecords.filter((a) => a.status === 'present').length;
          const totalHours = baseRecords.reduce((acc, r) => acc + (Number(r.totalHours) || 0), 0);
          const punchRate = baseRecords.length > 0 ? ((presentDays / baseRecords.length) * 100).toFixed(1) : '100.0';

          return (
            <>
              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'My Present Days' : 'Present Days'}</span>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                    {presentDays}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 font-medium">{punchRate}% on-time punch rate</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'Total Logged Hours' : 'Half-Day Logs'}</span>
                  <div className="text-3xl font-extrabold text-indigo-600 mt-2">
                    {isEmployee ? `${totalHours.toFixed(1)} hrs` : `${baseRecords.filter((a) => a.status === 'half_day').length}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{isEmployee ? 'Current Month Cycle' : 'Biometric shift recorded'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'Total Shift Records' : 'Total Biometric Punches'}</span>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{baseRecords.length}</div>
                  <div className="text-xs text-indigo-600 mt-1">Directly from biometric hardware & Excel sync</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-slate-500">Biometric Sync Status</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Hardware Feed
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Excel & Machine Reader Active</div>
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <option value="biometric">Biometric Device & Excel</option>
            <option value="manual">Manual Regularization</option>
          </select>
        </div>

        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterDate('')}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Clear Date Filter
          </Button>
        )}
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            {isEmployee ? 'My Biometric Attendance Register' : 'Biometric Attendance Verification Register'}
          </CardTitle>
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
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No attendance punch records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
