'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

import {
  Bell,
  Search,
  ShieldCheck,
  ChevronDown,
  Shield,
  UserCheck,
  Menu,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
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
import { ROLE_LABELS } from '@/lib/rbac';

interface AppHeaderProps {
  onToggleMobileMenu?: () => void;
}

export function AppHeader({ onToggleMobileMenu }: AppHeaderProps) {
  const {
    currentRole,
    setCurrentRole,
    currentUser,
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
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-30 transition-all">
      {/* Left: Mobile Menu Toggle + Search */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Bar (Hidden on ultra-small screens or compact) */}
        <div className="relative w-48 sm:w-72 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search operations..."
            className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-300 transition-all"
          />
        </div>
      </div>

      {/* Right: Role Switcher + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Role Switcher Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5 sm:px-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Role:</span>
              <span className="truncate max-w-[90px] sm:max-w-[130px]">{ROLE_LABELS[currentRole].title}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-white border border-slate-200 shadow-lg rounded-2xl">
            <DropdownMenuLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 px-2 py-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              Switch RBAC Role (Live Session)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {rolesList.map((role) => {
              const info = ROLE_LABELS[role];
              const isSelected = currentRole === role;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`flex flex-col items-start gap-0.5 p-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs">{info.title}</span>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal leading-tight">
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
            <button className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2 bg-white border border-slate-200 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
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
                        ? 'text-slate-500 hover:bg-slate-50'
                        : 'bg-indigo-50/70 text-slate-800 font-medium hover:bg-indigo-100/70'
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
                      <div className="font-semibold text-[12px] text-slate-900">{notif.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {notif.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-3 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {ROLE_LABELS[currentRole].title}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 bg-white border border-slate-200 shadow-xl rounded-2xl">
            <DropdownMenuLabel className="px-2 py-1.5">
              <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/employees/emp_005" className="text-xs cursor-pointer flex items-center gap-2 text-slate-700 hover:text-slate-900 rounded-lg p-2">
                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                <span>My 360° Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-xs cursor-pointer flex items-center gap-2 text-slate-700 hover:text-slate-900 rounded-lg p-2">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                <span>Security & RBAC Logs</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
