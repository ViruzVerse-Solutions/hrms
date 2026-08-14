'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ModuleKey, PermissionLevel } from '@/types';
import { ROLE_LABELS, getModulePermission } from '@/lib/rbac/permissions';
import { ShieldAlert, ArrowLeft, Lock, UserCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface RBACGuardProps {
  module: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RBACGuard({ module, children, fallback }: RBACGuardProps) {
  const { currentRole, setCurrentRole } = useAuth();
  const permission: PermissionLevel = getModulePermission(currentRole, module);

  if (permission === 'NONE') {
    if (fallback) return <>{fallback}</>;

    const roleInfo = ROLE_LABELS[currentRole];

    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[65vh]">
        <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Lock className="h-7 w-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              <span>RBAC Access Control</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Access Restricted
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Your active role <span className="font-semibold text-slate-800 dark:text-slate-200">{roleInfo.title}</span> does not have access permissions for this module per the HRM Role Permission Matrix (Section 4).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto text-left space-y-1.5">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Module Policy Details</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span>Target Module:</span>
              <span className="font-mono uppercase font-semibold text-slate-800 dark:text-slate-200">{module.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Your Permission:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">NONE (No Access)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setCurrentRole('hr_admin')}
            >
              <UserCheck className="h-4 w-4" />
              Switch to HR Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
