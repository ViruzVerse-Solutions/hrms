'use client';

import React, { useState } from 'react';
import {
  GitPullRequest,
  Users,
  Building,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { TransferPromotionCase } from '@/types';

export default function MovementPage() {
  return (
    <RBACGuard module="transfer_promotion">
      <MovementContent />
    </RBACGuard>
  );
}

function MovementContent() {
  const [transfers] = useState<TransferPromotionCase[]>([
    { id: 'tp_1', employeeId: 'emp_005', employeeName: 'Ananya Deshmukh', type: 'promotion', currentDepartment: 'Quality Assurance', newDepartment: 'Quality Assurance', currentDesignation: 'QC Chemist (L3)', newDesignation: 'Senior QC Chemist (L4)', currentBranch: 'Bengaluru HQ', newBranch: 'Bengaluru HQ', effectiveDate: '2026-09-01', initiatedBy: 'Dr. Vikramaditya Rathore', status: 'approved', approvalChain: ['Dr. Vikramaditya Rathore', 'Eleanor Vance'] },
  ]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Inter-Plant Transfers & Grade Promotions</span>
            <Badge variant="outline" className="text-xs">
              Mobility Engine
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plant-to-plant relocation, department reorganization, job role enhancements, and salary structure updates
          </p>
        </div>

        <Button className="gap-2 shadow-sm text-xs">
          <Plus className="h-4 w-4" />
          <span>Initiate Transfer / Promotion</span>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-indigo-500/20 bg-indigo-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Upcoming Promotions</span>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">1 Approved</div>
            <p className="text-xs text-slate-500">Effective from September 1, 2026</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Inter-Plant Transfers</span>
              <Building className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">0 Active</div>
            <p className="text-xs text-slate-500">All plant staffing stabilized</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Workforce Retained</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">96.8%</div>
            <p className="text-xs text-slate-500">Quarterly internal mobility index</p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-indigo-600" />
            <span>Active Movement & Grade Upgrades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Current &rarr; Proposed Role</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Approval Chain</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transfers.map((tp) => (
                  <tr key={tp.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {tp.employeeName}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <Badge variant={tp.type === 'promotion' ? 'success' : 'purple'}>
                        {tp.type}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{tp.newDesignation}</div>
                      <div className="text-[11px] text-slate-500">was {tp.currentDesignation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(tp.effectiveDate)}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-700">
                        {tp.approvalChain.join(' &rarr; ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success">Approved</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        View Letter
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
