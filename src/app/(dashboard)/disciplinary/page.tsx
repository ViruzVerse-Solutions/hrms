'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Shield,
  FileWarning,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { DisciplinaryCase } from '@/types';

export default function DisciplinaryPage() {
  return (
    <RBACGuard module="disciplinary_actions">
      <DisciplinaryContent />
    </RBACGuard>
  );
}

function DisciplinaryContent() {
  const [cases] = useState<DisciplinaryCase[]>([
    { id: 'dc_1', caseNumber: 'DC-2026-004', employeeId: 'emp_006', employeeName: 'Rohit Verma', violationType: 'breach_of_policy', incidentDate: '2026-08-05', reportedBy: 'Shift Supervisor', severity: 'major', currentStage: 'inquiry_panel', createdAt: '2026-08-06' },
    { id: 'dc_2', caseNumber: 'DC-2026-003', employeeId: 'emp_007', employeeName: 'Suresh Patil', violationType: 'absenteeism', incidentDate: '2026-07-28', reportedBy: 'Plant Manager', severity: 'minor', currentStage: 'closed', actionTaken: 'written_warning', createdAt: '2026-07-29' },
  ]);

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

        <Button className="gap-2 shadow-sm text-xs bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4" />
          <span>Issue Show Cause Notice</span>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-amber-500/20 bg-amber-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Inquiry Panels</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">1 Case</div>
            <p className="text-xs text-slate-500">Scheduled for domestic enquiry hearing</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">CAPA Implemented</span>
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">3 Cases</div>
            <p className="text-xs text-slate-500">Corrective and preventive actions closed</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Zero Recurrence Rate</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">98.4%</div>
            <p className="text-xs text-slate-500">Post-counseling operational adherence</p>
          </CardContent>
        </Card>
      </div>

      {/* Disciplinary Register */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-rose-600" />
            <span>Standing Orders Disciplinary Log & CAPA Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Case Number</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Violation Type</th>
                  <th className="py-3 px-4">Incident Date</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {c.employeeName}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {c.violationType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(c.incidentDate)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={c.severity === 'severe' ? 'destructive' : c.severity === 'major' ? 'warning' : 'outline'}>
                        {c.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 capitalize font-medium">
                      <Badge variant={c.currentStage === 'closed' ? 'success' : 'secondary'}>
                        {c.currentStage.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        View Notice
                      </Button>
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
