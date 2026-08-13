'use client';

import React from 'react';
import { MOCK_TRANSFERS, MOCK_EMPLOYEES } from '@/lib/mock-data';
import {
  GitPullRequest,
  Users,
  ArrowRight,
  Building,
  CheckCircle2,
  Plus,
  Network,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MovementPage() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Transfers, Promotions & Org Hierarchy</span>
            <Badge variant="purple" className="text-xs">
              Org Tree
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Department transfers, grade elevations, organizational structure, and reporting lines
          </p>
        </div>

        <Button className="gap-2 shadow-sm text-xs">
          <Plus className="h-4 w-4" />
          <span>Initiate Promotion / Transfer</span>
        </Button>
      </div>

      {/* Active Transfer Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Pending Internal Movements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MOCK_TRANSFERS.map((tp) => (
            <div key={tp.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{tp.employeeName}</span>
                  <Badge variant="purple" className="text-[10px] uppercase font-bold">
                    {tp.type}
                  </Badge>
                </div>
                <Badge variant="warning" className="text-[10px] capitalize">
                  {tp.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Current Role & Location</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{tp.currentDesignation}</div>
                  <div className="text-slate-500">{tp.currentDepartment} • {tp.currentBranch}</div>
                </div>

                <div>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase">Proposed Elevation</span>
                  <div className="font-bold text-emerald-600 mt-0.5">{tp.newDesignation}</div>
                  <div className="text-slate-500">{tp.newDepartment} • {tp.newBranch}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-400 pt-1 text-[11px]">
                <span>Effective Date: {formatDate(tp.effectiveDate)}</span>
                <span>Initiated By: {tp.initiatedBy}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Interactive Org Chart Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Network className="h-4 w-4 text-indigo-600" />
            <span>Interactive Leadership & Team Reporting Tree</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Level 1: Leadership */}
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg text-center w-72">
              <div className="font-bold text-sm">Alexander Sterling</div>
              <div className="text-xs text-indigo-100">Chief Executive Officer</div>
            </div>
            <div className="h-6 w-0.5 bg-indigo-300 dark:bg-indigo-700" />
          </div>

          {/* Level 2: Heads of Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 text-center shadow-sm">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Eleanor Vance</div>
              <div className="text-xs text-indigo-600 font-medium">VP of People & Culture</div>
              <div className="text-[10px] text-slate-400 mt-1">8 HR Team Members</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 text-center shadow-sm">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Dr. Vikramaditya Rathore</div>
              <div className="text-xs text-indigo-600 font-medium">VP of Engineering</div>
              <div className="text-[10px] text-slate-400 mt-1">42 Engineering Staff</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 text-center shadow-sm">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Marcus Chen</div>
              <div className="text-xs text-indigo-600 font-medium">Finance & Payroll Lead</div>
              <div className="text-[10px] text-slate-400 mt-1">12 Accounts Staff</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
