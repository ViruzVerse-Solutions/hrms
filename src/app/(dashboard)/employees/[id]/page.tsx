'use client';

import React, { use, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Employee } from '@/types';
import {
  Building,
  MapPin,
  Calendar,
  Shield,
  FileText,
  Lock,
  Download,
  ArrowLeft,
  Mail,
  Phone,
  Award,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateSalaryBreakup, getStatusColorBadge } from '@/lib/utils';
import { LifecycleTimeline } from '@/components/modules/LifecycleTimeline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { getPersonaAvatar } from '@/lib/constants';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { employees, isSalaryVisible, currentUser, currentRole } = useAuth();
  
  const initialEmployee =
    employees.find(
      (e) =>
        e.id === resolvedParams.id ||
        e.employeeCode === resolvedParams.id ||
        e.employeeCode?.toLowerCase() === resolvedParams.id?.toLowerCase()
    ) || null;

  const [employee, setEmployee] = useState<Employee | null>(initialEmployee);
  const [loading, setLoading] = useState(!initialEmployee);

  useEffect(() => {
    let isMounted = true;
    // Always fetch full details from API to ensure complete 360 profile data (emergency contacts, bank, statutory, etc.)
    fetch(`/api/employees/${resolvedParams.id}`, {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.data?.employee) {
          setEmployee(data.data.employee);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedParams.id, currentRole]);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500">Loading 360° employee profile from database...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Employee record not found</h2>
        <p className="text-xs text-slate-500">Could not locate employee ID '{resolvedParams.id}'</p>
        <Button asChild variant="outline">
          <Link href="/employees">Return to Directory</Link>
        </Button>
      </div>
    );
  }

  const isOwnProfile =
    (currentUser?.employeeId && (currentUser.employeeId === employee.id || currentUser.employeeId === employee.employeeCode)) ||
    (currentUser?.id && currentUser.id === employee.userId);
  const canSeeSalary = isSalaryVisible(Boolean(isOwnProfile));
  const salaryBreakup = calculateSalaryBreakup(employee.ctc || 0);
  const statusBadge = getStatusColorBadge(employee.employmentStatus || 'active');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs font-semibold">
          <Link href="/employees">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Directory
          </Link>
        </Button>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={getPersonaAvatar(employee.employeeCode, `${employee.firstName} ${employee.lastName}`)}
              alt={employee.firstName || 'Employee'}
              className="h-20 w-20 rounded-3xl object-cover ring-4 ring-indigo-500/20 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {employee.firstName} {employee.lastName}
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${statusBadge.bg} ${statusBadge.text}`}>
                  {employee.employmentStatus || 'active'}
                </span>
              </div>
              <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {employee.designationTitle || 'Staff Member'}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {employee.employeeCode}
                </span>
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {employee.departmentName || 'General'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {employee.branchName || 'Headquarters'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Joined: {employee.dateOfJoining ? formatDate(employee.dateOfJoining) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {employee.email && (
              <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>Email</span>
                </a>
              </Button>
            )}
            {employee.phone && (
              <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
                <a href={`tel:${employee.phone}`}>
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span>Call</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 17-Stage Simple HR Lifecycle Timeline */}
      <LifecycleTimeline currentStage={employee.currentLifecycleStage || 'onboarding'} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview & Bio</TabsTrigger>
          <TabsTrigger value="compensation">Compensation & CTC</TabsTrigger>
          <TabsTrigger value="statutory">Statutory & Bank</TabsTrigger>
          <TabsTrigger value="documents">Document Vault</TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Personal & Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Official Email</span>
                  <span className="font-semibold">{employee.email || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-semibold">{employee.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Date of Birth</span>
                  <span className="font-semibold">{employee.dob ? formatDate(employee.dob) : '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-semibold capitalize">{employee.gender || '—'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Emergency Contact</span>
                  <span className="font-semibold">
                    {employee.emergencyContact?.name
                      ? `${employee.emergencyContact.name}${employee.emergencyContact.relationship ? ` (${employee.emergencyContact.relationship})` : ''}${employee.emergencyContact.phone ? ` - ${employee.emergencyContact.phone}` : ''}`
                      : 'Not Provided'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Organization & Reporting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold">{employee.departmentName || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-semibold">{employee.designationTitle || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Reporting Manager</span>
                  <span className="font-semibold text-indigo-600">
                    {employee.reportingManagerName || 'Executive Leadership'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Work Location</span>
                  <span className="font-semibold">{employee.branchName || '—'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Employment Type</span>
                  <span className="font-semibold capitalize">{employee.employmentStatus || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Compensation Tab */}
        <TabsContent value="compensation" className="space-y-6">
          {canSeeSalary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-500/20">
                  <CardContent className="p-6">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Annual CTC</span>
                    <div className="text-2xl font-extrabold text-indigo-600 mt-2 font-mono">
                      {formatCurrency(employee.ctc || 0)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Cost to Company</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Gross</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
                      {formatCurrency(salaryBreakup.grossEarnings)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Before deductions</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Est. Monthly Net Pay</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-2 font-mono">
                      {formatCurrency(salaryBreakup.netPay)}
                    </div>
                    <div className="text-xs text-emerald-600 font-medium mt-1">Take-Home Amount</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Monthly CTC Component Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-indigo-600">
                        Earnings (Monthly)
                      </h4>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Basic Pay (40%)</span>
                        <span className="font-mono font-semibold">{formatCurrency(salaryBreakup.basic)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>House Rent Allowance (HRA 50%)</span>
                        <span className="font-mono font-semibold">{formatCurrency(salaryBreakup.hra)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Special Allowance</span>
                        <span className="font-mono font-semibold">{formatCurrency(salaryBreakup.specialAllowance)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Conveyance Allowance</span>
                        <span className="font-mono font-semibold">{formatCurrency(salaryBreakup.conveyance)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Medical Allowance</span>
                        <span className="font-mono font-semibold">{formatCurrency(salaryBreakup.medicalAllowance)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 px-2 rounded-lg">
                        <span>Total Monthly Gross</span>
                        <span className="font-mono">{formatCurrency(salaryBreakup.grossEarnings)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-rose-600 uppercase tracking-wider text-[11px]">
                        Statutory Deductions (Monthly)
                      </h4>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Provident Fund (PF Employee 12%)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.pfEmployee)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>ESI Employee (0.75%)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.esiEmployee)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Professional Tax (PT)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.professionalTax)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>TDS (Income Tax Estimation)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.tds)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 px-2 rounded-lg">
                        <span>Total Deductions</span>
                        <span className="font-mono">-{formatCurrency(salaryBreakup.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Confidential Information</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Salary structures and compensation data are restricted by RBAC confidentiality policies. Only authorized HR Admins, Payroll Officers, or the employee may view this tab.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 3. Statutory & Bank Tab */}
        <TabsContent value="statutory" className="space-y-6">
          {canSeeSalary && employee.bankDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Bank Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="font-semibold">{employee.bankDetails?.bankName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.accountNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">IFSC Code</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.ifscCode || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">PAN Number</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.pan || '—'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Statutory Registrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Universal Account Number (UAN)</span>
                    <span className="font-mono font-semibold">{employee.statutory?.uan || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Provident Fund (PF) Member ID</span>
                    <span className="font-mono font-semibold">{employee.statutory?.pfNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">ESI IP Number</span>
                    <span className="font-mono font-semibold">{employee.statutory?.esiNumber || 'Exempt'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Professional Tax Registration</span>
                    <span className="font-semibold text-emerald-600">Compliant</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Confidential Bank Details</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bank accounts and sensitive statutory records are restricted under enterprise confidentiality. Only authorized HR Admins, Payroll Officers, or the individual employee may access this information.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 4. Document Vault Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Digital Personnel Vault & Letters</CardTitle>
              <Button size="sm" variant="outline" className="text-xs">
                Upload New Document
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Official Appointment Letter</div>
                    <div className="text-slate-400">
                      Signed on {employee.dateOfJoining ? formatDate(employee.dateOfJoining) : '—'} • Verified
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Government ID Proof (PAN & Aadhaar)</div>
                    <div className="text-slate-400">Verified by HR Operations</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Degree & Experience Certificates</div>
                    <div className="text-slate-400">Background Verification Cleared</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
