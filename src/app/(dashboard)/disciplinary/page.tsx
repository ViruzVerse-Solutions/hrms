'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Shield,
  FileWarning,
  CheckCircle2,
  Clock,
  Plus,
  X,
  Lock,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { DisciplinaryCase } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function DisciplinaryPage() {
  return (
    <RBACGuard module="disciplinary_actions">
      <DisciplinaryContent />
    </RBACGuard>
  );
}

function DisciplinaryContent() {
  const { currentRole, can, employees } = useAuth();
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal State for New Show Cause Notice
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    violationType: 'breach_of_policy',
    incidentDate: new Date().toISOString().split('T')[0],
    severity: 'major',
    description: '',
  });

  // Modal State for Updating Case Stage / Inquiry Action
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);
  const [updateStage, setUpdateStage] = useState('inquiry_panel');
  const [updateActionTaken, setUpdateActionTaken] = useState('written_warning');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const canCreateNotice = can('create', 'disciplinary_actions') || currentRole === 'internal_audit_head' || currentRole === 'hr_head';

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/disciplinary', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json().catch(() => null);
      if (data?.data?.cases) {
        setCases(data.data.cases);
      }
    } catch (err) {
      console.error('Failed to load disciplinary cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [currentRole]);

  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = formData.employeeId || (employees[0] ? employees[0].id : '');
    if (!empId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/disciplinary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ ...formData, employeeId: empId }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          employeeId: '',
          violationType: 'breach_of_policy',
          incidentDate: new Date().toISOString().split('T')[0],
          severity: 'major',
          description: '',
        });
        setStatusMsg('Show cause notice registered successfully in database.');
        fetchCases();
        setTimeout(() => setStatusMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to issue show cause notice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdateModal = (c: DisciplinaryCase) => {
    setSelectedCase(c);
    setUpdateStage(c.currentStage || 'inquiry_panel');
    setUpdateActionTaken(c.actionTaken || 'written_warning');
    setUpdateNotes('');
    setIsUpdateModalOpen(true);
  };

  const handleUpdateCaseStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/disciplinary/${selectedCase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          currentStage: updateStage,
          actionTaken: updateActionTaken,
          description: updateNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsUpdateModalOpen(false);
        setStatusMsg(`Disciplinary case ${selectedCase.caseNumber} stage updated to ${updateStage.replace(/_/g, ' ')}.`);
        fetchCases();
        setTimeout(() => setStatusMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to update case stage:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch = (c.caseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.violationType || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || c.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              Disciplinary Proceedings & Domestic Inquiry (DI)
            </h1>
            <Badge variant="destructive" className="text-xs">
              Strictly Confidential
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standing orders, show cause notices, enquiry panels, and corrective action plans (CAPA)
          </p>
        </div>

        {canCreateNotice ? (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm text-xs bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="h-4 w-4" />
            <span>Issue Show Cause Notice</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 text-xs text-slate-600 bg-slate-100">
            <Lock className="h-3.5 w-3.5" />
            <span>Disciplinary Oversight (Auditing)</span>
          </Badge>
        )}
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg('')} className="text-emerald-600 font-bold hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Disciplinary Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Cases</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{cases.length} Cases</div>
            <div className="text-[11px] text-slate-500 font-medium">Under Standing Orders</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Show Cause Issued</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {cases.filter((c) => c.currentStage === 'show_cause_notice' || c.currentStage === 'show_cause_issued').length}
            </div>
            <div className="text-[11px] text-amber-600 font-medium">Awaiting Formal Explanation</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inquiry Panels Active</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {cases.filter((c) => c.currentStage === 'inquiry_panel').length}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium">Domestic Inquiry In Progress</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Closed & CAPA Verified</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {cases.filter((c) => c.currentStage === 'closed' || c.currentStage === 'action_taken').length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">100% Audit Compliance</div>
          </CardContent>
        </Card>
      </div>

      {/* Disciplinary Cases List */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-rose-600" />
              <span>Active Disciplinary & Domestic Inquiry Registry</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredCases.length} Cases in DB
            </Badge>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by case #, employee name, or violation type..."
                className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900"
            >
              <option value="all">All Case Stages</option>
              <option value="show_cause_notice">Show Cause Notice</option>
              <option value="inquiry_panel">Inquiry Panel Review</option>
              <option value="action_taken">Action Taken & CAPA</option>
              <option value="closed">Closed Cases</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Syncing disciplinary cases from database...</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No disciplinary proceedings found matching your filter.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{c.employeeName}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {c.caseNumber}
                      </Badge>
                      <Badge
                        variant={c.severity === 'critical' || c.severity === 'major' ? 'destructive' : 'warning'}
                        className="text-[10px] uppercase font-mono"
                      >
                        {c.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {c.currentStage.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                      <span>Violation: <strong className="capitalize text-slate-700">{c.violationType.replace(/_/g, ' ')}</strong></span>
                      <span>Incident Date: {formatDate(c.incidentDate)}</span>
                      <span>Reported By: <strong>{c.reportedBy}</strong></span>
                      {c.actionTaken && (
                        <span className="text-rose-600 font-semibold">
                          Action: {c.actionTaken.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenUpdateModal(c)}
                      className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Manage Stage & Findings</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Show Cause Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-rose-600" />
                <span>Issue Show Cause Notice (Formal Charge)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Violation Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                    value={formData.violationType}
                    onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
                  >
                    <option value="breach_of_policy">Breach of Company Policy</option>
                    <option value="absenteeism">Unexcused Absenteeism</option>
                    <option value="insubordination">Insubordination</option>
                    <option value="misconduct">Gross Misconduct</option>
                    <option value="posh_violation">POSH & Harassment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="minor">Minor</option>
                    <option value="medium">Medium</option>
                    <option value="major">Major</option>
                    <option value="severe">Severe / Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Charge Details & Evidence Summary</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the procedural violation, incident circumstances, and timeline..."
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isSubmitting ? 'Registering...' : 'Issue Formal Notice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Update & Findings Modal */}
      {isUpdateModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Manage Case: {selectedCase.caseNumber}</h3>
                <p className="text-xs text-slate-500">Employee: {selectedCase.employeeName}</p>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateCaseStage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Progress Case Stage</label>
                <select
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900 font-medium"
                  value={updateStage}
                  onChange={(e) => setUpdateStage(e.target.value)}
                >
                  <option value="show_cause_notice">1. Show Cause Notice Issued</option>
                  <option value="inquiry_panel">2. Domestic Inquiry Panel In Session</option>
                  <option value="action_taken">3. Corrective Action Taken & CAPA Active</option>
                  <option value="closed">4. Inquiry Closed & Formally Archived</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disciplinary Action / Decision</label>
                <select
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={updateActionTaken}
                  onChange={(e) => setUpdateActionTaken(e.target.value)}
                >
                  <option value="written_warning">Formal Written Warning</option>
                  <option value="pip">Performance Improvement Plan (PIP)</option>
                  <option value="suspension">Temporary Suspension (With Allowance)</option>
                  <option value="capa">Corrective & Preventive Action (CAPA)</option>
                  <option value="termination">Termination of Employment</option>
                  <option value="exonerated">Exonerated (No Violation Found)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inquiry Panel Notes & Findings</label>
                <textarea
                  rows={3}
                  placeholder="Record enquiry committee minutes, findings, or CAPA adherence timeline..."
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSubmitting ? 'Updating Database...' : 'Save Stage Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
