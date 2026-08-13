'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Target,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  GitPullRequest,
  AlertOctagon,
  LogOut,
  Settings,
  BarChart3,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ModuleKey } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  module: ModuleKey;
  badge?: string;
}

const NAV_GROUPS: { groupName: string; items: NavItem[] }[] = [
  {
    groupName: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'reports_dashboard' },
      { title: 'Analytics & Reports', href: '/reports', icon: BarChart3, module: 'reports_dashboard' },
    ],
  },
  {
    groupName: 'People & Lifecycle',
    items: [
      { title: 'Employee Directory', href: '/employees', icon: Users, module: 'employee_records' },
      { title: 'Recruitment & Pipeline', href: '/recruitment', icon: UserPlus, module: 'recruitment', badge: 'Kanban' },
      { title: 'Attendance & Check-in', href: '/attendance', icon: CalendarCheck, module: 'attendance_leave' },
      { title: 'Leave Management', href: '/leaves', icon: CalendarDays, module: 'attendance_leave' },
      { title: 'Payroll & CTC', href: '/payroll', icon: Wallet, module: 'payroll_benefits' },
      { title: 'Performance & KRAs', href: '/performance', icon: Target, module: 'performance_mgmt' },
      { title: 'Training & Skills', href: '/training', icon: GraduationCap, module: 'training_dev' },
      { title: 'Engagement & Welfare', href: '/engagement', icon: HeartHandshake, module: 'engagement_welfare' },
    ],
  },
  {
    groupName: 'Governance & Movement',
    items: [
      { title: 'Transfers & Org Chart', href: '/movement', icon: GitPullRequest, module: 'transfer_promotion' },
      { title: 'Policy & Compliance', href: '/compliance', icon: ShieldCheck, module: 'policy_compliance' },
      { title: 'Disciplinary Cases', href: '/disciplinary', icon: AlertOctagon, module: 'disciplinary_actions' },
      { title: 'Resignation & Clearance', href: '/resignation', icon: LogOut, module: 'resignation_exit' },
      { title: 'Master Settings', href: '/settings', icon: Settings, module: 'system_settings' },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { hasAccess } = useAuth();

  return (
    <aside className="w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-300">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800/80 gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/25">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold text-base bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent">
            ViruzVerse HRM
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Enterprise Suite v1.0</div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => hasAccess(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-1.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.groupName}
              </div>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400")} />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-bold", isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400")}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Lifecycle Indicator */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <Link
          href="/employees"
          className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">17-Stage HR Lifecycle</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </aside>
  );
}
