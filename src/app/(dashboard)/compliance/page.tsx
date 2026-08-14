'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  BookOpen,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { PolicyDocument } from '@/types';

export default function CompliancePage() {
  return (
    <RBACGuard module="policy_compliance">
      <ComplianceContent />
    </RBACGuard>
  );
}

function ComplianceContent() {
  const [policies] = useState<PolicyDocument[]>([
    { id: 'pol_1', title: 'Plant Health & Safety Policy (EHS)', category: 'code_of_conduct', version: 'v3.2', effectiveDate: '2026-01-01', acknowledgedCount: 104, totalEmployees: 110, fileUrl: '#' },
    { id: 'pol_2', title: 'Code of Business Conduct & Ethics', category: 'code_of_conduct', version: 'v2.1', effectiveDate: '2025-06-01', acknowledgedCount: 110, totalEmployees: 110, fileUrl: '#' },
    { id: 'pol_3', title: 'POSH & Anti-Harassment Guidelines', category: 'posh', version: 'v4.0', effectiveDate: '2026-02-15', acknowledgedCount: 108, totalEmployees: 110, fileUrl: '#' },
    { id: 'pol_4', title: 'Industrial Shift & Overtime Regulations', category: 'leave_attendance', version: 'v1.4', effectiveDate: '2025-11-01', acknowledgedCount: 95, totalEmployees: 110, fileUrl: '#' },
  ]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>HR Policy Repository & Statutory Compliance</span>
            <Badge variant="success" className="text-xs">
              Audit Ready
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Company policies, digital acknowledgements, statutory registers, and labor audit compliance
          </p>
        </div>

        <Button className="gap-2 shadow-sm text-xs">
          <Plus className="h-4 w-4" />
          <span>Publish Policy Document</span>
        </Button>
      </div>

      {/* Statutory Register Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Statutory Form T</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Form T Attendance Register</div>
            <p className="text-xs text-slate-500">Automated daily generation compliant with Factories & Shops Act</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <Download className="h-3.5 w-3.5" />
              <span>Export Monthly Register</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Form B (Wage Register)</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Equal Remuneration & Wages</div>
            <p className="text-xs text-slate-500">Payment of Wages & Minimum Wages statutory filing format</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <Download className="h-3.5 w-3.5" />
              <span>Export Wage Sheet</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">POSH IC Committee</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Internal Complaints Committee</div>
            <p className="text-xs text-slate-500">Annual statutory POSH compliance report & committee constitution</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>View Constitution</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Published Policy Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Active Enterprise Policies & Digital Acknowledgement Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Policy Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Acknowledgement Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {policies.map((policy) => {
                  const ackPercentage = Math.round((policy.acknowledgedCount / policy.totalEmployees) * 100);
                  return (
                    <tr key={policy.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {policy.title}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <Badge variant="outline">{policy.category.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{policy.version}</td>
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(policy.effectiveDate)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden w-24">
                            <div
                              className={`h-full rounded-full ${
                                ackPercentage >= 95 ? 'bg-emerald-500' : ackPercentage >= 80 ? 'bg-indigo-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${ackPercentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700">{ackPercentage}%</span>
                          <span className="text-[10px] text-slate-400">({policy.acknowledgedCount}/{policy.totalEmployees})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
