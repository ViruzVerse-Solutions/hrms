'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-indigo-100 rounded-xl" />
      </div>

      {/* KPI Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-8 w-28 bg-slate-200 rounded-md" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Content Table / Card Skeleton */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-9 w-24 bg-slate-100 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 pt-4">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        <span>Loading workforce analytics & permissions...</span>
      </div>
    </div>
  );
}
