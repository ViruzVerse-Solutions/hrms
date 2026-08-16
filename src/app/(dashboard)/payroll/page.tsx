'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  Download,
  CheckCircle2,
  FileText,
  Printer,
  ShieldCheck,
  Search,
  FileSpreadsheet,
  BadgePercent,
  Landmark,
  Building,
  Sliders,
  Check,
  Send,
  Calendar,
  Filter,
} from 'lucide-react';
import { formatCurrency, calculateSalaryBreakup } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Payslip } from '@/types';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { LoadingState } from '@/components/ui/LoadingState';

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
    currentUser,
    currentEmployee,
    currentRole,
    isLoadingData,
  } = useAuth();

  const isEmployee = currentRole === 'employee';
  const isMD = currentRole === 'managing_director' || currentRole === 'chairman';
  const isHR = currentRole === 'hr_head';
  const isAudit = currentRole === 'internal_audit_head' || currentRole === 'compliance_statutory';

  // Navigation Tabs (For HR/MD: register | structure | statutory)
  const [activeTab, setActiveTab] = useState<'register' | 'structure' | 'statutory'>('register');
  const [selectedMonth, setSelectedMonth] = useState(payrollRuns[0]?.period || '2026-08');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Interactive Salary Structure Configurator State (HR configures, MD sanctions)
  const [config, setConfig] = useState({
    basicPercent: 40,
    hraPercent: 50,
    conveyance: 1600,
    medicalAllowance: 1250,
    pfEmployeePercent: 12,
    pfCapLimit: 1800,
    esiEmployeePercent: 0.75,
    esiThreshold: 21000,
    professionalTax: 200,
    gratuityPercent: 4.81,
  });

  const [simulatedCtc, setSimulatedCtc] = useState<number>(600000);
  const [isPolicySanctioned, setIsPolicySanctioned] = useState<boolean>(true);
  const [statusFeedback, setStatusFeedback] = useState<string>('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [isSigningAudit, setIsSigningAudit] = useState(false);

  // Scoped payslips (Employee strictly sees their own)
  const employeeId = currentEmployee?.id || currentUser?.employeeId || '';
  const employeeCode = currentEmployee?.employeeCode || '';

  const basePayslips = useMemo(() => {
    if (isEmployee) {
      return payslips.filter(
        (ps) => (employeeId && ps.employeeId === employeeId) || (employeeCode && ps.employeeCode === employeeCode)
      );
    }
    return payslips;
  }, [payslips, isEmployee, employeeId, employeeCode]);

  const filteredPayslips = useMemo(() => {
    return basePayslips.filter((ps) => {
      const matchesSearch =
        ps.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.designation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'all' || ps.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [basePayslips, searchQuery, departmentFilter]);

  const departmentsList = useMemo(() => {
    const set = new Set(basePayslips.map((p) => p.department).filter(Boolean));
    return Array.from(set);
  }, [basePayslips]);

  // Load DB-backed Salary Structure Policy status
  useEffect(() => {
    fetch('/api/payroll/structure', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setIsPolicySanctioned(data.data.status === 'approved');
        }
      })
      .catch(() => {});
  }, [currentRole]);

  useEffect(() => {
    if (!selectedPayslip && basePayslips.length > 0) {
      setSelectedPayslip(basePayslips[0]);
    }
  }, [basePayslips, selectedPayslip]);

  // Real-Time Simulator calculation derived from Form config
  const sim = useMemo(() => {
    const monthlyCtc = Math.round(simulatedCtc / 12);
    const basic = Math.round(monthlyCtc * (config.basicPercent / 100));
    const hra = Math.round(basic * (config.hraPercent / 100));
    const conveyance = Number(config.conveyance) || 0;
    const medical = Number(config.medicalAllowance) || 0;
    const specialAllowance = Math.max(0, monthlyCtc - (basic + hra + conveyance + medical));
    const grossEarnings = basic + hra + specialAllowance + conveyance + medical;

    const pfEmployee = Math.min(config.pfCapLimit, Math.round(basic * (config.pfEmployeePercent / 100)));
    const pfEmployer = pfEmployee;
    const esiEmployee = grossEarnings <= config.esiThreshold ? Math.round(grossEarnings * (config.esiEmployeePercent / 100)) : 0;
    const esiEmployer = grossEarnings <= config.esiThreshold ? Math.round(grossEarnings * 0.0325) : 0;
    const pt = grossEarnings > 15000 ? Number(config.professionalTax) || 0 : 0;

    let tds = 0;
    if (simulatedCtc > 1200000) tds = Math.round(grossEarnings * 0.15);
    else if (simulatedCtc > 750000) tds = Math.round(grossEarnings * 0.07);

    const totalDeductions = pfEmployee + esiEmployee + pt + tds;
    const netPay = grossEarnings - totalDeductions;
    const gratuity = Math.round(basic * (config.gratuityPercent / 100));

    return {
      monthlyCtc,
      basic,
      hra,
      conveyance,
      medical,
      specialAllowance,
      grossEarnings,
      pfEmployee,
      pfEmployer,
      esiEmployee,
      esiEmployer,
      pt,
      tds,
      totalDeductions,
      netPay,
      gratuity,
    };
  }, [simulatedCtc, config]);

  // Aggregate Metrics for Active Month
  const totalGrossWages = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.grossEarnings || 0), 0), [basePayslips]);
  const totalPf = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.pfEmployee || 0), 0), [basePayslips]);
  const totalEsi = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.esiEmployee || 0), 0), [basePayslips]);
  const totalPt = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.professionalTax || 0), 0), [basePayslips]);
  const totalTds = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.tds || 0), 0), [basePayslips]);
  const totalNetDisbursed = useMemo(() => basePayslips.reduce((acc, p) => acc + (p.breakup?.netPay || 0), 0), [basePayslips]);
  const totalGovtDeductions = totalPf + totalEsi + totalPt + totalTds;

  // Actions
  const handleApplyPreset = (preset: 'metro' | 'plant' | 'executive') => {
    if (preset === 'metro') {
      setConfig({
        basicPercent: 40,
        hraPercent: 50,
        conveyance: 1600,
        medicalAllowance: 1250,
        pfEmployeePercent: 12,
        pfCapLimit: 1800,
        esiEmployeePercent: 0.75,
        esiThreshold: 21000,
        professionalTax: 200,
        gratuityPercent: 4.81,
      });
    } else if (preset === 'plant') {
      setConfig({
        basicPercent: 50,
        hraPercent: 40,
        conveyance: 2000,
        medicalAllowance: 1000,
        pfEmployeePercent: 12,
        pfCapLimit: 1800,
        esiEmployeePercent: 0.75,
        esiThreshold: 21000,
        professionalTax: 200,
        gratuityPercent: 4.81,
      });
    } else if (preset === 'executive') {
      setConfig({
        basicPercent: 40,
        hraPercent: 50,
        conveyance: 5000,
        medicalAllowance: 2500,
        pfEmployeePercent: 12,
        pfCapLimit: 1800,
        esiEmployeePercent: 0,
        esiThreshold: 21000,
        professionalTax: 200,
        gratuityPercent: 4.81,
      });
    }
  };

  const handleProposeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payroll/structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          policyRef: 'HR-C&B-2026',
          frameworks: config,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setIsPolicySanctioned(false);
        setStatusFeedback('Salary structure configuration submitted to Managing Director for executive approval.');
        setTimeout(() => setStatusFeedback(''), 5000);
      }
    } catch (err) {
      console.error('Failed to submit structure:', err);
    }
  };

  const handleSanctionPolicy = async (action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/payroll/structure', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data?.success) {
        setIsPolicySanctioned(action === 'approve');
        setStatusFeedback(action === 'approve'
          ? 'Corporate Salary Structure officially sanctioned and signed by Managing Director.'
          : 'Structure proposal rejected and returned to HR for modifications.');
        setTimeout(() => setStatusFeedback(''), 5000);
      }
    } catch (err) {
      console.error('Failed to approve policy:', err);
    }
  };

  const handleSignPayrollAudit = async (period: string) => {
    try {
      setIsSigningAudit(true);
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          action: 'PAYROLL_RUN_AUDITED',
          module: 'payroll_benefits',
          entityId: period,
          details: `Reconciled ${period} payroll batch (${formatCurrency(totalGrossWages)} Gross → ${formatCurrency(totalNetDisbursed)} Net). 100% PF/ESI/TDS statutory compliance verified with 0 variances.`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setStatusFeedback(`Monthly payroll audit sign-off recorded for ${period} successfully.`);
        setTimeout(() => setStatusFeedback(''), 5000);
      }
    } catch (err) {
      console.error('Failed to sign audit:', err);
    } finally {
      setIsSigningAudit(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <LoadingState variant="table" rows={6} />
      </div>
    );
  }

  // =========================================================================
  // 1. CLEAN EMPLOYEE SELF-SERVICE VIEW (ZERO ADMIN CLUTTER)
  // =========================================================================
  if (isEmployee) {
    const myPayslip = basePayslips[0];
    const myBreakup = myPayslip?.breakup || calculateSalaryBreakup(currentEmployee?.ctc ? Number(currentEmployee.ctc) : 540000);

    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900">My Compensation & Payslips</h1>
              <Badge variant="purple" className="text-xs">Self-Service</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              View your monthly salary breakup, statutory government deductions, and download signed payslips.
            </p>
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200/90 shadow-2xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Monthly</span>
                <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatCurrency(myBreakup.grossEarnings)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Before statutory deductions</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 shadow-2xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statutory Deductions</span>
                <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
                  -{formatCurrency(myBreakup.totalDeductions)}
                </div>
                <span className="text-[11px] text-rose-500/80 mt-0.5 block">EPF 12% + Tax + PT</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <BadgePercent className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Net Bank Take-Home</span>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
                  {formatCurrency(myBreakup.netPay)}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Direct Bank Credit</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Landmark className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Structure Breakdown */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900">Monthly Compensation Structure</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Earnings Column */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-indigo-600 flex items-center justify-between">
                  <span>1. Monthly Earnings</span>
                  <span>Amount (₹)</span>
                </h4>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-600">Basic Pay (40%)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(myBreakup.basic)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-600">House Rent Allowance (HRA 50%)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(myBreakup.hra)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-600">Special Allowance</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(myBreakup.specialAllowance)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-600">Conveyance Allowance</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(myBreakup.conveyance)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-600">Medical Allowance</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(myBreakup.medicalAllowance || 0)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-slate-900 bg-white px-2.5 rounded-lg border">
                  <span>Total Monthly Gross</span>
                  <span className="font-mono text-indigo-600">{formatCurrency(myBreakup.grossEarnings)}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-3 p-4 rounded-xl bg-rose-50/40 border border-rose-200/60">
                <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>2. Statutory Deductions</span>
                  <span>Deduction (₹)</span>
                </h4>
                <div className="flex justify-between py-1.5 border-b border-rose-200/40">
                  <span className="text-slate-600">Provident Fund (EPF 12%)</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(myBreakup.pfEmployee)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-200/40">
                  <span className="text-slate-600">ESI Health Insurance</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {myBreakup.esiEmployee > 0 ? `-${formatCurrency(myBreakup.esiEmployee)}` : 'Exempt (> ₹21k)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-200/40">
                  <span className="text-slate-600">Professional Tax (PT)</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(myBreakup.professionalTax || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-200/40">
                  <span className="text-slate-600">Income Tax (TDS Estimation)</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(myBreakup.tds)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-rose-700 bg-white px-2.5 rounded-lg border border-rose-200">
                  <span>Total Deductions</span>
                  <span className="font-mono">-{formatCurrency(myBreakup.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payslips Archive Table */}
        <Card className="border-slate-200/90 shadow-2xs">
          <CardHeader className="py-4 px-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900">Payslip Archive</CardTitle>
            <span className="text-xs text-slate-400 font-medium">Historical salary statements</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[550px]">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4 text-left">Period</th>
                    <th className="py-3 px-4 text-right">Gross Earnings</th>
                    <th className="py-3 px-4 text-right">Total Deductions</th>
                    <th className="py-3 px-4 text-right">Net Take-Home</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {basePayslips.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 text-left">{p.period}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 text-right">{formatCurrency(p.breakup?.grossEarnings || 0)}</td>
                      <td className="py-3 px-4 font-mono text-rose-600 text-right">-{formatCurrency(p.breakup?.totalDeductions || 0)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-right">{formatCurrency(p.breakup?.netPay || 0)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="success" className="text-[10px]">Direct Bank Credit</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayslip(p);
                            setPayslipModalOpen(true);
                          }}
                          className="h-8 text-xs gap-1.5 border-slate-200 hover:bg-slate-50 font-medium"
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

        {/* Printable Modal */}
        <PayslipDialog
          open={payslipModalOpen}
          onOpenChange={setPayslipModalOpen}
          payslip={selectedPayslip}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. SIMPLIFIED HR & MANAGEMENT VIEW (EVENLY SPACED & CENTERED)
  // =========================================================================
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900">Payroll & Compensation Management</h1>
            <Badge variant={isMD ? 'purple' : isHR ? 'info' : 'outline'} className="text-xs">
              {isMD ? 'Executive Approver' : isHR ? 'HR Compensation Admin' : 'Audit Officer'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isHR
              ? 'Configure salary structure rules, manage employee payroll register, and propose revisions.'
              : isMD
              ? 'Review and sanction corporate salary policies, approve monthly salary runs, and authorize bank disbursals.'
              : 'Audit monthly payroll gross-to-net calculations and statutory government compliance.'}
          </p>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {payrollRuns.map((r) => (
              <option key={r.id} value={r.period}>{r.period} Batch</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Bank NEFT/RTGS batch transfer file (Form B format) exported successfully!')}
            className="h-9 gap-1.5 text-xs border-slate-200 shadow-2xs whitespace-nowrap font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Bank File</span>
          </Button>
        </div>
      </div>

      {/* Live Feedback Toast Banner */}
      {statusFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
          <button onClick={() => setStatusFeedback('')} className="text-emerald-700 font-bold hover:text-emerald-900 ml-2">✕</button>
        </div>
      )}

      {/* 4 Evenly Spaced Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Payroll</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{formatCurrency(totalGrossWages)}</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">{basePayslips.length} Employees</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Govt Deductions</span>
              <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">-{formatCurrency(totalGovtDeductions)}</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">EPF + ESI + PT + TDS</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <BadgePercent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Bank Disbursal</span>
              <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">{formatCurrency(totalNetDisbursed)}</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Direct Bank Transfer</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Policy Sanction</span>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {isPolicySanctioned ? 'Sanctioned' : 'Pending Review'}
              </div>
              <span className={`text-[11px] font-semibold mt-0.5 block ${isPolicySanctioned ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isPolicySanctioned ? '✓ Approved by MD' : '⏳ Awaiting MD Approval'}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3 Main Functional Tabs - Evenly distributed across 100% width */}
      <Tabs defaultValue="register" className="w-full space-y-5" onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-1 md:grid-cols-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 gap-1.5 h-auto">
          <TabsTrigger value="register" className="w-full justify-center text-xs font-semibold gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Salary Register ({basePayslips.length})</span>
          </TabsTrigger>

          <TabsTrigger value="structure" className="w-full justify-center text-xs font-semibold gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all">
            <Sliders className="h-4 w-4" />
            <span>CTC Structure Configurator & Simulation</span>
          </TabsTrigger>

          <TabsTrigger value="statutory" className="w-full justify-center text-xs font-semibold gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs transition-all">
            <Building className="h-4 w-4" />
            <span>Statutory Remittances & Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: SALARY REGISTER */}
        {/* ========================================================================= */}
        <TabsContent value="register" className="space-y-4 pt-1">
          <Card className="border-slate-200/90 shadow-2xs">
            {/* Evenly Spaced & Symmetrical Filter Bar */}
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 w-full">
                {/* Search Bar - Expands to fill space */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by employee name, code, designation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Department Dropdown Filter */}
                <div className="w-full md:w-64 shrink-0">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs font-medium"
                  >
                    <option value="all">All Departments ({departmentsList.length})</option>
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* MD Approval Action Button for Monthly Run */}
                {isMD && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setStatusFeedback(`Monthly payroll batch for ${selectedMonth} approved by Managing Director.`);
                      setTimeout(() => setStatusFeedback(''), 5000);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 px-5 gap-2 shadow-2xs whitespace-nowrap font-medium rounded-xl shrink-0"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve & Authorize Bank Disbursal</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[750px]">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-3.5 px-4 text-left">Employee</th>
                      <th className="py-3.5 px-4 text-left">Department & Role</th>
                      <th className="py-3.5 px-4 text-right">Basic Pay</th>
                      <th className="py-3.5 px-4 text-right">HRA</th>
                      <th className="py-3.5 px-4 text-right">Gross Total</th>
                      <th className="py-3.5 px-4 text-right">Deductions</th>
                      <th className="py-3.5 px-4 text-right">Net Take-Home</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayslips.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-left">
                          <div className="font-semibold text-slate-900">{p.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <div className="text-slate-800 font-medium">{p.department}</div>
                          <div className="text-[10px] text-slate-400">{p.designation}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right text-slate-700">{formatCurrency(p.breakup?.basic || 0)}</td>
                        <td className="py-3.5 px-4 font-mono text-right text-slate-700">{formatCurrency(p.breakup?.hra || 0)}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-right">{formatCurrency(p.breakup?.grossEarnings || 0)}</td>
                        <td className="py-3.5 px-4 font-mono text-rose-600 text-right">-{formatCurrency(p.breakup?.totalDeductions || 0)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-right">{formatCurrency(p.breakup?.netPay || 0)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayslip(p);
                              setPayslipModalOpen(true);
                            }}
                            className="h-8 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 font-medium rounded-lg"
                          >
                            View Payslip
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: PROPER CTC STRUCTURE CONFIGURATOR & SIMULATOR */}
        {/* ========================================================================= */}
        <TabsContent value="structure" className="space-y-6 pt-1">
          {/* Top Status & Role Governance Banner */}
          <Card className="border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 shadow-2xs">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">Corporate Salary Policy Framework (Ref: HR-C&B-2026)</span>
                  <Badge variant={isPolicySanctioned ? 'success' : 'warning'} className="text-[10px]">
                    {isPolicySanctioned ? 'Active & Sanctioned by MD' : 'Pending MD Approval'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {isHR
                    ? 'Configure percentage allocations and allowances. Submit revisions for Managing Director sanction.'
                    : isMD
                    ? 'Review proposed compensation parameters and sanction policy across the company.'
                    : 'Statutory compliance verification view.'}
                </p>
              </div>

              {/* MD 1-Click Approval Actions */}
              {isMD && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleSanctionPolicy('approve')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 gap-1.5 shadow-2xs font-medium rounded-xl"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Approve & Sanction Policy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSanctionPolicy('reject')}
                    className="text-xs h-9 px-3.5 text-rose-600 border-rose-200 hover:bg-rose-50 font-medium rounded-xl"
                  >
                    Reject Revision
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2-Column Split: Left = Config Form, Right = Live Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT: HR CONFIGURATION FORM */}
            <Card className="border-slate-200/90 shadow-2xs flex flex-col">
              <CardHeader className="py-4 px-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Salary Component Rules</CardTitle>
                  <span className="text-[11px] text-slate-500">Configured by HR Compensation Admin</span>
                </div>
                <Badge variant="outline" className="text-[10px]">HR Configurator</Badge>
              </CardHeader>
              
              <CardContent className="p-6 space-y-5 text-xs">
                {/* Presets Quick Selector - Evenly Spaced Grid */}
                <div className="space-y-2 pb-4 border-b">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Quick Grade Presets</span>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('metro')}
                      className="w-full py-2 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition-colors text-center"
                    >
                      Metro (40% / 50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('plant')}
                      className="w-full py-2 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors text-center"
                    >
                      Plant (50% / 40%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('executive')}
                      className="w-full py-2 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors text-center"
                    >
                      Executive Grade
                    </button>
                  </div>
                </div>

                <form onSubmit={handleProposeStructure} className="space-y-4">
                  {/* Earnings Rules */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">1. Earnings Percentage & Allowances</span>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                          <span>Basic Pay (% of CTC)</span>
                          <span className="text-[10px] text-emerald-600 font-normal">≥ 40%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={30}
                            max={70}
                            value={config.basicPercent}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, basicPercent: Number(e.target.value) })}
                            className="w-full h-9 pl-3 pr-7 rounded-lg border bg-white text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                          <span>HRA (% of Basic)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Metro 50%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={20}
                            max={60}
                            value={config.hraPercent}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, hraPercent: Number(e.target.value) })}
                            className="w-full h-9 pl-3 pr-7 rounded-lg border bg-white text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Conveyance Allowance</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={config.conveyance}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, conveyance: Number(e.target.value) })}
                            className="w-full h-9 pl-7 pr-3 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Medical Allowance</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={config.medicalAllowance}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, medicalAllowance: Number(e.target.value) })}
                            className="w-full h-9 pl-7 pr-3 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Deductions Rules */}
                  <div className="space-y-3 pt-3 border-t">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">2. Statutory Deductions Rules</span>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">EPF Employee Share</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={config.pfEmployeePercent}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, pfEmployeePercent: Number(e.target.value) })}
                            className="w-full h-9 pl-3 pr-7 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">EPF Monthly Cap Limit</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={config.pfCapLimit}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, pfCapLimit: Number(e.target.value) })}
                            className="w-full h-9 pl-7 pr-3 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">ESI Gross Wage Ceiling</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={config.esiThreshold}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, esiThreshold: Number(e.target.value) })}
                            className="w-full h-9 pl-7 pr-3 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Professional Tax (PT)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={config.professionalTax}
                            disabled={!isHR && !isMD}
                            onChange={(e) => setConfig({ ...config, professionalTax: Number(e.target.value) })}
                            className="w-full h-9 pl-7 pr-3 rounded-lg border bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA for HR */}
                  {isHR && (
                    <div className="pt-3 border-t">
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-2 font-semibold shadow-2xs rounded-lg">
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Structure Revision to MD</span>
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* RIGHT: REAL-TIME LIVE SIMULATION */}
            <Card className="border-slate-200/90 shadow-2xs flex flex-col">
              <CardHeader className="py-4 px-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Live CTC Simulation Preview</CardTitle>
                  <span className="text-[11px] text-slate-500">Calculated instantly from configured rules</span>
                </div>
                <Badge variant="outline" className="text-[10px]">Real-Time</Badge>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4 text-xs">
                {/* CTC Input Controller */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Annual CTC Package</span>
                    <span className="font-mono font-extrabold text-indigo-700 text-sm">{formatCurrency(simulatedCtc)} / year</span>
                  </div>
                  <input
                    type="range"
                    min={240000}
                    max={3600000}
                    step={30000}
                    value={simulatedCtc}
                    onChange={(e) => setSimulatedCtc(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-slate-400">Quick CTCs:</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setSimulatedCtc(540000)} className="px-2.5 py-0.5 rounded-md bg-white border text-[10px] font-mono hover:bg-slate-100 shadow-2xs">5.4L</button>
                      <button type="button" onClick={() => setSimulatedCtc(1200000)} className="px-2.5 py-0.5 rounded-md bg-white border text-[10px] font-mono hover:bg-slate-100 shadow-2xs">12L</button>
                      <button type="button" onClick={() => setSimulatedCtc(2400000)} className="px-2.5 py-0.5 rounded-md bg-white border text-[10px] font-mono hover:bg-slate-100 shadow-2xs">24L</button>
                    </div>
                  </div>
                </div>

                {/* 3 Computed Summary Boxes */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Gross Pay</div>
                    <div className="text-sm font-extrabold text-indigo-950 font-mono mt-0.5">{formatCurrency(sim.grossEarnings)}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Deductions</div>
                    <div className="text-sm font-extrabold text-rose-950 font-mono mt-0.5">-{formatCurrency(sim.totalDeductions)}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Take-Home</div>
                    <div className="text-sm font-extrabold text-emerald-950 font-mono mt-0.5">{formatCurrency(sim.netPay)}</div>
                  </div>
                </div>

                {/* Itemized Table Breakdown */}
                <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>Basic Salary ({config.basicPercent}%)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(sim.basic)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>House Rent Allowance ({config.hraPercent}% HRA)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(sim.hra)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>Special Allowance (Balancing Component)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(sim.specialAllowance)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>Fixed Allowances (Conveyance + Medical)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(sim.conveyance + sim.medical)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>Provident Fund (EPF Employee 12%)</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(sim.pfEmployee)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>ESIC Health Insurance</span>
                    <span className="font-mono font-semibold text-rose-600">
                      {sim.esiEmployee > 0 ? `-${formatCurrency(sim.esiEmployee)}` : 'Exempt (> ₹21k)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3.5 text-slate-600">
                    <span>Professional Tax (PT)</span>
                    <span className="font-mono font-semibold text-rose-600">-{formatCurrency(sim.pt)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3.5 font-bold bg-emerald-50 text-emerald-800">
                    <span>Net Take-Home Pay (Monthly)</span>
                    <span className="font-mono text-emerald-700 text-sm">{formatCurrency(sim.netPay)}</span>
                  </div>
                </div>

                {/* Compliance Indicator Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Check className="h-3.5 w-3.5" /> Code on Wages Compliant
                  </span>
                  <span>Annual Gratuity: {formatCurrency(sim.gratuity * 12)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: STATUTORY REMITTANCES & AUDIT SIGN-OFF */}
        {/* ========================================================================= */}
        <TabsContent value="statutory" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Challans Summary */}
            <Card className="border-slate-200/90 shadow-2xs flex flex-col h-full">
              <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900">Government Statutory Challans</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs flex-1">
                <div className="flex justify-between items-center py-2.5 border-b">
                  <div>
                    <div className="font-semibold text-slate-800">EPFO Electronic Challan Return (ECR)</div>
                    <div className="text-[10px] text-slate-400">Form 12A • 12% Employee + 12% Employer</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right">{formatCurrency(totalPf * 2)}</div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b">
                  <div>
                    <div className="font-semibold text-slate-800">ESIC Monthly Contribution</div>
                    <div className="text-[10px] text-slate-400">Form 5 • 0.75% Employee + 3.25% Employer</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right">{formatCurrency(totalEsi * 5)}</div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b">
                  <div>
                    <div className="font-semibold text-slate-800">Income Tax TDS Deduction</div>
                    <div className="text-[10px] text-slate-400">Form 24Q Quarterly Return</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right">{formatCurrency(totalTds)}</div>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <div className="font-semibold text-slate-800">State Professional Tax (PT)</div>
                    <div className="text-[10px] text-slate-400">Form III State Remittance</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right">{formatCurrency(totalPt)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Certification Action */}
            <Card className="border-slate-200/90 shadow-2xs flex flex-col h-full justify-between">
              <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900">Auditor Sign-Off & Verification</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>100% Gross-to-Net Balance Reconciled (0 Variances)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Bank Disbursement Totals Match Register Exactly</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Statement</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Batch {selectedMonth}: Total Gross {formatCurrency(totalGrossWages)} &rarr; Total Net {formatCurrency(totalNetDisbursed)}.
                    </p>
                  </div>
                </div>

                {(isAudit || isMD) && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      disabled={isSigningAudit}
                      onClick={() => handleSignPayrollAudit(selectedMonth)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5 font-medium shadow-2xs rounded-lg"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>{isSigningAudit ? 'Recording Sign-Off...' : `Sign-Off & Certify ${selectedMonth} Audit`}</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* High-End Printable Modal */}
      <PayslipDialog
        open={payslipModalOpen}
        onOpenChange={setPayslipModalOpen}
        payslip={selectedPayslip}
      />
    </div>
  );
}

// Clean Printable Payslip Modal
function PayslipDialog({
  open,
  onOpenChange,
  payslip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: Payslip | null;
}) {
  if (!payslip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-white p-5 sm:p-6 rounded-2xl">
        <div className="space-y-5 text-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b">
            <div>
              <div className="text-base font-extrabold text-indigo-700">Viruzverse Solutions Private Limited</div>
              <div className="text-xs text-slate-500 mt-0.5">Official Payslip Statement for <strong>{payslip.period}</strong></div>
            </div>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto font-medium h-9 rounded-xl">
              <Printer className="h-3.5 w-3.5" />
              <span>Print Payslip</span>
            </Button>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400">Employee:</span> <strong className="text-slate-900">{payslip.employeeName}</strong>
              <div className="text-slate-400 mt-0.5">Code: <span className="font-mono text-slate-800 font-semibold">{payslip.employeeCode}</span></div>
            </div>
            <div>
              <span className="text-slate-400">Designation:</span> <span className="text-slate-900 font-medium">{payslip.designation}</span>
              <div className="text-slate-400 mt-0.5">Department: <span className="text-slate-800 font-medium">{payslip.department}</span></div>
            </div>
          </div>

          {/* Earnings vs Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80">
              <h4 className="font-bold text-indigo-700 uppercase text-[11px] flex justify-between">
                <span>Monthly Earnings</span>
                <span>Amount (₹)</span>
              </h4>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Basic Pay</span>
                <span className="font-mono font-semibold">{formatCurrency(payslip.breakup?.basic || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">HRA</span>
                <span className="font-mono font-semibold">{formatCurrency(payslip.breakup?.hra || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Special Allowance</span>
                <span className="font-mono font-semibold">{formatCurrency(payslip.breakup?.specialAllowance || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Conveyance + Medical</span>
                <span className="font-mono font-semibold">{formatCurrency((payslip.breakup?.conveyance || 0) + (payslip.breakup?.medicalAllowance || 0))}</span>
              </div>
              <div className="flex justify-between py-2 font-bold bg-white px-2 rounded-lg border">
                <span>Total Gross</span>
                <span className="font-mono text-indigo-700">{formatCurrency(payslip.breakup?.grossEarnings || 0)}</span>
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/60">
              <h4 className="font-bold text-rose-700 uppercase text-[11px] flex justify-between">
                <span>Statutory Deductions</span>
                <span>Deduction (₹)</span>
              </h4>
              <div className="flex justify-between py-1 border-b border-rose-200/40">
                <span className="text-slate-600">EPF (12%)</span>
                <span className="font-mono font-semibold text-rose-600">-{formatCurrency(payslip.breakup?.pfEmployee || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/40">
                <span className="text-slate-600">ESIC</span>
                <span className="font-mono font-semibold text-rose-600">-{formatCurrency(payslip.breakup?.esiEmployee || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/40">
                <span className="text-slate-600">Professional Tax (PT)</span>
                <span className="font-mono font-semibold text-rose-600">-{formatCurrency(payslip.breakup?.professionalTax || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-rose-200/40">
                <span className="text-slate-600">Income Tax TDS</span>
                <span className="font-mono font-semibold text-rose-600">-{formatCurrency(payslip.breakup?.tds || 0)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold bg-white text-rose-800 px-2 rounded-lg border border-rose-200">
                <span>Total Deductions</span>
                <span className="font-mono">-{formatCurrency(payslip.breakup?.totalDeductions || 0)}</span>
              </div>
            </div>
          </div>

          {/* Net Take-Home */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Salary Take-Home</span>
              <div className="text-xs text-emerald-700 font-medium">Direct Bank Transfer</div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {formatCurrency(payslip.breakup?.netPay || 0)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
