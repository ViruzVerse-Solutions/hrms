'use client';

import React, { useState } from 'react';
import {
  Bell,
  Search,
  Shield,
  UserCheck,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/rbac/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function AppHeader() {
  const {
    currentUser,
    currentRole,
    setCurrentRole,
    notifications,
    markNotificationRead,
  } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const rolesList: UserRole[] = [
    'super_admin',
    'hr_admin',
    'hr_executive',
    'payroll_officer',
    'reporting_manager',
    'employee',
  ];

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20 transition-all">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees, requisitions, records..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Interactive Role Switcher Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-2 rounded-xl border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs shadow-sm"
            >
              <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Role: {ROLE_LABELS[currentRole].title}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            <DropdownMenuLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Switch RBAC Role (Live Simulation)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {rolesList.map((role) => {
              const info = ROLE_LABELS[role];
              const isSelected = currentRole === role;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`flex flex-col items-start gap-0.5 p-2 rounded-lg cursor-pointer ${
                    isSelected ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs">{info.title}</span>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {info.description}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Dropdown */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                      notif.read
                        ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-200 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/70'
                    }`}
                  >
                    {notif.type === 'alert' || notif.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : notif.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-0.5">
                      <div className="font-semibold text-[12px]">{notif.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {notif.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar & Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                  {ROLE_LABELS[currentRole].title}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2">
            <DropdownMenuLabel>
              <div className="font-semibold text-xs text-slate-900 dark:text-white">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/employees/emp_005" className="text-xs cursor-pointer flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>My 360° Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-xs cursor-pointer flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                <span>Security & RBAC Logs</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
