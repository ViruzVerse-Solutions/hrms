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
import { getPersonaAvatar } from '@/lib/constants';

export default function EmployeesPage() {
  const { employees, isSalaryVisible, can, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designationTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'all' || emp.departmentId === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Employee Directory & Master Records
            </h1>
            <Badge variant="outline" className="text-xs">
              {employees.length} Staff
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Single source of truth for employee profiles, statutory records, and 17-stage lifecycle
          </p>
        </div>

        {can('create', 'employee_records') && (
          <Button className="rounded-xl gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            <span>Onboard New Employee</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
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
            <option value="dept_eng">Software Engineering & AI</option>
            <option value="dept_hr">Human Resources</option>
            <option value="dept_fin">Finance & Accounts</option>
          </select>
        </div>
      </div>

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
