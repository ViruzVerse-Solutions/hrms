'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Building,
  MapPin,
  ChevronRight,
  Shield,
  Briefcase,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatCurrency, getStatusColorBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPersonaAvatar } from '@/lib/constants';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function EmployeesPage() {
  return (
    <RBACGuard module="employee_records">
      <EmployeesContent />
    </RBACGuard>
  );
}

function EmployeesContent() {
  const router = useRouter();
  const { employees, addEmployee, refreshEmployees, isSalaryVisible, can, currentRole, currentEmployee, currentUser, logAuditAction } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState('');
  const [formError, setFormError] = useState('');
  
  // Clean form state without prefilled defaults
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    departmentId: '',
    designationTitle: '',
    dateOfJoining: '',
    ctc: '',
    pan: '',
    uan: '',
    esiNumber: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    documentTitle: '',
    documentCategory: 'Identity Proof',
  });

  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const isValidEmail = (email: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setFormError('');
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  const handleEmergencyPhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setFormError('');
    setForm((prev) => ({ ...prev, emergencyContactPhone: digits }));
  };

  React.useEffect(() => {
    if (currentRole === 'employee') {
      const selfId = currentEmployee?.id || currentUser.employeeId || employees[0]?.id;
      if (selfId) router.replace(`/employees/${selfId}`);
    }
  }, [currentRole, currentEmployee, currentUser, employees, router]);

  React.useEffect(() => {
    fetch('/api/master')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.departments) {
          setDepartments(data.data.departments);
        }
      })
      .catch(() => {});
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedDesignation = form.designationTitle.trim();

    // Validate Mandatory Fields
    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !form.gender ||
      !form.dob ||
      !form.departmentId ||
      !trimmedDesignation ||
      !form.dateOfJoining ||
      !form.ctc
    ) {
      setFormError('Please fill in all mandatory fields marked with an asterisk (*).');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFormError('Please enter a valid official email address (e.g. name@viruzverse.com).');
      return;
    }

    if (trimmedPhone.length !== 10) {
      setFormError('Phone number must contain exactly 10 digits.');
      return;
    }

    if (form.emergencyContactPhone && form.emergencyContactPhone.length !== 10) {
      setFormError('Emergency contact phone must contain exactly 10 digits.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          ...form,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          phone: trimmedPhone,
          designationTitle: trimmedDesignation,
          ctc: Number(form.ctc),
          pan: form.pan ? form.pan.toUpperCase().trim() : undefined,
          ifscCode: form.ifscCode ? form.ifscCode.toUpperCase().trim() : undefined,
        }),
      });

      const data = await res.json();
      if (data?.success && data?.data) {
        const createdEmployee = data.data;
        
        // Instantly reflect in global AuthContext and screen without page refresh
        addEmployee(createdEmployee);
        refreshEmployees();

        setOnboardSuccess(`Employee ${trimmedFirstName} ${trimmedLastName} (${createdEmployee.employeeCode}) onboarded successfully!`);
        if (logAuditAction) {
          logAuditAction('EMPLOYEE_ONBOARDED', 'employee_records', createdEmployee.id || 'new_emp', `Onboarded ${trimmedFirstName} ${trimmedLastName} (${createdEmployee.employeeCode})`);
        }

        setTimeout(() => {
          setOnboardModalOpen(false);
          setOnboardSuccess('');
          setFormError('');
          setForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            gender: '',
            dob: '',
            departmentId: '',
            designationTitle: '',
            dateOfJoining: '',
            ctc: '',
            pan: '',
            uan: '',
            esiNumber: '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            emergencyContactRelation: '',
            documentTitle: '',
            documentCategory: 'Identity Proof',
          });
        }, 1200);
      } else {
        setFormError(data?.error || 'Failed to onboard employee. Please try again.');
      }
    } catch (err) {
      console.error('Failed to onboard employee:', err);
      setFormError('An error occurred during onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (currentRole === 'employee') {
      const selfId = currentEmployee?.id || currentUser.employeeId || employees[0]?.id;
      const selfCode = currentEmployee?.employeeCode;
      return emp.id === selfId || (selfCode && emp.employeeCode === selfCode);
    }

    const matchesSearch =
      (emp.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designationTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept =
      selectedDept === 'all' ||
      emp.departmentId === selectedDept ||
      departments.find((d) => d.code === selectedDept)?.id === emp.departmentId;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {currentRole === 'employee' ? 'Profile 360 (My Profile)' : 'Employee Directory & Master Records'}
            </h1>
            <Badge variant="outline" className="text-xs">
              {currentRole === 'employee' ? 'ESS View' : `${employees.length} Staff`}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentRole === 'employee'
              ? 'Your personal employee 360° profile, statutory details, and career timeline'
              : 'Single source of truth for employee profiles, statutory records, and 17-stage lifecycle'}
          </p>
        </div>

        {can('create', 'employee_records') && (
          <Dialog open={onboardModalOpen} onOpenChange={(open) => { setOnboardModalOpen(open); if (!open) setFormError(''); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4" />
                <span>Onboard New Employee</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Onboard New Employee Dossier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleOnboardSubmit} className="space-y-5 pt-2 text-xs">
                {onboardSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{onboardSuccess}</span>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: Personal & Demographics (Mandatory Starred) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1 flex items-center justify-between">
                    <span>1. Personal Identity & Demographics</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fields with <span className="text-rose-500 font-bold">*</span> are required</span>
                  </h3>
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
                        value={form.firstName}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, firstName: capitalizeWords(e.target.value) });
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
                        value={form.lastName}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, lastName: capitalizeWords(e.target.value) });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Official Email <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. ramesh.patel@viruzverse.com"
                        value={form.email}
                        pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        title="Please enter a valid email address (e.g. name@viruzverse.com)"
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, email: e.target.value.trim() });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Phone Number <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">{form.phone.length}/10 digits</span>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        pattern="[0-9]{10}"
                        placeholder="e.g. 9876543210"
                        title="Please enter a 10-digit mobile number"
                        value={form.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
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
                        value={form.dob}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, dob: e.target.value });
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
                        value={form.gender}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, gender: e.target.value });
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

                {/* Section 2: Department & Role (Mandatory Starred) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1">
                    2. Role, Department & Compensation
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Department <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        required
                        value={form.departmentId}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, departmentId: e.target.value });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Designation Title <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoCapitalize="words"
                        placeholder="e.g. Senior Quality Inspector"
                        value={form.designationTitle}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, designationTitle: capitalizeWords(e.target.value) });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Date of Joining <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.dateOfJoining}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, dateOfJoining: e.target.value });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                      />
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
                        value={form.ctc}
                        onChange={(e) => {
                          setFormError('');
                          setForm({ ...form, ctc: e.target.value });
                        }}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Statutory & Banking (Optional) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1 flex items-center justify-between">
                    <span>3. Statutory Registrations & Bank Account</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        PAN Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={form.pan}
                        maxLength={10}
                        onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        PF UAN <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 100912345678"
                        maxLength={12}
                        value={form.uan}
                        onChange={(e) => setForm({ ...form, uan: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        ESIC Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 31001234560001234"
                        maxLength={17}
                        value={form.esiNumber}
                        onChange={(e) => setForm({ ...form, esiNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })}
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
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
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
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        IFSC Code <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        value={form.ifscCode}
                        maxLength={11}
                        onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Emergency Contacts (Optional) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1 flex items-center justify-between">
                    <span>4. Emergency Contact Details</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Contact Name <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={form.emergencyContactName}
                        onChange={(e) => setForm({ ...form, emergencyContactName: capitalizeWords(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs capitalize"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Emergency Phone <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">{form.emergencyContactPhone.length}/10</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={form.emergencyContactPhone}
                        onChange={(e) => handleEmergencyPhoneChange(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Relationship <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        value={form.emergencyContactRelation}
                        onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
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

                {/* Section 5: Documents Attachment (Optional) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b pb-1 flex items-center justify-between">
                    <span>5. KYC & Personnel Document Attachments</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Document Category <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        value={form.documentCategory}
                        onChange={(e) => setForm({ ...form, documentCategory: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                      >
                        <option value="Identity Proof">Identity Proof (Aadhaar / Passport / Voter ID)</option>
                        <option value="Educational Certificate">Educational Degree / Marksheet</option>
                        <option value="Offer Acceptance">Signed Offer / Appointment Acceptance</option>
                        <option value="Bank Proof">Bank Cancelled Cheque / Passbook</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Upload Document File <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="file"
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setOnboardModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isSubmitting ? 'Creating...' : 'Create Employee Record'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Filter and Search Bar */}
      {currentRole !== 'employee' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, code, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-11 px-4 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const statusBadge = getStatusColorBadge(emp.employmentStatus);
          const showSalary = isSalaryVisible(false);

          return (
            <Card
              key={emp.id}
              className="overflow-hidden hover:shadow-lg hover:border-indigo-500/30 transition-all duration-200 group flex flex-col justify-between"
            >
              <CardContent className="p-6 space-y-4">
                {/* Top Row: Avatar & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getPersonaAvatar(emp.employeeCode, `${emp.firstName} ${emp.lastName}`)}
                      alt={emp.firstName}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-indigo-600 transition-colors">
                        {emp.firstName} {emp.lastName}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400 font-mono">
                        {emp.employeeCode}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${statusBadge.bg} ${statusBadge.text}`}>
                    {emp.employmentStatus}
                  </span>
                </div>

                {/* Designation & Department */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{emp.designationTitle}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{emp.departmentName}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{emp.branchName}</span>
                  </div>
                </div>

                {/* Lifecycle Tag & Salary Preview */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Current Phase</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                      {emp.currentLifecycleStage ? String(emp.currentLifecycleStage).replace(/_/g, ' ') : 'Onboarding'}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">CTC (Annual)</span>
                    {showSalary ? (
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatCurrency(emp.ctc || 0)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Confidential
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* View 360 Profile CTA */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="w-full justify-between hover:bg-white dark:hover:bg-slate-900 text-xs font-semibold"
                >
                  <Link href={`/employees/${emp.id}`}>
                    <span>View 360° Profile & Timeline</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
