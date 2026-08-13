'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Target,
  Award,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function PerformancePage() {
  const { performanceReviews, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'appraisals' | 'nine_box' | 'pip'>('appraisals');

  const review = performanceReviews[0];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Performance Management & Appraisal Cycles</span>
            <Badge variant="purple" className="text-xs">
              9-Box Grid & KRAs
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Goal setting, continuous 1-on-1 check-ins, self & manager ratings, and merit calibrations
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('appraisals')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'appraisals' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Annual Reviews
          </button>
          <button
            onClick={() => setActiveTab('nine_box')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'nine_box' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            9-Box Talent Matrix
          </button>
          <button
            onClick={() => setActiveTab('pip')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'pip' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            PIP Tracker (0)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. APPRAISALS & KRA BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'appraisals' && review && (
        <div className="space-y-6">
          {/* Active Review Hero Card */}
          <Card className="border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {review.employeeName} ({review.designation})
                  </h3>
                  <Badge variant="purple" className="text-[10px] capitalize">
                    {review.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Cycle: Annual Appraisal FY 2025-2026 • Department: {review.department}
                </p>
              </div>

              <div className="flex items-center gap-6 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Self Rating</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {review.selfRating} / 5.0
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Manager Rating</span>
                  <div className="text-xl font-bold text-indigo-600 font-mono">
                    {review.managerRating} / 5.0
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Final Calibrated</span>
                  <div className="text-xl font-bold text-emerald-600 font-mono">
                    {review.finalRating} / 5.0
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KRA Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Key Result Areas (KRAs) & Weightages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.kras.map((kra, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 dark:text-white text-sm">{kra.title}</span>
                    <Badge variant="outline" className="font-mono">
                      Weightage: {kra.weightage}%
                    </Badge>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">{kra.target}</p>
                  <div className="flex items-center gap-6 pt-2 text-slate-600 dark:text-slate-300 font-medium">
                    <span>Self Evaluation: <strong className="text-indigo-600">{kra.selfScore}/5</strong></span>
                    <span>Manager Rating: <strong className="text-emerald-600">{kra.managerScore}/5</strong></span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 9-BOX TALENT GRID VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'nine_box' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">9-Box Performance vs Potential Matrix</CardTitle>
            <p className="text-xs text-slate-400">Strategic talent distribution across engineering and business units</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Rough Diamond</span>
                <p className="text-[11px] text-slate-400 mt-1">High Potential, Low Performance</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">Future Star</span>
                <p className="text-[11px] text-slate-400 mt-1">High Potential, Medium Performance</p>
                <div className="mt-2 text-xs font-semibold">Karthik S.</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="font-bold text-emerald-600">Star (Top Talent)</span>
                <p className="text-[11px] text-slate-400 mt-1">High Potential, High Performance</p>
                <div className="mt-2 text-xs font-semibold text-emerald-600">Ananya Deshmukh (Lead Promotion)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Inconsistent Performer</span>
                <p className="text-[11px] text-slate-400 mt-1">Medium Potential, Low Performance</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Key Player</span>
                <p className="text-[11px] text-slate-400 mt-1">Medium Potential, Medium Performance</p>
                <div className="mt-2 text-xs font-semibold">Priya Sharma</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">High Performer</span>
                <p className="text-[11px] text-slate-400 mt-1">Medium Potential, High Performance</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20">
                <span className="font-bold text-rose-600">Talent Risk / Action</span>
                <p className="text-[11px] text-slate-400 mt-1">Low Potential, Low Performance</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Solid Professional</span>
                <p className="text-[11px] text-slate-400 mt-1">Low Potential, Medium Performance</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Trusted Contributor</span>
                <p className="text-[11px] text-slate-400 mt-1">Low Potential, High Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. PIP TRACKER VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'pip' && (
        <Card>
          <CardContent className="p-12 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <div className="font-bold text-sm text-slate-900 dark:text-white">Zero Active PIPs</div>
            <p>All active employees currently meet or exceed their quarterly KRA targets.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
