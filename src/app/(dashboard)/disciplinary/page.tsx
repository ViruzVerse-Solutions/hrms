'use client';

import React from 'react';
import { MOCK_DISCIPLINARY } from '@/lib/mock-data';
import {
  AlertOctagon,
  Shield,
  FileWarning,
  CheckCircle2,
  Lock,
  Plus,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function DisciplinaryPage() {
  return (
    <RBACGuard module="disciplinary_actions">
      <DisciplinaryContent />
    </RBACGuard>
  );
}

function DisciplinaryContent() {
  const { currentRole } = useAuth();
  const hasConfidentialAccess = ['super_admin', 'hr_admin'].includes(currentRole);

  if (!hasConfidentialAccess) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20">
          <CardContent className="p-12 text-center space-y-3">
            <Lock className="h-10 w-10 text-amber-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Confidential Module</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Disciplinary proceedings and inquiry records are strictly restricted to HR Administration and Super Admins for legal defensibility.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Disciplinary Actions & Corrective Action (CAPA)</span>
            <Badge variant="destructive" className="text-xs">
              Confidential Register
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fair process case management, show-cause notices, inquiry panels, and CAPA follow-up logs
          </p>
        </div>

        <Button size="sm" className="gap-2 shadow-sm text-xs">
          <Plus className="h-4 w-4" />
          <span>Issue Show-Cause Notice</span>
        </Button>
      </div>

      {/* Case Register */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Documented Infraction Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MOCK_DISCIPLINARY.map((caseItem) => (
            <div
              key={caseItem.id}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {caseItem.caseNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {caseItem.employeeName}
                  </Badge>
                  <Badge variant="warning" className="text-[10px] uppercase">
                    {caseItem.severity}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {caseItem.currentStage.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Infraction: {caseItem.violationType.toUpperCase()}
                </div>
                <div className="text-slate-500">
                  Reported by: {caseItem.reportedBy} • Incident Date: {formatDate(caseItem.incidentDate)}
                </div>
              </div>

              {caseItem.actionTaken && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <strong className="block font-semibold">CAPA Order / Decision:</strong>
                  Formal Written Warning issued with 60-day attendance monitoring period.
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
