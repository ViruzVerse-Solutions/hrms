'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_DEPARTMENTS, MOCK_DESIGNATIONS, MOCK_BRANCHES } from '@/lib/mock-data';
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
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { auditLogs, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'master' | 'audit' | 'rbac'>('master');

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Departments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span>Departments ({MOCK_DEPARTMENTS.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {MOCK_DEPARTMENTS.map((dept) => (
                  <div key={dept.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{dept.name}</div>
                      <div className="text-[11px] text-slate-400">Head: {dept.headName || '—'}</div>
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
                  <span>Branches & Campuses ({MOCK_BRANCHES.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {MOCK_BRANCHES.map((br) => (
                  <div key={br.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{br.name}</div>
                      <div className="text-[11px] text-slate-400">{br.city}, {br.country}</div>
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
                  <span>Designations & Grades ({MOCK_DESIGNATIONS.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs max-h-72 overflow-y-auto">
                {MOCK_DESIGNATIONS.map((des) => (
                  <div key={des.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{des.title}</div>
                      <div className="text-[11px] text-slate-400">Level {des.level}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">{des.grade}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Immutable Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Immutable System & Access Audit Stream</span>
              </CardTitle>
              <p className="text-xs text-slate-400">
                Permanent, unchangeable record of all access-sensitive operations, salary approvals, and policy updates
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Initiator & Role</th>
                      <th className="p-3">Details / Diff</th>
                      <th className="p-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 font-mono">{formatDateTime(log.timestamp)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 capitalize font-semibold text-indigo-600">
                          {log.module.replace('_', ' ')}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{log.userName}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{log.role}</div>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-sm">
                          {log.details}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{log.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. RBAC Matrix Tab */}
        <TabsContent value="rbac" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Enforced Role x Module Permission Matrix</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20 text-xs space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">Active Access Legend:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-600 dark:text-slate-300">
                  <div><strong>F:</strong> Full Access (Create/Read/Update/Delete)</div>
                  <div><strong>E:</strong> Edit/Process own work area</div>
                  <div><strong>A:</strong> Approve only (direct team)</div>
                  <div><strong>V:</strong> View only</div>
                  <div><strong>S:</strong> Self-service only (own record)</div>
                  <div><strong>—:</strong> Blocked / No Access</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
