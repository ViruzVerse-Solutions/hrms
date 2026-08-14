'use client';

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex">
      {/* Sidebar: Fixed on Desktop, Drawer on Mobile */}
      <AppSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Header: Fixed top across all devices */}
        <AppHeader onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

        {/* Scrollable Main Area */}
        <main className="flex-1 pt-16 min-h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
