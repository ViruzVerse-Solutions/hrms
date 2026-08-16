'use client';

import React, { useState } from 'react';
import { LIFECYCLE_STAGES, EXECUTIVE_LIFECYCLE_STAGES } from '@/lib/constants';
import { LifecycleStageKey, LifecycleTrack, UserRole } from '@/types';
import { CheckCircle2, Clock, Crown, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LifecycleTimelineProps {
  currentStage?: LifecycleStageKey | string;
  track?: LifecycleTrack;
  role?: UserRole | string;
  designationTitle?: string;
  className?: string;
  hideIfExempt?: boolean;
  allowTrackSwitch?: boolean;
}

export function LifecycleTimeline({
  currentStage,
  track,
  role,
  designationTitle,
  className,
  hideIfExempt = true,
  allowTrackSwitch = false,
}: LifecycleTimelineProps) {
  // 1. Determine whether this entity is exempt (e.g. Chairman / Board Governance)
  const isChairmanOrBoard =
    track === 'board_governance' ||
    track === 'exempt' ||
    role === 'chairman' ||
    designationTitle?.toLowerCase().includes('chairman') ||
    designationTitle?.toLowerCase().includes('board of director');

  if (isChairmanOrBoard) {
    // If exempt and hideIfExempt is true (default), completely remove it
    if (hideIfExempt) {
      return null;
    }

    // Optional informational banner if explicitly requested to display exemption
    return (
      <div className={cn("p-5 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-between gap-4", className)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Board Governance & Fiduciary Mandate</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                Lifecycle Exempt
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Board members and Non-Executive Directors operate under corporate bylaws and are exempt from routine operational staff tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Determine initial track (Executive vs Standard Staff)
  const isExecutiveDetected =
    track === 'executive' ||
    role === 'managing_director' ||
    (designationTitle && /(managing director|director|chief executive|ceo|president|c-suite|vice president|vp)/i.test(designationTitle)) ||
    (currentStage && currentStage.startsWith('exec_'));

  const [activeTrack, setActiveTrack] = useState<LifecycleTrack>(
    track || (isExecutiveDetected ? 'executive' : 'standard_staff')
  );

  const stages = activeTrack === 'executive' ? EXECUTIVE_LIFECYCLE_STAGES : LIFECYCLE_STAGES;

  // Resolve current stage index
  let effectiveStage = currentStage;
  if (!effectiveStage) {
    effectiveStage = activeTrack === 'executive' ? 'exec_appointment' : 'onboarding';
  } else if (activeTrack === 'executive' && !effectiveStage.startsWith('exec_')) {
    // Map standard onboarding/active to executive equivalent for preview
    effectiveStage = 'exec_appointment';
  } else if (activeTrack === 'standard_staff' && effectiveStage.startsWith('exec_')) {
    effectiveStage = 'onboarding';
  }

  let currentStageIndex = stages.findIndex((s) => s.key === effectiveStage);
  if (currentStageIndex === -1) {
    currentStageIndex = activeTrack === 'executive' ? 2 : 5; // Default to Appointment or Onboarding
  }

  const currentStageObj = stages[currentStageIndex];

  return (
    <div className={cn("p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm transition-all duration-300", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {activeTrack === 'executive' ? (
                <>
                  <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Executive 360° Leadership Journey</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Employee 360° Lifecycle Journey</span>
                </>
              )}
            </h3>

            {activeTrack === 'executive' ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                8-Stage Executive Track
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                17-Stage Operational Flow
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeTrack === 'executive'
              ? 'Board-mandated executive milestones from nomination & agreement to strategic review'
              : 'End-to-end historical record from talent sourcing & joining to clearance and archival'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {allowTrackSwitch && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTrack('standard_staff')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  activeTrack === 'standard_staff'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Staff (17)
              </button>
              <button
                type="button"
                onClick={() => setActiveTrack('executive')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  activeTrack === 'executive'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Executive (8)
              </button>
            </div>
          )}

          <div className="text-right pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Current Phase</div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {currentStageObj?.label || effectiveStage}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Step Bar */}
      <div className="overflow-x-auto pb-3 pt-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <div
          className={cn(
            "flex items-center px-2",
            activeTrack === 'executive' ? "min-w-[800px]" : "min-w-[1100px]"
          )}
        >
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <React.Fragment key={stage.key}>
                {/* Node */}
                <div
                  className="flex flex-col items-center group cursor-pointer relative shrink-0 w-28 text-center"
                  title={stage.description}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm",
                      isCompleted
                        ? activeTrack === 'executive'
                          ? "bg-purple-600 text-white shadow-purple-500/20"
                          : "bg-emerald-500 text-white shadow-emerald-500/20"
                        : isCurrent
                        ? activeTrack === 'executive'
                          ? "bg-indigo-600 text-white ring-4 ring-purple-500/20 shadow-indigo-500/30 scale-110"
                          : "bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-indigo-500/30 scale-110"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:border-slate-300"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Clock className="h-4 w-4 animate-spin-slow" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[11px] font-medium leading-tight line-clamp-2 px-1 transition-colors",
                      isCurrent
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : isCompleted
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  >
                    {stage.label}
                  </span>
                  
                  {/* Subtle Tooltip description on hover */}
                  <div className="absolute top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 bg-slate-900 text-white text-[10px] rounded-lg p-2 shadow-lg w-36 -translate-x-1/2 left-1/2">
                    <div className="font-bold text-indigo-300">{stage.label}</div>
                    <div className="text-slate-300 mt-0.5">{stage.description}</div>
                  </div>
                </div>

                {/* Connecting Line */}
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 -mt-6 transition-colors duration-300",
                      idx < currentStageIndex
                        ? activeTrack === 'executive'
                          ? "bg-purple-600"
                          : "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
