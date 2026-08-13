'use client';

import React from 'react';
import { LIFECYCLE_STAGES } from '@/lib/mock-data';
import { LifecycleStageKey } from '@/types';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifecycleTimelineProps {
  currentStage: LifecycleStageKey;
  className?: string;
}

export function LifecycleTimeline({ currentStage, className }: LifecycleTimelineProps) {
  const currentStageIndex = LIFECYCLE_STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className={cn("p-6 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Employee 360° Lifecycle Journey</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
              17-Stage Flow
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            End-to-end historical record from hire to exit closure
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Current Phase: </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {LIFECYCLE_STAGES[currentStageIndex]?.label || currentStage}
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Step Bar */}
      <div className="overflow-x-auto pb-3 pt-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <div className="flex items-center min-w-[1100px] px-2">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <React.Fragment key={stage.key}>
                {/* Node */}
                <div className="flex flex-col items-center group cursor-pointer relative shrink-0 w-28 text-center">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm",
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : isCurrent
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-indigo-500/30 scale-110"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
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
                      "mt-2 text-[11px] font-medium leading-tight line-clamp-2 px-1",
                      isCurrent
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : isCompleted
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 -mt-6 transition-colors duration-300",
                      idx < currentStageIndex ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
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
