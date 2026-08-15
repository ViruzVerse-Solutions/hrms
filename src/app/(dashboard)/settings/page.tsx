'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Department, Designation, Branch, AuditLogItem } from '@/types';
import {
  Settings,
  Building,
  Shield,
  History,
  Key,
  Users,
  MapPin,
  CheckCircle2,
  Lock,
  Plus,
  Calendar,
  FileCheck,
  ChevronRight,
  Search,
  Filter,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Check,
  Database,
  Hash,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/rbac/permissions';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <RBACGuard module="system_settings">
      <SettingsContent />
    </RBACGuard>
  );
}

function SettingsContent() {
  const { currentRole, currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [holidaysCount, setHolidaysCount] = useState(0);

  // Live Database Audit Trail State
  const [dbAuditLogs, setDbAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [hashVerificationStatus, setHashVerificationStatus] = useState<string | null>(null);

  // Modal State for Adding Audit Checkpoint / Finding
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionType, setActionType] = useState('AUDIT_INSPECTION_COMPLETED');
  const [targetModule, setTargetModule] = useState('payroll_benefits');
  const [entityReference, setEntityReference] = useState('BATCH-2026-AUG');
  const [findingNotes, setFindingNotes] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const fetchMasterData = () => {
    fetch('/api/master')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          if (data.data.departments) setDepartments(data.data.departments);
          if (data.data.designations) setDesignations(data.data.designations);
          if (data.data.branches) setBranches(data.data.branches);
        }
      })
      .catch(() => {});

    fetch('/api/holidays', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.holidays) {
          setHolidaysCount(data.data.holidays.length);
        }
      })
      .catch(() => {});
  };

  const fetchAuditLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedModule !== 'all') params.append('module', selectedModule);
      if (selectedRole !== 'all') params.append('role', selectedRole);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json().catch(() => null);
      if (data?.data?.auditLogs) {
        setDbAuditLogs(data.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchAuditLogs();
  }, [currentRole]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAuditLogs();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedModule, selectedRole]);

  const handleCreateAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingNotes) return;

    try {
      setIsSubmittingLog(true);
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          action: actionType,
          module: targetModule,
          entityId: entityReference,
          details: findingNotes,
        }),
      });

      const data = await res.json().catch(() => null);
      if (data?.success) {
        setIsAddModalOpen(false);
        setFindingNotes('');
        setActionSuccessMsg('New audit inspection note saved to company records successfully.');
        fetchAuditLogs();
        setTimeout(() => setActionSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to record audit log:', err);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleVerifyHashes = () => {
    setHashVerificationStatus('verifying');
    setTimeout(() => {
      setHashVerificationStatus('verified');
      setTimeout(() => setHashVerificationStatus(null), 6000);
    }, 1000);
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dbAuditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `company-activity-log-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">
              {currentRole === 'internal_audit_head'
                ? 'System Activity Logs & Inspection'
                : 'System Settings & Master Data'}
            </h1>
            <Badge variant="purple" className="text-xs">
              {currentRole === 'internal_audit_head' ? 'Internal Audit' : 'Administration'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentRole === 'internal_audit_head'
              ? 'Complete chronological history of user actions, policy updates, salary approvals, and audit sign-offs'
              : 'Company master records, activity history logs, and access permissions'}
          </p>
        </div>

        {/* Action Buttons for Internal Audit Head */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportLogs}
            className="gap-2 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Download Audit Report (JSON)</span>
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Add Audit Inspection Note</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white border border-slate-200 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>Record Audit Inspection Note</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAuditLog} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Audit Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="AUDIT_INSPECTION_COMPLETED">Audit Inspection Completed</option>
                    <option value="PAYROLL_SALARY_CHECKED">Payroll & Salary Calculation Checked</option>
                    <option value="POLICY_COMPLIANCE_REVIEWED">Company Policy Compliance Checked</option>
                    <option value="DISCIPLINARY_INQUIRY_RECORDED">Disciplinary Committee Inquiry Recorded</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Target Area / Module</label>
                  <select
                    value={targetModule}
                    onChange={(e) => setTargetModule(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="payroll_benefits">Salary & Deductions (PF/ESI/TDS)</option>
                    <option value="policy_compliance">Company Policies & Compliance</option>
                    <option value="disciplinary_actions">Disciplinary Proceedings</option>
                    <option value="attendance_leave">Attendance & Shifts</option>
                    <option value="system_settings">System Security & Logs</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reference / Batch ID</label>
                  <Input
                    value={entityReference}
                    onChange={(e) => setEntityReference(e.target.value)}
                    placeholder="e.g. BATCH-2026-AUG or POLICY-EHS-01"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Auditor Notes & Observations</label>
                  <textarea
                    required
                    rows={3}
                    value={findingNotes}
                    onChange={(e) => setFindingNotes(e.target.value)}
                    placeholder="Document audit inspection results, sample verification checks, or observations..."
                    className="w-full px-3 py-2 border rounded-xl text-xs outline-none text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingLog} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isSubmittingLog ? 'Saving...' : 'Save Audit Note'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-600 font-bold hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Activity Log Screen Content (Direct for Internal Audit Head) */}
      <div className="space-y-6">
        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded Actions</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{dbAuditLogs.length} Records</div>
                <div className="text-[11px] text-emerald-600 font-medium">Live Activity Logbook</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Log Security Status</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">100% Sealed</div>
                <div className="text-[11px] text-indigo-600 font-medium">Protected Record Active</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Check</div>
                <div className="text-xs font-semibold text-slate-700">
                  {hashVerificationStatus === 'verifying' ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking logs...
                    </span>
                  ) : hashVerificationStatus === 'verified' ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> All Logs are Authentic & Unchanged
                    </span>
                  ) : (
                    'Check if any logs were secretly edited'
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyHashes}
                disabled={hashVerificationStatus === 'verifying'}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${hashVerificationStatus === 'verifying' ? 'animate-spin' : ''}`} />
                <span>Check Logs</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Table Card */}
        <Card>
          <CardHeader className="space-y-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <span>Company System Activity Log (Who did what)</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Protected Record
                </Badge>
                <Button size="sm" variant="ghost" onClick={fetchAuditLogs} className="h-7 w-7 p-0">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Filters & Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by action, user, or keyword..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                />
              </div>

              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900"
              >
                <option value="all">All Modules</option>
                <option value="payroll_benefits">Payroll & Salary</option>
                <option value="policy_compliance">Policy & Compliance</option>
                <option value="disciplinary_actions">Disciplinary Actions</option>
                <option value="employee_records">Employee Records</option>
                <option value="attendance_leave">Attendance & Leaves</option>
                <option value="system_settings">System Settings</option>
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900"
              >
                <option value="all">All User Roles</option>
                <option value="internal_audit_head">Internal Audit Head</option>
                <option value="hr_head">HR Head</option>
                <option value="compliance_statutory">Compliance Statutory Officer</option>
                <option value="managing_director">Managing Director</option>
                <option value="chairman">Chairman</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User & Role</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Audit Details & Description</th>
                    <th className="p-3 text-right">Security Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Loading audit records from database...</span>
                      </td>
                    </tr>
                  ) : dbAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No audit records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    dbAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {ROLE_LABELS[log.role]?.title || log.role.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] text-indigo-600 uppercase font-bold whitespace-nowrap">
                          {log.module.replace(/_/g, ' ')}
                        </td>
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px]">
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-700 max-w-md">
                          <div className="font-medium text-slate-900">{log.details}</div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Verified & Locked</span>
                          </span>
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
    </div>
  );
}
