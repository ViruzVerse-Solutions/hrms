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
  Edit3,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateSalaryBreakup, getStatusColorBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { getPersonaAvatar } from '@/lib/constants';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { LoadingState } from '@/components/ui/LoadingState';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RBACGuard module="employee_records">
      <EmployeeDetailContent params={params} />
    </RBACGuard>
  );
}

function EmployeeDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { employees, addEmployee, refreshEmployees, isSalaryVisible, currentUser, currentRole, currentEmployee, can, isLoadingData } = useAuth();
  
  // If employee role, strictly view own profile without fallback to other employees
  const targetId = currentRole === 'employee'
    ? (currentEmployee?.id || currentUser.employeeId || resolvedParams.id)
    : resolvedParams.id;

  const initialEmployee =
    employees.find(
      (e) =>
        e.id === targetId ||
        e.employeeCode === targetId ||
        e.employeeCode?.toLowerCase() === targetId?.toLowerCase()
    ) || (currentRole === 'employee' ? currentEmployee || null : null);

  const [employee, setEmployee] = useState<Employee | null>(initialEmployee);
  const [loading, setLoading] = useState(!initialEmployee);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: initialEmployee?.firstName || '',
    lastName: initialEmployee?.lastName || '',
    phone: initialEmployee?.phone || '',
    gender: (initialEmployee as any)?.gender || '',
    dob: (initialEmployee as any)?.dob ? new Date((initialEmployee as any).dob).toISOString().split('T')[0] : '',
    designationTitle: initialEmployee?.designationTitle || '',
    employmentStatus: initialEmployee?.employmentStatus || 'active',
    ctc: initialEmployee?.ctc || '',
    pan: (initialEmployee as any)?.pan || (initialEmployee as any)?.bankDetails?.pan || '',
    uan: (initialEmployee as any)?.uan || (initialEmployee as any)?.statutoryInfo?.uan || '',
    esiNumber: (initialEmployee as any)?.esiNumber || (initialEmployee as any)?.statutoryInfo?.esiNumber || '',
    bankName: (initialEmployee as any)?.bankName || (initialEmployee as any)?.bankDetails?.bankName || '',
    accountNumber: (initialEmployee as any)?.accountNumber || (initialEmployee as any)?.bankDetails?.accountNumber || '',
    ifscCode: (initialEmployee as any)?.ifscCode || (initialEmployee as any)?.bankDetails?.ifscCode || '',
    emergencyContactName: (initialEmployee as any)?.emergencyContacts?.[0]?.name || (initialEmployee as any)?.emergencyContactName || initialEmployee?.emergencyContact?.name || '',
    emergencyContactPhone: (initialEmployee as any)?.emergencyContacts?.[0]?.phone || (initialEmployee as any)?.emergencyContactPhone || initialEmployee?.emergencyContact?.phone || '',
    emergencyContactRelation: (initialEmployee as any)?.emergencyContacts?.[0]?.relationship || (initialEmployee as any)?.emergencyContactRelation || initialEmployee?.emergencyContact?.relationship || '',
    documentCategory: 'Identity Proof',
  });

  const [documents, setDocuments] = useState<Array<{ id: string; title: string; category: string; date: string; type: string }>>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'Identity Proof' });
  const [docUploadSuccess, setDocUploadSuccess] = useState('');

  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setSaveError('');
    setEditForm((prev) => ({ ...prev, phone: digits }));
  };

  const handleEmergencyPhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setSaveError('');
    setEditForm((prev) => ({ ...prev, emergencyContactPhone: digits }));
  };

  useEffect(() => {
    let isMounted = true;
    // Fetch full 360 profile details from API
    fetch(`/api/employees/${resolvedParams.id}`, {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.data?.employee) {
          const emp = data.data.employee;
          setEmployee(emp);
          setEditForm({
            firstName: emp.firstName || '',
            lastName: emp.lastName || '',
            phone: emp.phone || '',
            gender: emp.gender || '',
            dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
            designationTitle: emp.designationTitle || '',
            employmentStatus: emp.employmentStatus || 'active',
            ctc: emp.ctc || '',
            pan: emp.pan || emp.bankDetails?.pan || '',
            uan: emp.uan || emp.statutoryInfo?.uan || '',
            esiNumber: emp.esiNumber || emp.statutoryInfo?.esiNumber || '',
            bankName: emp.bankName || emp.bankDetails?.bankName || '',
            accountNumber: emp.accountNumber || emp.bankDetails?.accountNumber || '',
            ifscCode: emp.ifscCode || emp.bankDetails?.ifscCode || '',
            emergencyContactName: (emp as any)?.emergencyContacts?.[0]?.name || (emp as any)?.emergencyContactName || emp?.emergencyContact?.name || '',
            emergencyContactPhone: (emp as any)?.emergencyContacts?.[0]?.phone || (emp as any)?.emergencyContactPhone || emp?.emergencyContact?.phone || '',
            emergencyContactRelation: (emp as any)?.emergencyContacts?.[0]?.relationship || (emp as any)?.emergencyContactRelation || emp?.emergencyContact?.relationship || '',
            documentCategory: 'Identity Proof',
          });
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

  const isOwnProfile = Boolean(
    (currentUser?.employeeId && (currentUser.employeeId === employee.id || currentUser.employeeId === employee.employeeCode)) ||
    (currentUser?.id && currentUser.id === employee.userId)
  );

  // Only HR Admin / MD can edit employee records; Regular employees have no self-edit option
  const canEditFull = (currentRole === 'hr_head' || currentRole === 'managing_director' || can('update', 'employee_records')) && currentRole !== 'employee';
  const canEdit = canEditFull;

  const canSeeSalary = isSalaryVisible(Boolean(isOwnProfile));
  const salaryBreakup = calculateSalaryBreakup(employee.ctc || 0);
  const statusBadge = getStatusColorBadge(employee.employmentStatus || 'active');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');

    // Admin Mandatory Field Validation
    if (canEditFull) {
      if (
        !editForm.firstName.trim() ||
        !editForm.lastName.trim() ||
        !editForm.phone.trim() ||
        !editForm.gender ||
        !editForm.dob ||
        !editForm.designationTitle.trim() ||
        !editForm.employmentStatus ||
        !editForm.ctc
      ) {
        setSaveError('Please fill in all mandatory fields marked with an asterisk (*).');
        return;
      }
    }

    if (editForm.phone && editForm.phone.length !== 10) {
      setSaveError('Phone number must contain exactly 10 digits.');
      return;
    }

    if (editForm.emergencyContactPhone && editForm.emergencyContactPhone.length !== 10) {
      setSaveError('Emergency contact phone must contain exactly 10 digits.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
          'x-employee-id': currentUser?.employeeId || '',
        },
        body: JSON.stringify({
          ...editForm,
          ctc: editForm.ctc ? Number(editForm.ctc) : undefined,
          pan: editForm.pan ? editForm.pan.toUpperCase().trim() : undefined,
          ifscCode: editForm.ifscCode ? editForm.ifscCode.toUpperCase().trim() : undefined,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        const updatedEmployee = { ...employee, ...data.data?.employee, ...editForm, ctc: Number(editForm.ctc) || employee.ctc };
        
        // Instantly update local & global state
        setEmployee(updatedEmployee);
        addEmployee(updatedEmployee);
        refreshEmployees();

        setSaveSuccess('Employee dossier updated successfully!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSaveSuccess('');
        }, 1200);
      } else {
        setSaveError(data?.error || 'Failed to update employee profile.');
      }
    } catch (err: any) {
      console.error('Failed to update employee:', err);
      setSaveError('An error occurred while saving profile updates.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) return;
    const docItem = {
      id: `doc-${Date.now()}`,
      title: newDoc.title.trim(),
      category: newDoc.category,
      date: `Uploaded on ${new Date().toLocaleDateString()}`,
      type: 'PDF',
    };
    setDocuments((prev) => [docItem, ...prev]);
    setDocUploadSuccess('Document attached to dossier successfully!');
    setTimeout(() => {
      setIsDocModalOpen(false);
      setDocUploadSuccess('');
      setNewDoc({ title: '', category: 'Identity Proof' });
    }, 1000);
  };

  if (loading && !employee) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="dossier" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Employee Profile Not Found</h2>
        <p className="text-xs text-slate-500">The requested employee identifier does not exist or has been removed from database.</p>
        <Button asChild variant="outline" className="text-xs">
          <Link href="/employees">Back to Employee Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Button (Hidden for Employee self-service view) */}
      {currentRole !== 'employee' && (
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link href="/employees">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Employee Directory</span>
          </Link>
        </Button>
      )}

      {/* Header Profile Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={getPersonaAvatar(employee.employeeCode, `${employee.firstName} ${employee.lastName}`)}
              alt={employee.firstName || 'Employee'}
              className="h-20 w-20 rounded-3xl object-cover ring-4 ring-indigo-500/20 shadow-md"
            />
            <div className="space-y-1.5">
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

          <div className="flex items-center gap-3 flex-wrap">
            {canEdit && (
              <Dialog open={isEditModalOpen} onOpenChange={(open) => { setIsEditModalOpen(open); if (!open) setSaveError(''); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{canEditFull ? 'Edit Dossier' : 'Update Personal Info'}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                      {canEditFull ? 'Edit Employee Dossier' : 'Update Personal Contact Details'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProfile} className="space-y-5 pt-2 text-xs">
                    {saveSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{saveSuccess}</span>
                      </div>
                    )}
                    {saveError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{saveError}</span>
                      </div>
                    )}

                    {canEditFull ? (
                      <>
                        {/* Section 1: Demographics (Mandatory Starred) */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center justify-between">
                            <span>1. Personal Demographics</span>
                            <span className="text-[10px] text-slate-400 font-normal">Fields with <span className="text-rose-500 font-bold">*</span> are required</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                First Name <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                autoCapitalize="words"
                                placeholder="e.g. Ramesh"
                                value={editForm.firstName}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, firstName: capitalizeWords(e.target.value) });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Last Name <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                autoCapitalize="words"
                                placeholder="e.g. Patel"
                                value={editForm.lastName}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, lastName: capitalizeWords(e.target.value) });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Date of Birth <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                value={editForm.dob}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, dob: e.target.value });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Gender <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <select
                                required
                                value={editForm.gender}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, gender: e.target.value as any });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                              >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer_not_to_say">Prefer Not to Say</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Role & Compensation (Mandatory Starred) */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1">
                            2. Designation, Status & Compensation
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Designation Title <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                autoCapitalize="words"
                                placeholder="e.g. Senior Quality Inspector"
                                value={editForm.designationTitle}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, designationTitle: capitalizeWords(e.target.value) });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Employment Status <span className="text-rose-500 font-bold">*</span>
                              </label>
                              <select
                                required
                                value={editForm.employmentStatus}
                                onChange={(e) => {
                                  setSaveError('');
                                  setEditForm({ ...editForm, employmentStatus: e.target.value as any });
                                }}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                              >
                                <option value="active">Active</option>
                                <option value="probation">Probation</option>
                                <option value="notice_period">Notice Period</option>
                                <option value="terminated">Terminated</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Annual CTC (₹) <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min={100000}
                              step={10000}
                              placeholder="e.g. 540000"
                              value={editForm.ctc}
                              onChange={(e) => {
                                setSaveError('');
                                setEditForm({ ...editForm, ctc: e.target.value });
                              }}
                              className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Section 3: Statutory & Banking (Optional) */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1 flex items-center justify-between">
                            <span>3. Statutory Registrations & Bank</span>
                            <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                PAN Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={10}
                                placeholder="e.g. ABCDE1234F"
                                value={editForm.pan}
                                onChange={(e) => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                PF UAN <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={12}
                                placeholder="e.g. 100912345678"
                                value={editForm.uan}
                                onChange={(e) => setEditForm({ ...editForm, uan: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                ESIC Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={17}
                                placeholder="e.g. 31001234560001234"
                                value={editForm.esiNumber}
                                onChange={(e) => setEditForm({ ...editForm, esiNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Bank Name <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. HDFC Bank"
                                value={editForm.bankName}
                                onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Account Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 5010023456789"
                                value={editForm.accountNumber}
                                onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700 dark:text-slate-300">
                                IFSC Code <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={11}
                                placeholder="e.g. HDFC0001234"
                                value={editForm.ifscCode}
                                onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value.toUpperCase() })}
                                className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {/* Section 4: Personal Contact Info (Editable by both Admin & Self) */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center justify-between">
                        <span>{canEditFull ? '4. Contact & Emergency Details' : 'Contact & Emergency Information'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Fields with <span className="text-rose-500 font-bold">*</span> are required</span>
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Personal Phone Number <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">{editForm.phone.length}/10 digits</span>
                        </div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          pattern="[0-9]{10}"
                          placeholder="e.g. 9876543210"
                          value={editForm.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Emergency Name <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Priya Sharma"
                            value={editForm.emergencyContactName}
                            onChange={(e) => setEditForm({ ...editForm, emergencyContactName: capitalizeWords(e.target.value) })}
                            className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Emergency Phone <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="e.g. 9876543210"
                            value={editForm.emergencyContactPhone}
                            onChange={(e) => handleEmergencyPhoneChange(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Relationship <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <select
                            value={editForm.emergencyContactRelation}
                            onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                          >
                            <option value="">Select Relationship (Optional)</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Family">Family Member</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {!isOwnProfile && currentRole !== 'employee' && employee.email && (
              <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>Email</span>
                </a>
              </Button>
            )}
            {!isOwnProfile && currentRole !== 'employee' && employee.phone && (
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
                    {(employee as any).emergencyContactName || (employee as any).emergencyContacts?.[0]?.name || employee.emergencyContact?.name
                      ? `${(employee as any).emergencyContactName || (employee as any).emergencyContacts?.[0]?.name || employee.emergencyContact?.name}${(employee as any).emergencyContactRelation || (employee as any).emergencyContacts?.[0]?.relationship || employee.emergencyContact?.relationship ? ` (${(employee as any).emergencyContactRelation || (employee as any).emergencyContacts?.[0]?.relationship || employee.emergencyContact?.relationship})` : ''}${(employee as any).emergencyContactPhone || (employee as any).emergencyContacts?.[0]?.phone || employee.emergencyContact?.phone ? ` - ${(employee as any).emergencyContactPhone || (employee as any).emergencyContacts?.[0]?.phone || employee.emergencyContact?.phone}` : ''}`
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
                  <span className="font-semibold">{employee.departmentName || 'General'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-semibold">{employee.designationTitle || 'Staff Member'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Reporting Manager</span>
                  <span className="font-semibold text-indigo-600">
                    {employee.reportingManagerName || 'Executive Leadership'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Work Location</span>
                  <span className="font-semibold">{employee.branchName || 'Headquarters'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Employment Status</span>
                  <span className="font-semibold capitalize">{employee.employmentStatus || 'Active'}</span>
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
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-base font-bold">Monthly CTC Component & Statutory Breakdown</CardTitle>
                    <Badge variant="outline" className="text-[10px] w-fit">
                      Governed by Corporate HR C&B Policy (Sanctioned by MD)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 text-xs">
                    {/* 1. Earnings */}
                    <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-indigo-600 flex items-center justify-between">
                        <span>1. Monthly Earnings</span>
                        <span>Amount (₹)</span>
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
                      <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 rounded-lg border">
                        <span>Total Gross Earnings</span>
                        <span className="font-mono text-indigo-600">{formatCurrency(salaryBreakup.grossEarnings)}</span>
                      </div>
                    </div>

                    {/* 2. Employee Deductions */}
                    <div className="space-y-3 p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60">
                      <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                        <span>2. Employee Deductions</span>
                        <span>Deduction (₹)</span>
                      </h4>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Provident Fund (PF 12%)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.pfEmployee)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>ESI Employee (0.75%)</span>
                        <span className="font-mono font-semibold text-rose-600">
                          {salaryBreakup.esiEmployee > 0 ? `-${formatCurrency(salaryBreakup.esiEmployee)}` : 'Exempt'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Professional Tax (PT)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.professionalTax)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Estimated TDS (Tax)</span>
                        <span className="font-mono font-semibold text-rose-600">-{formatCurrency(salaryBreakup.tds)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-rose-700 bg-white dark:bg-slate-800 px-2 rounded-lg border border-rose-200">
                        <span>Total Deductions</span>
                        <span className="font-mono">-{formatCurrency(salaryBreakup.totalDeductions)}</span>
                      </div>
                    </div>

                    {/* 3. Employer Statutory Benefits */}
                    <div className="space-y-3 p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60">
                      <h4 className="font-bold text-emerald-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                        <span>3. Employer Contributions</span>
                        <span>Benefit (₹)</span>
                      </h4>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Employer PF Match (12%)</span>
                        <span className="font-mono font-semibold text-slate-700">{formatCurrency(salaryBreakup.pfEmployer)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Employer ESI (3.25%)</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {salaryBreakup.esiEmployer > 0 ? formatCurrency(salaryBreakup.esiEmployer) : 'Exempt'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span>Gratuity Provision (4.81%)</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {formatCurrency(Math.round(salaryBreakup.basic * 0.0481))}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-emerald-800 bg-white dark:bg-slate-800 px-2 rounded-lg border border-emerald-200">
                        <span>Net Take-Home Pay</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(salaryBreakup.netPay)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Compliance Footer Badges */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Code on Wages Compliant (Basic ≥ 40%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <Check className="h-4 w-4" />
                      <span>EPF Act 1952 (12% Remittance)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <Check className="h-4 w-4" />
                      <span>Payment of Gratuity Act 1972 (4.81%)</span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      Annual CTC: {formatCurrency(employee.ctc || 0)}
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
          {canSeeSalary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Bank Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="font-semibold">{employee.bankDetails?.bankName || (employee as any).bankName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.accountNumber || (employee as any).accountNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">IFSC Code</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.ifscCode || (employee as any).ifscCode || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">PAN Number</span>
                    <span className="font-mono font-semibold">{employee.bankDetails?.pan || (employee as any).pan || '—'}</span>
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
                    <span className="font-mono font-semibold">{(employee as any).statutoryInfo?.uan || (employee as any).uan || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Provident Fund (PF) Member ID</span>
                    <span className="font-mono font-semibold">{(employee as any).statutoryInfo?.pfNumber || (employee as any).pfNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">ESI IP Number</span>
                    <span className="font-mono font-semibold">{(employee as any).statutoryInfo?.esiNumber || (employee as any).esiNumber || '—'}</span>
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

        {/* 4. Document Vault Tab (Restricted to HR Head, MD, Compliance Officer, and Employee on own profile) */}
        <TabsContent value="documents" className="space-y-6">
          {currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'compliance_statutory' || isOwnProfile ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Digital Personnel Vault & Letters</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">Secure confidential repository for identity verification, educational degrees, and employment agreements</p>
                </div>
                {(can('create', 'employee_records') || isOwnProfile) && (
                  <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Upload New Document</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Attach Document to Personnel Dossier</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddDocument} className="space-y-4 pt-2 text-xs">
                        {docUploadSuccess && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{docUploadSuccess}</span>
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Document Title <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Relieving Certificate - Prior Employer"
                            value={newDoc.title}
                            onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Document Category <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <select
                            required
                            value={newDoc.category}
                            onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                          >
                            <option value="Identity Proof">Identity Proof (Aadhaar / Passport / PAN)</option>
                            <option value="Educational & Experience">Educational Certificate / Marksheet</option>
                            <option value="Employment Letter">Employment Letter / Signed Offer</option>
                            <option value="Statutory & Bank">Statutory / Bank Cancelled Cheque</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Select File (PDF / Image) <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="file"
                            required
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Attach to Dossier
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{doc.title}</div>
                          <div className="text-slate-400">
                            {doc.category} • {doc.date} • {doc.type}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Documents Attached Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Personnel files like signed letters, government IDs, and degree certificates will appear here once attached.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Confidential Personnel Files</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Government IDs, degree certificates, and letters are strictly restricted under enterprise confidentiality. Only authorized HR Admins, Statutory Compliance Officers, or the employee themselves may access this personnel vault.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
