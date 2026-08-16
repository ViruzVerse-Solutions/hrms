'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Building,
  GitPullRequest,
  Wallet,
  Users,
  X,
  History,
  Check,
  Lock,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { useAuth } from '@/context/AuthContext';

interface PendingItem {
  id: string;
  category: 'leaves' | 'requisitions' | 'transfers' | 'payroll' | 'exits' | 'holidays';
  categoryTitle: string;
  title: string;
  applicantName: string;
  applicantId: string;
  details: string;
  date: string;
  raw: any;
}

export default function ApprovalsPage() {
  return (
    <RBACGuard module="reports_dashboard">
      <ApprovalsContent />
    </RBACGuard>
  );
}

function ApprovalsContent() {
  const { currentRole, roleDetails, auditLogs } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Rejection modal state
  const [rejectingItem, setRejectingItem] = useState<PendingItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/approvals', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json();
      if (data?.data) {
        setItems(data.data.items || []);
        setCounts(data.data.counts || {});
      }
    } catch (err) {
      console.error('Failed to fetch approval queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [currentRole]);

  const handleApprove = async (item: PendingItem) => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          itemId: item.id,
          category: item.category,
          action: 'approve',
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchApprovals();
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;

    if (!rejectionReason.trim()) {
      setRejectionError('A mandatory rejection description / reason is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setRejectionError('');
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          itemId: rejectingItem.id,
          category: rejectingItem.category,
          action: 'reject',
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRejectingItem(null);
        setRejectionReason('');
        fetchApprovals();
      } else {
        setRejectionError(data.error || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
      setRejectionError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManagementRole = ['managing_director', 'chairman', 'hr_head', 'compliance_statutory', 'internal_audit_head'].includes(currentRole);

  const filteredItems = activeTab === 'all'
    ? items
    : items.filter((i) => i.category === activeTab);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Executive Approvals & Audit Hub</span>
            <Badge variant="purple" className="text-xs">
              Role-Scoped Governance
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review pending leaves, job requisitions, transfers, payroll runs, and policies for <strong className="text-indigo-600">{roleDetails.title}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono font-bold bg-white">
            {counts.all || 0} Pending Approvals
          </Badge>
        </div>
      </div>

      {/* Role Notice Banner */}
      {!isManagementRole && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-amber-800">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Standard employees only view personal self-service requests. Executive approval tools are restricted to Management Roles.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Leave Applications</span>
              <Clock className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-indigo-600 font-mono">
              {counts.leaves || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending HR & Manager Review</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Requisitions & Transfers</span>
              <GitPullRequest className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-purple-600 font-mono">
              {(counts.requisitions || 0) + (counts.transfers || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending MD / Board Sanction</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Payroll Disbursals</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-emerald-600 font-mono">
              {counts.payroll || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending Disbursal Authorization</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Holidays & Policies</span>
              <FileCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-amber-600 font-mono">
              {counts.holidays || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending Executive Sign-off</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 gap-1 max-w-full overflow-x-auto">
          <TabsTrigger value="all" className="text-xs px-3 py-1.5">
            All Pending ({counts.all || 0})
          </TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs px-3 py-1.5">
            Leaves ({counts.leaves || 0})
          </TabsTrigger>
          <TabsTrigger value="requisitions" className="text-xs px-3 py-1.5">
            Requisitions ({counts.requisitions || 0})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs px-3 py-1.5">
            Transfers & Promotions ({counts.transfers || 0})
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs px-3 py-1.5">
            Payroll Runs ({counts.payroll || 0})
          </TabsTrigger>
          <TabsTrigger value="exits" className="text-xs px-3 py-1.5">
            Exits & F&F ({counts.exits || 0})
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs px-3 py-1.5">
            Holidays & Policies ({counts.holidays || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab Content Queue */}
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Pending Approval Queue</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredItems.length} Items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">Syncing approval items from database...</div>
              ) : filteredItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <span>No pending approval items for your role. You are all caught up!</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                            {item.categoryTitle}
                          </Badge>
                          <span className="font-bold text-sm text-slate-900">{item.title}</span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                          <span>Applicant: <strong className="text-slate-900">{item.applicantName}</strong></span>
                          <span>Submitted: {formatDate(item.date)}</span>
                        </div>
                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono">
                          {item.details}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          disabled={isSubmitting}
                          onClick={() => handleApprove(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3 gap-1.5 shadow-sm"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve</span>
                        </Button>

                        <Button
                          disabled={isSubmitting}
                          onClick={() => {
                            setRejectingItem(item);
                            setRejectionReason('');
                            setRejectionError('');
                          }}
                          variant="destructive"
                          className="text-xs h-9 px-3 gap-1.5 shadow-sm"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject / Cancel</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mandatory Rejection Description Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <span>Mandatory Rejection Description</span>
              </h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="font-bold text-rose-900">{rejectingItem.title}</div>
                <div className="text-rose-700">Applicant: {rejectingItem.applicantName}</div>
              </div>

              {rejectionError && (
                <div className="p-3 rounded-xl bg-rose-100 text-rose-800 font-semibold text-xs border border-rose-200">
                  {rejectionError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rejection / Cancellation Reason (Mandatory)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Specify clear business justification, coverage constraint, or policy reason for rejecting this request..."
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  This cancellation description will be permanently logged in PostgreSQL Audit Logs and communicated to the applicant.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setRejectingItem(null)}>
                  Keep Request Pending
                </Button>
                <Button type="submit" disabled={isSubmitting} variant="destructive" className="gap-1.5">
                  <XCircle className="h-4 w-4" />
                  <span>Confirm Rejection</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
