'use client';

import React from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
