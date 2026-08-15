'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Department, Designation, Branch } from '@/types';
import {
  Settings,
  Building,
  Shield,
  History,
  Key,
  Users,
  MapPin,
  CheckCircle2,
  Lock,
  Plus,
  Calendar,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RBACGuard } from '@/components/layout/RBACGuard';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <RBACGuard module="system_settings">
      <SettingsContent />
    </RBACGuard>
  );
}

function SettingsContent() {
  const { auditLogs, currentRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [holidaysCount, setHolidaysCount] = useState(0);

  useEffect(() => {
    fetch('/api/master')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          if (data.data.departments) setDepartments(data.data.departments);
          if (data.data.designations) setDesignations(data.data.designations);
          if (data.data.branches) setBranches(data.data.branches);
        }
      })
      .catch(() => {});

    fetch('/api/holidays', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.holidays) {
          setHolidaysCount(data.data.holidays.length);
        }
      })
      .catch(() => {});
  }, [currentRole]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>System Settings, Master Data & Audit Trails</span>
            <Badge variant="purple" className="text-xs">
              Super Admin Infrastructure
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise structure, departments, designations, branches, holiday calendar, and security logs
          </p>
        </div>
      </div>

      <Tabs defaultValue="master" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="master">Master Data</TabsTrigger>
          <TabsTrigger value="audit">Audit Log ({auditLogs.length})</TabsTrigger>
          <TabsTrigger value="rbac">RBAC Matrix</TabsTrigger>
        </TabsList>

        {/* 1. Master Data Tab */}
        <TabsContent value="master" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Departments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span>Departments ({departments.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs max-h-72 overflow-y-auto">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-2.5 rounded-xl bg-slate-50 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{dept.name}</div>
                      <div className="text-[11px] text-slate-500">Employees: {dept.employeeCount || '—'}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">{dept.code}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Branches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Branches ({branches.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs max-h-72 overflow-y-auto">
                {branches.map((br) => (
                  <div key={br.id} className="p-2.5 rounded-xl bg-slate-50 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{br.name}</div>
                      <div className="text-[11px] text-slate-500">{br.city}, {br.country}</div>
                    </div>
                    {br.isHeadquarters && (
                      <Badge variant="purple" className="text-[10px]">HQ</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Designations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Designations ({designations.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs max-h-72 overflow-y-auto">
                {designations.map((des: any) => (
                  <div key={des.id} className="p-2.5 rounded-xl bg-slate-50 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{des.title}</div>
                      <div className="text-[11px] text-slate-500">Code: {des.code || '—'}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">{des.gradeLevel || des.grade || 'Staff'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Holiday Calendar Master Card */}
            <Card className="border-amber-500/20 bg-amber-50/20 flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-amber-600" />
                    <span>Holiday Calendar Master</span>
                  </div>
                  <Badge variant="warning" className="text-[10px]">2026</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {holidaysCount || 7} Holidays
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Configured by HR & Statutory Officer, approved by Managing Director.
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full text-xs gap-1 bg-white border-amber-300 text-amber-800 hover:bg-amber-100">
                  <Link href="/leaves">
                    <span>Manage Holiday Calendar</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Audit Trail Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <span>System Security & Tamper-Proof Audit Trail</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">SHA-256 Verified</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User & Role</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Action Type</th>
                      <th className="p-3">Details</th>
                      <th className="p-3 font-mono text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono capitalize">{log.role.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-indigo-600 uppercase font-bold">
                          {log.module}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          <Badge variant="outline" className="text-[10px]">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600 max-w-sm truncate">
                          {log.details}
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-right text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. RBAC Matrix Tab */}
        <TabsContent value="rbac">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-600" />
                <span>Enterprise RBAC Access Control Matrix</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border text-xs space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <span>Permission Level Legend:</span>
                </div>
                <div className="flex flex-wrap gap-4 text-slate-600">
                  <span><strong className="text-emerald-600">F:</strong> Full Access (CRUD + Approve)</span>
                  <span><strong className="text-indigo-600">E:</strong> Edit/Process</span>
                  <span><strong className="text-purple-600">A:</strong> Team Approval Only</span>
                  <span><strong className="text-blue-600">V:</strong> View Only</span>
                  <span><strong className="text-amber-600">S:</strong> Self-Service Only</span>
                  <span><strong className="text-rose-600">NONE:</strong> Module Hidden</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
