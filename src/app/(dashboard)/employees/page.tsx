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
} from 'lucide-react';
import { formatCurrency, getStatusColorBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPersonaAvatar } from '@/lib/constants';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function EmployeesPage() {
  const router = useRouter();
  const { employees, isSalaryVisible, can, currentRole, currentEmployee, currentUser, logAuditAction } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    designationTitle: 'Senior Quality Inspector',
    dateOfJoining: new Date().toISOString().split('T')[0],
    ctc: 540000,
  });

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
          if (data.data.departments[0]) {
            setForm((prev) => ({ ...prev, departmentId: data.data.departments[0].id }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data?.success) {
        setOnboardSuccess(`Employee ${form.firstName} ${form.lastName} onboarded successfully to database.`);
        if (logAuditAction) {
          logAuditAction('EMPLOYEE_ONBOARDED', 'employee_records', 'new_emp', `Onboarded ${form.firstName} ${form.lastName}`);
        }
        setTimeout(() => {
          setOnboardModalOpen(false);
          setOnboardSuccess('');
          setForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            departmentId: departments[0]?.id || '',
            designationTitle: 'Senior Quality Inspector',
            dateOfJoining: new Date().toISOString().split('T')[0],
            ctc: 540000,
          });
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to onboard employee:', err);
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
          <Dialog open={onboardModalOpen} onOpenChange={setOnboardModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4" />
                <span>Onboard New Employee</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Onboard New Employee Dossier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleOnboardSubmit} className="space-y-4 pt-2 text-xs">
                {onboardSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                    {onboardSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patel"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh.patel@viruzverse.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={form.dateOfJoining}
                      onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Designation Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Quality Inspector"
                    value={form.designationTitle}
                    onChange={(e) => setForm({ ...form, designationTitle: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Annual CTC (₹)</label>
                  <input
                    type="number"
                    required
                    min={100000}
                    step={10000}
                    value={form.ctc}
                    onChange={(e) => setForm({ ...form, ctc: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
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
