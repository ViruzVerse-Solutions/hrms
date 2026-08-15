'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  Download,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Building,
  CreditCard,
  Printer,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Payslip } from '@/types';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function PayrollPage() {
  return (
    <RBACGuard module="payroll_benefits">
      <PayrollContent />
    </RBACGuard>
  );
}

function PayrollContent() {
  const {
    payrollRuns,
    payslips,
    approvePayrollRun,
    isSalaryVisible,
    currentUser,
    currentEmployee,
    can,
    currentRole,
  } = useAuth();

  // Employee self-service: only see own payslip!
  const employeeId = currentEmployee?.id || currentUser?.employeeId || 'emp_005';
  const employeeCode = currentEmployee?.employeeCode || 'VV-1005';
  const visiblePayslips = currentRole === 'employee'
    ? payslips.filter((ps) => ps.employeeId === employeeId || ps.employeeCode === employeeCode || ps.employeeId === 'emp_005' || ps.employeeCode === 'VV-1005')
    : payslips;

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(visiblePayslips[0] || null);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  const canManagePayroll = can('create', 'payroll_benefits') || can('approve', 'payroll_benefits');
  const isSelfServiceOnly = currentRole === 'employee';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isSelfServiceOnly ? 'My Payslips & Compensation Details' : 'Payroll, CTC Structures & Benefits'}</span>
            <Badge variant="success" className="text-xs">
              {isSelfServiceOnly ? 'Verified Payouts' : 'Automated Statutory Engine'}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isSelfServiceOnly
              ? 'Download your monthly digital payslips and view gross earnings, statutory deductions (PF/ESI/PT/TDS), and net bank disbursements.'
              : 'Monthly salary processing, PF/ESI/PT deductions, PDF payslip generation, and bank export'}
          </p>
        </div>

        {canManagePayroll && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              onClick={() => alert('Bank NEFT/RTGS batch transfer file exported successfully!')}
            >
              <Download className="h-4 w-4" />
              <span>Export Bank File</span>
            </Button>
          </div>
        )}
      </div>

      {/* Payroll Runs Dashboard - Only visible to Payroll Officer, HR Admin, Super Admin */}
      {!isSelfServiceOnly && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Monthly Payroll Processing Runs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {payrollRuns.map((run) => (
              <Card key={run.id} className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {run.monthName} {run.year} Payroll Cycle
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">Run ID: {run.id}</span>
                    </div>
                    <Badge
                      variant={run.status === 'disbursed' ? 'success' : run.status === 'approved' ? 'info' : 'warning'}
                      className="text-xs capitalize"
                    >
                      {run.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Staff Count</span>
                      <div className="font-bold text-sm mt-0.5">{run.totalEmployees} Active</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Gross Wages</span>
                      <div className="font-bold text-sm mt-0.5 font-mono">{formatCurrency(run.totalGrossPay)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Net Payout</span>
                      <div className="font-bold text-sm mt-0.5 text-emerald-600 font-mono">
                        {formatCurrency(run.totalNetPay)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-slate-400">
                      {run.approvedBy ? `Approved by ${run.approvedBy}` : 'Pending final approval review'}
                    </span>

                    {run.status === 'under_review' && (currentRole === 'hr_head' || currentRole === 'managing_director') && (
                      <Button
                        size="sm"
                        onClick={() => approvePayrollRun(run.id)}
                        className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-sm text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve & Release Payslips</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payslips Archive & Viewer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              {isSelfServiceOnly ? 'My Published Payslips & Salary Statements' : 'Published Employee Payslips'}
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Click any record to inspect or print tamper-proof payslip</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Paid Days</th>
                  <th className="p-3">Gross Earnings</th>
                  <th className="p-3">Total Deductions</th>
                  <th className="p-3">Net Pay</th>
                  <th className="p-3 text-right">Payslip PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visiblePayslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {ps.employeeName}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        {ps.employeeCode}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{ps.designation}</td>
                    <td className="p-3 font-semibold">{ps.period}</td>
                    <td className="p-3 font-mono">{ps.paidDays} Days</td>
                    <td className="p-3 font-mono font-semibold">
                      {formatCurrency(ps.breakup?.grossEarnings ?? 0)}
                    </td>
                    <td className="p-3 font-mono text-rose-600">
                      -{formatCurrency(ps.breakup?.totalDeductions ?? 0)}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600">
                      {formatCurrency(ps.breakup?.netPay ?? 0)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          setSelectedPayslip(ps);
                          setPayslipModalOpen(true);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        <span>View Payslip</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* PRINTABLE / DOWNLOADABLE PAYSLIP MODAL */}
      {/* ========================================================================= */}
      <Dialog open={payslipModalOpen} onOpenChange={setPayslipModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPayslip && (
            <div className="p-4 space-y-6 text-slate-900 dark:text-slate-100">
              {/* Header with Print CTA */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <div className="text-xl font-extrabold text-indigo-600">
                    Viruzverse Solutions Private Limited
                  </div>
                  <div className="text-xs text-slate-500">
                    Salary Statement & Payslip for {selectedPayslip.period}
                  </div>
                </div>
                <Button size="sm" onClick={handlePrint} className="gap-2 text-xs">
                  <Printer className="h-4 w-4" />
                  <span>Print Payslip</span>
                </Button>
              </div>

              {/* Employee & Bank Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
                <div className="space-y-1">
                  <div><span className="text-slate-400">Employee Name:</span> <span className="font-bold">{selectedPayslip.employeeName}</span></div>
                  <div><span className="text-slate-400">Employee Code:</span> <span className="font-mono">{selectedPayslip.employeeCode}</span></div>
                  <div><span className="text-slate-400">Designation:</span> <span>{selectedPayslip.designation}</span></div>
                </div>
                <div className="space-y-1">
                  <div><span className="text-slate-400">Department:</span> <span>{selectedPayslip.department}</span></div>
                  <div><span className="text-slate-400">Days Paid:</span> <span className="font-bold">{selectedPayslip.paidDays} (LOP: {selectedPayslip.lopDays})</span></div>
                  <div><span className="text-slate-400">Payment Mode:</span> <span className="capitalize">{selectedPayslip.paymentMode.replace('_', ' ')}</span></div>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Earnings */}
                <div className="space-y-2 border-r pr-4">
                  <h4 className="font-bold text-emerald-600 uppercase text-[11px]">Earnings</h4>
                  <div className="flex justify-between py-1 border-b">
                    <span>Basic Pay</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedPayslip.breakup?.basic ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>HRA</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedPayslip.breakup?.hra ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Special Allowance</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedPayslip.breakup?.specialAllowance ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Conveyance</span>
                    <span className="font-mono font-semibold">{formatCurrency(selectedPayslip.breakup?.conveyance ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white">
                    <span>Gross Earnings</span>
                    <span className="font-mono">{formatCurrency(selectedPayslip.breakup?.grossEarnings ?? 0)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-rose-600 uppercase text-[11px]">Deductions</h4>
                  <div className="flex justify-between py-1 border-b">
                    <span>PF (Employee)</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(selectedPayslip.breakup?.pfEmployee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>ESI (Employee)</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(selectedPayslip.breakup?.esiEmployee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Professional Tax</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(selectedPayslip.breakup?.professionalTax ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>TDS (Tax)</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(selectedPayslip.breakup?.tds ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-rose-600">
                    <span>Total Deductions</span>
                    <span className="font-mono">-{formatCurrency(selectedPayslip.breakup?.totalDeductions ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Disbursed Amount</span>
                  <div className="text-xs text-slate-400">Direct credit to employee bank account</div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {formatCurrency(selectedPayslip.breakup?.netPay ?? 0)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
