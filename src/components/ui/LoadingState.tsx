'use client';

import React from 'react';

// 1. Primitive Shimmer Skeleton Element for Individual Fields
export function FieldSkeleton({
  className = 'h-4 w-full',
  rounded = 'rounded-lg',
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className} shrink-0`}
      aria-hidden="true"
    />
  );
}

// 2. Table Shimmer Skeleton (Matching Enterprise Data Tables)
export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full space-y-4">
      {/* Top action/filter bar skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <FieldSkeleton className="h-9 w-64 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FieldSkeleton className="h-9 w-28 rounded-xl" />
          <FieldSkeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Table Surface */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <FieldSkeleton className="h-4 w-40" />
          <FieldSkeleton className="h-4 w-20" />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <FieldSkeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <FieldSkeleton className="h-3.5 w-3/4" />
                  <FieldSkeleton className="h-2.5 w-1/2" />
                </div>
              </div>
              <FieldSkeleton className="h-3.5 w-24 hidden md:block" />
              <FieldSkeleton className="h-3.5 w-20 hidden sm:block" />
              <FieldSkeleton className="h-6 w-16 rounded-full" />
              <FieldSkeleton className="h-8 w-16 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Stat Cards Grid Skeleton (KPI Metrics)
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <FieldSkeleton className="h-3.5 w-24" />
            <FieldSkeleton className="h-8 w-8 rounded-xl" />
          </div>
          <FieldSkeleton className="h-7 w-28" />
          <FieldSkeleton className="h-2.5 w-36" />
        </div>
      ))}
    </div>
  );
}

// Helper card for layout
function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <FieldSkeleton className="h-5 w-40" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <FieldSkeleton className="h-3.5 w-24" />
            <FieldSkeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Employee 360 Profile Header & Tabs Skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <FieldSkeleton className="h-20 w-20 rounded-3xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <FieldSkeleton className="h-6 w-48" />
                <FieldSkeleton className="h-5 w-16 rounded-full" />
              </div>
              <FieldSkeleton className="h-4 w-32" />
              <div className="flex items-center gap-3 pt-1">
                <FieldSkeleton className="h-4 w-20 rounded-md" />
                <FieldSkeleton className="h-4 w-28" />
                <FieldSkeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FieldSkeleton className="h-9 w-28 rounded-xl" />
            <FieldSkeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Skeleton */}
      <div className="flex items-center gap-2">
        <FieldSkeleton className="h-9 w-28 rounded-xl" />
        <FieldSkeleton className="h-9 w-32 rounded-xl" />
        <FieldSkeleton className="h-9 w-28 rounded-xl" />
        <FieldSkeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export const DossierSkeleton = ProfileSkeleton;

// 5. Form Field Skeleton (Modals and Settings)
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <FieldSkeleton className="h-3.5 w-24" />
            <FieldSkeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <FieldSkeleton className="h-9 w-20 rounded-xl" />
        <FieldSkeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

// 5. Kanban Board Column Skeleton
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3.5"
        >
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <FieldSkeleton className="h-2.5 w-2.5 rounded-full" />
              <FieldSkeleton className="h-4 w-24" />
            </div>
            <FieldSkeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 + (colIdx % 2) }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <FieldSkeleton className="h-4 w-16 rounded-md" />
                  <FieldSkeleton className="h-4 w-12 rounded-full" />
                </div>
                <FieldSkeleton className="h-4 w-4/5" />
                <FieldSkeleton className="h-3 w-3/5" />
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <FieldSkeleton className="h-5 w-24 rounded-full" />
                  <FieldSkeleton className="h-4 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface LoadingStateProps {
  title?: string;
  message?: string;
  variant?:
    | 'table'
    | 'cards'
    | 'dashboard'
    | 'profile'
    | 'dossier'
    | 'form'
    | 'kanban'
    | 'field'
    | 'inline';
  rows?: number;
  cols?: number;
  count?: number;
}

// 6. Master Layout-Aware Skeleton Component
export function LoadingState({
  variant = 'table',
  rows = 5,
  cols = 5,
  count = 4,
}: LoadingStateProps) {
  if (variant === 'field' || variant === 'inline') {
    return <FieldSkeleton className="h-4 w-32 rounded-md inline-block align-middle" />;
  }

  if (variant === 'profile' || variant === 'dossier') {
    return <ProfileSkeleton />;
  }

  if (variant === 'form') {
    return <FormSkeleton fields={rows * 2} />;
  }

  if (variant === 'cards') {
    return <StatCardsSkeleton count={count} />;
  }

  if (variant === 'kanban') {
    return <KanbanSkeleton columns={count} />;
  }

  if (variant === 'dashboard') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
        {/* Welcome Banner Skeleton */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <FieldSkeleton className="h-4 w-36 rounded-md" />
          <FieldSkeleton className="h-7 w-64" />
          <FieldSkeleton className="h-3.5 w-full max-w-xl" />
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <FieldSkeleton className="h-3.5 w-24" />
                <FieldSkeleton className="h-8 w-8 rounded-xl" />
              </div>
              <FieldSkeleton className="h-7 w-28" />
              <FieldSkeleton className="h-2.5 w-36" />
            </div>
          ))}
        </div>

        {/* 2 Analytics / Queue Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <FieldSkeleton className="h-5 w-48" />
            <FieldSkeleton className="h-56 w-full rounded-xl" />
          </div>
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <FieldSkeleton className="h-5 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <FieldSkeleton className="h-3.5 w-28" />
                    <FieldSkeleton className="h-2.5 w-20" />
                  </div>
                  <FieldSkeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Table & Directory layout Skeleton
  return <TableSkeleton rows={rows} cols={cols} />;
}
