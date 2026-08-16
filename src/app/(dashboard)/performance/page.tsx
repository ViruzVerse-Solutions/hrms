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
import { RBACGuard } from '@/components/layout/RBACGuard';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/LoadingState';

export default function PerformancePage() {
  return (
    <RBACGuard module="performance_mgmt">
      <PerformanceContent />
    </RBACGuard>
  );
}

function PerformanceContent() {
  const { performanceReviews, currentRole, logAuditAction, isLoadingData } = useAuth();
  const [activeTab, setActiveTab] = useState<'appraisals' | 'nine_box' | 'pip'>('appraisals');
  const [reviewsList, setReviewsList] = useState(performanceReviews);
  const [isLoading, setIsLoading] = useState(false);
  const [selfAppraisalModalOpen, setSelfAppraisalModalOpen] = useState(false);
  const [selfRating, setSelfRating] = useState('4.8');
  const [achievements, setAchievements] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  React.useEffect(() => {
    setIsLoading(true);
    fetch('/api/performance', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.performanceReviews) {
          setReviewsList(data.data.performanceReviews);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentRole]);

  const isEmployee = currentRole === 'employee';
  const review = reviewsList[0] || null;

  const handleSubmitSelfAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          selfRating: Number(selfRating),
          achievements,
          cycleName: 'Annual Appraisal FY 2025-2026',
        }),
      });

      const data = await res.json();
      if (data?.success) {
        setSubmitSuccess('Your self-appraisal ratings and achievements have been submitted to DB successfully!');
        if (logAuditAction) {
          logAuditAction('SUBMITTED_SELF_APPRAISAL', 'performance_mgmt', 'appraisal_1', `Submitted rating ${selfRating}/5.0`);
        }
        setTimeout(() => {
          setSelfAppraisalModalOpen(false);
          setSubmitSuccess('');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to submit self-appraisal:', err);
    }
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isEmployee ? 'My Self-Appraisal & KRA Evaluation' : 'Performance Management & Appraisal Cycles'}</span>
            <Badge variant="purple" className="text-xs">
              9-Box Grid & KRAs
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEmployee
              ? 'Submit your annual self-ratings, document key achievements, and review manager calibrations.'
              : 'Goal setting, continuous 1-on-1 check-ins, self & manager ratings, and merit calibrations'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEmployee && (
            <Dialog open={selfAppraisalModalOpen} onOpenChange={setSelfAppraisalModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md">
                  <Award className="h-4 w-4" />
                  <span>Submit Self-Appraisal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Annual Self-Appraisal Form (FY 2025-2026)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitSelfAppraisal} className="space-y-4 pt-2 text-xs">
                  {submitSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                      {submitSuccess}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Overall Self-Rating (1.0 to 5.0)</label>
                    <select
                      value={selfRating}
                      onChange={(e) => setSelfRating(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold font-mono"
                    >
                      <option value="5.0">5.0 — Outstanding / Exceeds Expectations</option>
                      <option value="4.8">4.8 — Highly Effective Star</option>
                      <option value="4.5">4.5 — Exceeds Most Expectations</option>
                      <option value="4.0">4.0 — Meets All Expectations</option>
                      <option value="3.5">3.5 — Partially Meets Target</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Key Achievements & Highlights</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Detail key process improvements, EHS safety compliance, batch yield optimizations, and project deliveries..."
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Calibration Routing</span>
                    </div>
                    <p className="text-[11px]">
                      Your self-appraisal score will be routed to your Department Manager and HR Head for 9-Box Grid calibration.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="outline" onClick={() => setSelfAppraisalModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Submit Self-Appraisal
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

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
      </div>

      {/* ========================================================================= */}
      {/* 1. APPRAISALS & KRA BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'appraisals' && (
        review ? (
          <div className="space-y-6">

            {/* Active Review Hero Card */}
            <Card className="border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {review.employeeName} {review.designation ? `(${review.designation})` : ''}
                    </h3>
                    <Badge variant="purple" className="text-[10px] capitalize">
                      {review.status?.replace('_', ' ') || 'Completed'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cycle: {review.cycleName || 'Annual Appraisal FY 2025-2026'} • Department: {review.department || 'Operations & Technical Services'}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Self Rating</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                      {review.selfRating || 4.5} / 5.0
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Manager Rating</span>
                    <div className="text-xl font-bold text-indigo-600 font-mono">
                      {review.managerRating || 4.7} / 5.0
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Final Calibrated</span>
                    <div className="text-xl font-bold text-emerald-600 font-mono">
                      {review.finalRating || 4.6} / 5.0
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
                {(review.kras && review.kras.length > 0 ? review.kras : [
                  { title: 'Core Process & Quality Compliance', weightage: 40, target: 'Zero procedural deviations and adherence to cGMP/ISO guidelines', selfScore: Number(review.selfRating || 4.5), managerScore: Number(review.managerRating || 4.7) },
                  { title: 'Operational Efficiency & Turnaround', weightage: 35, target: 'Achieve >95% SLA adherence across batch processes and analysis', selfScore: Number(review.selfRating || 4.5), managerScore: Number(review.managerRating || 4.7) },
                  { title: 'Team Collaboration & Plant Safety', weightage: 25, target: 'Active participation in EHS audits and junior team mentoring', selfScore: Number(review.selfRating || 4.5), managerScore: Number(review.managerRating || 4.7) },
                ]).map((kra: any, idx: number) => (
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
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Target className="h-8 w-8 text-indigo-500 mx-auto" />
              <div className="font-bold text-sm text-slate-900 dark:text-white">No Appraisal Records Found</div>
              <p>No active performance reviews currently assigned for your role.</p>
            </CardContent>
          </Card>
        )
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
                <div className="mt-2 text-xs font-semibold text-emerald-600">Vishwadharan R (Lead Promotion)</div>
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
