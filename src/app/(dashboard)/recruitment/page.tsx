'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  Building2,
  FileText,
  Check,
  X,
  ChevronRight,
  Star,
  Download,
  Eye,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { useAuth } from '@/context/AuthContext';
import { Candidate, ManpowerRequisition } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/LoadingState';

export default function RecruitmentPage() {
  return (
    <RBACGuard module="recruitment">
      <RecruitmentContent />
    </RBACGuard>
  );
}

function RecruitmentContent() {
  const {
    requisitions,
    candidates,
    addRequisition,
    updateCandidateStage,
    currentRole,
    currentUser,
    isLoadingData,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'requisitions'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // New Requisition Form State
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const targetDateObj = new Date();
  targetDateObj.setDate(targetDateObj.getDate() + 30);
  const defaultTargetDate = targetDateObj.toISOString().split('T')[0];

  const [reqForm, setReqForm] = useState({
    positionTitle: '',
    departmentId: '',
    departmentName: '',
    openingsCount: 1,
    urgency: 'high' as const,
    minExperience: '5+ Years',
    targetDate: defaultTargetDate,
    justification: '',
  });

  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    fetch('/api/master')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.departments) {
          setDepartmentsList(data.data.departments);
        }
      })
      .catch(() => {});
  }, []);

  if (isLoadingData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="dashboard" />
      </div>
    );
  }

  const stages: Array<{ keys: string[]; label: string; color: string }> = [
    { keys: ['applied'], label: 'Applied', color: 'border-slate-300 dark:border-slate-700' },
    { keys: ['screened', 'shortlisted'], label: 'Screened / Shortlisted', color: 'border-blue-400 dark:border-blue-700' },
    { keys: ['interview', 'technical_eval', 'hr_round'], label: 'Interview Round', color: 'border-purple-400 dark:border-purple-700' },
    { keys: ['offered', 'hired', 'selected'], label: 'Offered / Selected', color: 'border-emerald-400 dark:border-emerald-700' },
  ];

  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReq) return;
    setIsSubmittingReq(true);

    try {
      await addRequisition({
        ...reqForm,
        requestedById: currentUser.employeeId || currentUser.id,
        requestedByName: `${currentUser.name} (HR Head)`,
      });
      setReqModalOpen(false);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleApproveRequisition = async (requisitionId: string) => {
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ action: 'approve_requisition', requisitionId }),
      });
      const data = await res.json();
      if (data?.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to approve requisition:', err);
    }
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

  const canApproveExecutive = ['managing_director', 'chairman'].includes(currentRole);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Recruitment & Talent Acquisition</span>
            <Badge variant="purple" className="text-xs">
              Kanban Pipeline & Requisitions
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Job requisitions, multi-tier executive sanctions, candidate tracking, and hiring pipelines
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
              Job Requisitions ({requisitions.length})
            </button>
          </div>

          <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4" />
                <span>Create Requisition</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Job Requisition</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRequisition} className="space-y-4 pt-2 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Position Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior QC Analytical Chemist"
                    value={reqForm.positionTitle}
                    onChange={(e) => setReqForm({ ...reqForm, positionTitle: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Target Department</label>
                  <select
                    required
                    value={reqForm.departmentId}
                    onChange={(e) => {
                      const selectedDept = departmentsList.find((d) => d.id === e.target.value);
                      setReqForm({
                        ...reqForm,
                        departmentId: e.target.value,
                        departmentName: selectedDept ? selectedDept.name : '',
                      });
                    }}
                    className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">Select Target Department...</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Openings Count</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={reqForm.openingsCount}
                      onChange={(e) => setReqForm({ ...reqForm, openingsCount: Number(e.target.value) })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Urgency Level</label>
                    <select
                      value={reqForm.urgency}
                      onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value as any })}
                      className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical / Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Justification & Hiring Plan</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Reason for headcount request, shift requirements, or budget approval details..."
                    value={reqForm.justification}
                    onChange={(e) => setReqForm({ ...reqForm, justification: e.target.value })}
                    className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="p-3 bg-indigo-50 border rounded-xl text-[11px] text-indigo-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Approval Governance Workflow</span>
                  </div>
                  <p>
                    Requisitions submitted by <strong>HR Head</strong> enter <span className="font-mono text-amber-700">pending_approval</span> state and require <strong>Managing Director (MD)</strong> budget sanction before candidate screening begins.
                  </p>
                </div>

                <Button type="submit" disabled={isSubmittingReq} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                  {isSubmittingReq ? 'Submitting...' : 'Submit Requisition for MD Sanction'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 1. PIPELINE KANBAN VIEW */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {stages.map((stage) => {
            const stageCandidates = candidates.filter((c) => stage.keys.includes(c.currentStage));

            return (
              <div key={stage.label} className="space-y-3">
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

      {/* 2. REQUISITIONS VIEW */}
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
                    <Badge variant={req.urgency === 'high' || req.urgency === 'critical' ? 'destructive' : 'warning'} className="text-[10px] uppercase">
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
                    <span>Requested by: <strong>{req.requestedByName || 'HR Head / Operations'}</strong></span>
                    <span>Target: {formatDate(req.targetDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant={req.status === 'approved' ? 'success' : req.status === 'pending_approval' ? 'warning' : 'outline'}
                    className="text-xs capitalize"
                  >
                    {req.status === 'pending_approval' ? 'Pending MD Sanction' : req.status}
                  </Badge>

                  {req.status === 'pending_approval' && canApproveExecutive && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequisition(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Budget Sanction</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
