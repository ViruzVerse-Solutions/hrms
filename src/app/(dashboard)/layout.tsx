'use client';

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { NavigationProgress } from '@/components/common/NavigationProgress';
import { purgeExpiredCache } from '@/lib/cache';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Purge expired cache items on dashboard initialization
    purgeExpiredCache();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex max-w-full overflow-x-hidden">
      {/* Top Page Route Transition Loader */}
      <NavigationProgress />

      {/* Sidebar: Fixed on Desktop, Drawer on Mobile */}
      <AppSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 max-w-full">
        {/* Header: Fixed top across all devices */}
        <AppHeader onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

        {/* Scrollable Main Area */}
        <main className="flex-1 pt-16 min-h-screen overflow-y-auto w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
