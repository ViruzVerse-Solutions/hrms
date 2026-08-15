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
  ChevronRight,
  Factory,
  X,
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
    groupName: 'People & Operations',
    items: [
      { title: 'Employee Directory', href: '/employees', icon: Users, module: 'employee_records' },
      { title: 'Recruitment & Pipeline', href: '/recruitment', icon: UserPlus, module: 'recruitment', badge: 'Active' },
      { title: 'Attendance & Logs', href: '/attendance', icon: CalendarCheck, module: 'attendance_leave' },
      { title: 'Leave Management', href: '/leaves', icon: CalendarDays, module: 'attendance_leave' },
      { title: 'Payroll & Benefits', href: '/payroll', icon: Wallet, module: 'payroll_benefits' },
      { title: 'Performance & KRAs', href: '/performance', icon: Target, module: 'performance_mgmt' },
      { title: 'Training & Skills', href: '/training', icon: GraduationCap, module: 'training_dev' },
      { title: 'Engagement & Welfare', href: '/engagement', icon: HeartHandshake, module: 'engagement_welfare' },
    ],
  },
  {
    groupName: 'Governance & Movement',
    items: [
      { title: 'Transfers & Promotions', href: '/movement', icon: GitPullRequest, module: 'transfer_promotion' },
      { title: 'Policy & Compliance', href: '/compliance', icon: ShieldCheck, module: 'policy_compliance' },
      { title: 'Disciplinary Records', href: '/disciplinary', icon: AlertOctagon, module: 'disciplinary_actions' },
      { title: 'Resignation & Exit', href: '/resignation', icon: LogOut, module: 'resignation_exit' },
      { title: 'System Settings', href: '/settings', icon: Settings, module: 'system_settings' },
    ],
  },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({ mobileOpen = false, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const { hasAccess, currentRole, roleDetails, currentUser } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-600/30">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-slate-900">
              Viruzverse Solutions
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Enterprise HRM Platform</div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role Context Pill */}
      <div className="px-4 pt-3.5 pb-1">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Workspace View</div>
            <div className="text-xs font-bold text-slate-800 truncate">{roleDetails.title}</div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold uppercase">
            {currentRole === 'employee' ? 'ESS' : 'RBAC'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (currentRole === 'employee' && item.href === '/reports') return false;
            return hasAccess(item.module);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-1">
              <div className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {group.groupName}
              </div>
              {visibleItems.map((item) => {
                let targetHref = item.href;
                let displayTitle = item.title;

                // Customize nav item titles and direct Profile 360 link for Employee (ESS) view
                if (currentRole === 'employee') {
                  if (item.href === '/employees') {
                    displayTitle = 'Profile 360 (My Profile)';
                    targetHref = `/employees/${currentUser?.employeeId || 'emp_005'}`;
                  } else if (item.href === '/attendance') displayTitle = 'Attendance Check-In';
                  else if (item.href === '/leaves') displayTitle = 'Leave Requests';
                  else if (item.href === '/payroll') displayTitle = 'Payslips';
                  else if (item.href === '/performance') displayTitle = 'Self-Appraisals';
                  else if (item.href === '/training') displayTitle = 'Training Enrolment';
                  else if (item.href === '/engagement') displayTitle = 'Grievance Filing';
                  else if (item.href === '/resignation') displayTitle = 'Resignation Notice';
                }

                const isActive = pathname === targetHref || (targetHref !== '/dashboard' && pathname.startsWith(targetHref));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={targetHref}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm font-bold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
                      <span>{displayTitle}</span>
                    </div>
                    {item.badge && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-bold", isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700")}>
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
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <Link
          href={hasAccess('employee_records') ? '/employees' : '/dashboard'}
          onClick={onCloseMobile}
          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs font-bold text-slate-800">17-Stage HR Lifecycle</div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 border-r border-slate-200 shadow-2xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Slide-out Menu */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
