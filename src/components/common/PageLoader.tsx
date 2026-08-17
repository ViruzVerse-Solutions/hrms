'use client';

import React from 'react';
import { Factory, Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  subtext?: string;
}

export function PageLoader({
  message = 'Loading Viruzverse HRM...',
  subtext = 'Preparing workspace & security permissions...',
}: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md text-white transition-opacity duration-300 animate-in fade-in">
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Brand Icon Badge */}
        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-6 animate-pulse">
          <Factory className="h-8 w-8" />
        </div>

        {/* Brand Title */}
        <h3 className="text-xl font-bold tracking-tight text-slate-100">
          {message}
        </h3>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {subtext}
        </p>

        {/* Loading Spinner & Progress bar */}
        <div className="w-full mt-6 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-indigo-500 h-full w-2/3 animate-pulse rounded-full" />
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-indigo-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Synchronizing Enterprise State</span>
        </div>
      </div>
    </div>
  );
}
