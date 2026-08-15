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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    violationType: 'breach_of_policy',
    incidentDate: new Date().toISOString().split('T')[0],
    severity: 'major',
    description: '',
  });

  const canCreateNotice = can('create', 'disciplinary_actions');

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/disciplinary', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json();
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
    const empId = formData.employeeId || employees[0]?.id;
    if (!empId) return;

    try {
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
        fetchCases();
      }
    } catch (err) {
      console.error('Failed to issue show cause notice:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Disciplinary Proceedings & Domestic Inquiry (DI)</span>
            <Badge variant="destructive" className="text-xs">
              Strictly Confidential
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standing orders, show cause notices, enquiry panels, and corrective action plans (CAPA)
          </p>
        </div>

        {canCreateNotice ? (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm text-xs bg-rose-600 hover:bg-rose-700">
            <Plus className="h-4 w-4" />
            <span>Issue Show Cause Notice</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 text-xs text-slate-600 bg-slate-100">
            <Lock className="h-3.5 w-3.5" />
            <span>Disciplinary Access (View Only)</span>
          </Badge>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-amber-500/20 bg-amber-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Inquiry Panels</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {cases.filter((c) => c.currentStage === 'inquiry_panel' || c.currentStage === 'show_cause_notice').length} Cases
            </div>
            <p className="text-xs text-slate-500">Under domestic enquiry committee review</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Major Violations</span>
              <FileWarning className="h-4 w-4 text-rose-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {cases.filter((c) => c.severity === 'major' || c.severity === 'critical').length} Recorded
            </div>
            <p className="text-xs text-slate-500">Breach of safety, standing orders, or conduct</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Resolved / Closed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {cases.filter((c) => c.currentStage === 'closed').length} Cases
            </div>
            <p className="text-xs text-slate-500">Corrective actions completed & documented</p>
          </CardContent>
        </Card>
      </div>

      {/* Disciplinary Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-rose-600" />
            <span>Disciplinary Proceedings Register</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading cases from database...</div>
          ) : cases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No disciplinary proceedings found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cases.map((c) => (
                <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{c.caseNumber}</span>
                      <span className="text-xs font-semibold text-slate-700">{c.employeeName}</span>
                      <Badge variant={c.severity === 'critical' || c.severity === 'major' ? 'destructive' : 'warning'} className="text-[10px] uppercase">
                        {c.severity}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4 mt-1">
                      <span>Violation: <strong className="capitalize">{c.violationType.replace(/_/g, ' ')}</strong></span>
                      <span>Incident Date: {formatDate(c.incidentDate)}</span>
                      <span>Reported By: {c.reportedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs capitalize font-mono">
                      Stage: {c.currentStage.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Issue Show Cause Notice</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Employee</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Violation Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.violationType}
                    onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
                  >
                    <option value="breach_of_policy">Breach of Company Policy</option>
                    <option value="absenteeism">Unauthorized Absence</option>
                    <option value="misconduct">Workplace Misconduct</option>
                    <option value="posh_violation">POSH / Safety Violation</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity Level</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Description & Charges</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the procedural breach or misconduct details..."
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Issue Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
