'use client';

import React, { useState } from 'react';
import { MOCK_RESIGNATIONS } from '@/lib/mock-data';
import {
  LogOut,
  CheckCircle2,
  Clock,
  Laptop,
  Building,
  CreditCard,
  FileCheck,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function ResignationPage() {
  return (
    <RBACGuard module="resignation_exit">
      <ResignationContent />
    </RBACGuard>
  );
}

function ResignationContent() {
  const exitCase = MOCK_RESIGNATIONS[0];
  const [relievingModalOpen, setRelievingModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Resignation, Multi-Dept Clearance & Exit Closure</span>
            <Badge variant="warning" className="text-xs">
              Full & Final Flow
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Notice period tracking, digital 4-department sign-offs, F&F calculation, and service certificates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setRelievingModalOpen(true)}
            className="gap-2 bg-indigo-600 shadow-md text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Generate Relieving Letter</span>
          </Button>
        </div>
      </div>

      {/* Active Resignation Hero */}
      {exitCase && (
        <div className="space-y-6">
          <Card className="border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {exitCase.employeeName}
                  </h3>
                  <Badge variant="warning" className="text-[10px] capitalize">
                    {exitCase.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Resignation Date: {formatDate(exitCase.resignationDate)} • Last Working Day (LWD): {formatDate(exitCase.approvedLwd)} ({exitCase.noticePeriodDays} Days Notice)
                </p>
                <p className="text-xs text-slate-400 italic">
                  Reason: "{exitCase.reason}"
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400">F&F Settlement Total</span>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {formatCurrency(exitCase.ffSettlement?.totalNetSettlement)}
                </div>
                <div className="text-xs text-slate-400">Ready for payroll release</div>
              </div>
            </CardContent>
          </Card>

          {/* 4-Department Clearance Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">4-Department Digital Clearance Sign-offs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                {/* IT Clearance */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Laptop className="h-4 w-4 text-indigo-600" />
                      IT & Assets
                    </span>
                    <Badge variant={exitCase.clearances.it.status === 'cleared' ? 'success' : 'warning'} className="text-[10px]">
                      {exitCase.clearances.it.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px]">{exitCase.clearances.it.notes || 'Hardware & Access'}</p>
                </div>

                {/* Admin Clearance */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-purple-600" />
                      Admin & Facilities
                    </span>
                    <Badge variant={exitCase.clearances.admin.status === 'cleared' ? 'success' : 'warning'} className="text-[10px]">
                      {exitCase.clearances.admin.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px]">{exitCase.clearances.admin.notes || 'Locker & ID card'}</p>
                </div>

                {/* Finance Clearance */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      Finance & Claims
                    </span>
                    <Badge variant={exitCase.clearances.finance.status === 'cleared' ? 'success' : 'warning'} className="text-[10px]">
                      {exitCase.clearances.finance.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px]">{exitCase.clearances.finance.notes || 'Travel claim review'}</p>
                </div>

                {/* HR Clearance */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-blue-600" />
                      HR & Exit Interview
                    </span>
                    <Badge variant={exitCase.clearances.hr.status === 'cleared' ? 'success' : 'warning'} className="text-[10px]">
                      {exitCase.clearances.hr.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px]">{exitCase.clearances.hr.notes || 'Interview scheduled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full & Final Settlement Details */}
          {exitCase.ffSettlement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Full & Final (F&F) Settlement Calculation Sheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-600 uppercase text-[11px]">Payable Components</h4>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Pro-rated Days Salary (20 Days)</span>
                      <span className="font-mono font-semibold">{formatCurrency(exitCase.ffSettlement.pendingSalary)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Leave Encashment (11 Days EL)</span>
                      <span className="font-mono font-semibold">{formatCurrency(exitCase.ffSettlement.leaveEncashment)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Gratuity / Statutory Dues</span>
                      <span className="font-mono font-semibold">{formatCurrency(exitCase.ffSettlement.bonusGratuity)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-rose-600 uppercase text-[11px]">Recoveries & Deductions</h4>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Notice Period Shortfall</span>
                      <span className="font-mono font-semibold text-rose-600">₹0 (30 Days Served)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Asset / Loan Deductions</span>
                      <span className="font-mono font-semibold text-rose-600">₹0</span>
                    </div>
                    <div className="flex justify-between py-2 bg-emerald-500/10 rounded-xl px-3 font-bold text-emerald-600">
                      <span>Net Settlement Payout</span>
                      <span className="font-mono">{formatCurrency(exitCase.ffSettlement.totalNetSettlement)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Relieving Letter Modal */}
      <Dialog open={relievingModalOpen} onOpenChange={setRelievingModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Official Relieving & Service Certificate</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-4 text-xs font-serif leading-relaxed text-slate-800 dark:text-slate-200">
            <div className="text-center pb-3 border-b">
              <h2 className="text-base font-bold font-sans">VIRUZVERSE SOLUTIONS PRIVATE LIMITED</h2>
              <p className="text-[11px] font-sans text-slate-500">Tech Operations Center, India</p>
            </div>

            <div className="text-right font-sans text-slate-500 text-[11px]">
              Date: 20th August 2026
            </div>

            <h3 className="text-center font-bold text-sm font-sans tracking-wide">
              TO WHOMSOEVER IT MAY CONCERN
            </h3>

            <p>
              This is to certify that <strong>Sneha Kulkarni</strong> was employed with Viruzverse Solutions as a <strong>Quality Control Specialist</strong> from 15th January 2023 to 20th August 2026.
            </p>

            <p>
              During her tenure, she has demonstrated exceptional diligence, procedural adherence, and operational integrity. All plant tooling, clearances, and handover checklists have been satisfactorily completed.
            </p>

            <p>
              We wish her continued success in her future academic and professional endeavors.
            </p>

            <div className="pt-6 font-sans">
              <div className="font-bold">Eleanor Vance</div>
              <div className="text-slate-500">Vice President — People & Culture</div>
              <div className="text-[10px] text-slate-400 mt-1">Digitally Signed & Certified • Tamper Proof Record</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
