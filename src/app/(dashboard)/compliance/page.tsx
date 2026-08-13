'use client';

import React from 'react';
import { MOCK_POLICIES } from '@/lib/mock-data';
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

export default function CompliancePage() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>HR Policy Repository & Statutory Compliance</span>
            <Badge variant="success" className="text-xs">
              Audit Ready
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
        <Card className="border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Statutory Form T</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900 dark:text-white">Form T Attendance Register</div>
            <p className="text-xs text-slate-500">Automated daily generation compliant with Factories & Shops Act</p>
            <Button size="sm" variant="outline" className="w-full text-xs mt-2">Download Register</Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Wages Register</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900 dark:text-white">Form B Wage & Salary Register</div>
            <p className="text-xs text-slate-500">Includes complete CTC, statutory deductions & net disbursal proof</p>
            <Button size="sm" variant="outline" className="w-full text-xs mt-2">Download Register</Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Labor Inspection</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900 dark:text-white">Statutory Readiness Checklist</div>
            <p className="text-xs text-slate-500">100% compliant across minimum wage, working hours & safety</p>
            <Button size="sm" variant="outline" className="w-full text-xs mt-2">View Checklist</Button>
          </CardContent>
        </Card>
      </div>

      {/* Policy Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Company Policy Repository & Sign-offs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MOCK_POLICIES.map((pol) => {
            const ackPercent = Math.round((pol.acknowledgedCount / pol.totalEmployees) * 100);

            return (
              <div key={pol.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{pol.title}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{pol.version}</Badge>
                  </div>
                  <div className="text-slate-400">Effective: {formatDate(pol.effectiveDate)}</div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="space-y-1 w-48">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span>Acknowledged</span>
                      <span className="text-emerald-600">{ackPercent}% ({pol.acknowledgedCount}/{pol.totalEmployees})</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ackPercent}%` }} />
                    </div>
                  </div>

                  <Button size="sm" variant="ghost" className="gap-1 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
