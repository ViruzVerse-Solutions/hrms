'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  Plus,
  Search,
  Filter,
  Calendar,
  Star,
  CheckCircle2,
  FileText,
  Clock,
  Briefcase,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Candidate, ManpowerRequisition } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function RecruitmentPage() {
  return (
    <RBACGuard module="recruitment">
      <RecruitmentContent />
    </RBACGuard>
  );
}

function RecruitmentContent() {
  const {
    candidates,
    requisitions,
    updateCandidateStage,
    addRequisition,
    can,
    currentUser,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'requisitions'>('pipeline');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // New Requisition Form State
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    positionTitle: '',
    departmentId: 'dept_qc',
    departmentName: 'Quality Assurance & Analytical Lab',
    openingsCount: 1,
    urgency: 'high' as const,
    minExperience: '5+ Years',
    targetDate: '2026-09-30',
    justification: '',
  });

  const stages: Array<{ keys: string[]; label: string; color: string }> = [
    { keys: ['applied'], label: 'Applied', color: 'border-slate-300 dark:border-slate-700' },
    { keys: ['screened', 'shortlisted'], label: 'Screened / Shortlisted', color: 'border-blue-400 dark:border-blue-700' },
    { keys: ['interview', 'technical_eval', 'hr_round'], label: 'Interview Round', color: 'border-purple-400 dark:border-purple-700' },
    { keys: ['offered', 'hired', 'selected'], label: 'Offered / Selected', color: 'border-emerald-400 dark:border-emerald-700' },
  ];

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    addRequisition({
      ...reqForm,
      requestedById: currentUser.employeeId || 'emp_001',
      requestedByName: currentUser.name,
    });
    setReqModalOpen(false);
  };

  const advanceStage = (candidateId: string, current: string) => {
    const nextMap: Record<string, Candidate['currentStage']> = {
      applied: 'screened',
      shortlisted: 'interview',
      screened: 'interview',
      interview: 'offered',
      technical_eval: 'interview',
      hr_round: 'offered',
      offered: 'selected',
      hired: 'selected',
      selected: 'selected',
      rejected: 'rejected',
    };
    updateCandidateStage(candidateId, (nextMap[current] || 'offered') as Candidate['currentStage']);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Recruitment & Talent Acquisition</span>
            <Badge variant="purple" className="text-xs">
              Kanban Pipeline
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Requisitions, candidate tracking, interviewer scorecards, and hiring pipelines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Candidate Pipeline
            </button>
            <button
              onClick={() => setActiveTab('requisitions')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'requisitions'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Manpower Requisitions ({requisitions.length})
            </button>
          </div>

          <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-sm text-xs">
                <Plus className="h-4 w-4" />
                <span>New Requisition</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Raise Manpower Requisition</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRequisition} className="space-y-4 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Position Title</label>
                  <Input
                    required
                    placeholder="e.g. Senior Cloud Architect"
                    value={reqForm.positionTitle}
                    onChange={(e) => setReqForm({ ...reqForm, positionTitle: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Openings Count</label>
                    <Input
                      type="number"
                      min={1}
                      value={reqForm.openingsCount}
                      onChange={(e) => setReqForm({ ...reqForm, openingsCount: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Urgency</label>
                    <select
                      value={reqForm.urgency}
                      onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value as any })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Target Closure Date</label>
                  <Input
                    type="date"
                    value={reqForm.targetDate}
                    onChange={(e) => setReqForm({ ...reqForm, targetDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Hiring Justification</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Business need & project allocation details..."
                    value={reqForm.justification}
                    onChange={(e) => setReqForm({ ...reqForm, justification: e.target.value })}
                    className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Submit Requisition for HR Approval
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PIPELINE KANBAN VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {stages.map((stage) => {
            const stageCandidates = candidates.filter((c) => stage.keys.includes(c.currentStage));

            return (
              <div key={stage.label} className="space-y-3">
                {/* Column Header */}
                <div className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border ${stage.color} flex items-center justify-between shadow-sm`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {stage.label}
                    </span>
                    <span className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-400">
                      {stageCandidates.length}
                    </span>
                  </div>
                </div>

                {/* Candidate Cards */}
                <div className="space-y-3 min-h-[400px]">
                  {stageCandidates.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-slate-400">
                      No candidates in {stage.label}
                    </div>
                  ) : (
                    stageCandidates.map((candidate) => (
                      <Card
                        key={candidate.id}
                        className="hover:shadow-md hover:border-indigo-500/40 transition-all cursor-pointer group"
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                {candidate.name}
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                {candidate.experienceYears} yrs exp • {candidate.department}
                              </span>
                            </div>
                            {candidate.score && (
                              <Badge variant="success" className="text-[10px] gap-1 font-mono">
                                <Star className="h-3 w-3 fill-emerald-500" />
                                <span>{candidate.score}%</span>
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {candidate.position}
                          </div>

                          {candidate.interviewerScorecard && (
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-slate-500">Scorecard Rating:</span>
                                <span className="text-emerald-600 font-bold">
                                  {candidate.interviewerScorecard.technicalRating} / 5.0
                                </span>
                              </div>
                              <p className="text-slate-400 line-clamp-1 italic">
                                "{candidate.interviewerScorecard.comments}"
                              </p>
                            </div>
                          )}

                          {candidate.offerDetails && (
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] flex justify-between items-center">
                              <span className="text-slate-500">Offered CTC:</span>
                              <span className="font-mono font-bold text-emerald-600">
                                {formatCurrency(candidate.offerDetails.offeredCtc)}
                              </span>
                            </div>
                          )}

                          {/* Quick Advance Button */}
                          <div className="pt-2 border-t flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] gap-1 text-indigo-600 hover:text-indigo-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                advanceStage(candidate.id, candidate.currentStage);
                              }}
                            >
                              <span>Next Stage</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REQUISITIONS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          {requisitions.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {req.positionTitle}
                    </h3>
                    <Badge variant={req.urgency === 'high' ? 'destructive' : 'warning'} className="text-[10px] uppercase">
                      {req.urgency} Priority
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {req.openingsCount} Openings
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">
                    {req.justification}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Dept: {req.departmentName}</span>
                    <span>Requested by: {req.requestedByName}</span>
                    <span>Target: {formatDate(req.targetDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={req.status === 'approved' ? 'success' : 'warning'} className="text-xs capitalize">
                    {req.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
