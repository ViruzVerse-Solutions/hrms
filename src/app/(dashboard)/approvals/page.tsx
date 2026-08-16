'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  GitPullRequest,
  Wallet,
  Users,
  Lock,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Briefcase,
  LogOut,
  HeartHandshake,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  ApprovalCategory,
  canUserApproveCategory,
  canUserViewApprovalCategory,
} from '@/lib/rbac';

interface PendingItem {
  id: string;
  category: ApprovalCategory;
  categoryTitle: string;
  title: string;
  applicantName: string;
  applicantId: string;
  details: string;
  date: string;
  targetUrl?: string;
  canApprove?: boolean;
  meta?: Record<string, any>;
  raw: any;
}

const CATEGORY_STYLES: Record<ApprovalCategory, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  leaves: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200', icon: Clock },
  requisitions: { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200', icon: GitPullRequest },
  transfers: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200', icon: Users },
  payroll: { bg: 'bg-teal-50 text-teal-700', text: 'text-teal-700', border: 'border-teal-200', icon: Wallet },
  exits: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200', icon: AlertOctagon },
  holidays: { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200', icon: Building },
  disciplinary: { bg: 'bg-red-50 text-red-700', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
};

// In-memory cache for instant screen navigation
let cachedApprovals: { role: string; data: { items: PendingItem[]; counts: Record<string, number> }; timestamp: number } | null = null;

export default function ApprovalsPage() {
  return (
    <RBACGuard module="reports_dashboard">
      <ApprovalsContent />
    </RBACGuard>
  );
}

function ApprovalsContent() {
  const router = useRouter();
  const { currentRole, roleDetails } = useAuth();

  const isCacheValid = cachedApprovals && cachedApprovals.role === currentRole && (Date.now() - cachedApprovals.timestamp < 60000);
  const [items, setItems] = useState<PendingItem[]>(isCacheValid ? cachedApprovals!.data.items : []);
  const [counts, setCounts] = useState<Record<string, number>>(isCacheValid ? cachedApprovals!.data.counts : {});
  const [isLoading, setIsLoading] = useState(!isCacheValid);
  const [activeTab, setActiveTab] = useState('all');

  const fetchApprovals = async (force = false) => {
    if (!force && isCacheValid) return;

    try {
      if (items.length === 0) setIsLoading(true);
      const res = await fetch('/api/approvals', {
        headers: { 'x-user-role': currentRole },
      });
      if (!res.ok) {
        console.error('Failed to fetch approval queue, status:', res.status);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.data) {
        const newItems = data.data.items || [];
        const newCounts = data.data.counts || {};
        setItems(newItems);
        setCounts(newCounts);
        cachedApprovals = { role: currentRole, data: { items: newItems, counts: newCounts }, timestamp: Date.now() };
      }
    } catch (err) {
      console.error('Failed to fetch approval queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals(false);
  }, [currentRole]);

  const isManagementRole = ['managing_director', 'chairman', 'hr_head', 'compliance_statutory', 'internal_audit_head'].includes(currentRole);

  const availableTabs: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'All Pending', count: counts.all || 0 },
    ...(canUserViewApprovalCategory(currentRole, 'leaves') ? [{ key: 'leaves', label: 'Leaves', count: counts.leaves || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'requisitions') ? [{ key: 'requisitions', label: 'Requisitions', count: counts.requisitions || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'transfers') ? [{ key: 'transfers', label: 'Transfers', count: counts.transfers || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'payroll') ? [{ key: 'payroll', label: 'Payroll Runs', count: counts.payroll || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'exits') ? [{ key: 'exits', label: 'Exits & F&F', count: counts.exits || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'holidays') ? [{ key: 'holidays', label: 'Holidays', count: counts.holidays || 0 }] : []),
    ...(canUserViewApprovalCategory(currentRole, 'disciplinary') ? [{ key: 'disciplinary', label: 'Disciplinary', count: counts.disciplinary || 0 }] : []),
  ];

  const filteredItems = activeTab === 'all'
    ? items
    : items.filter((i) => i.category === activeTab);

  const handleNavigateToScreen = (targetUrl?: string) => {
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="table" rows={5} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Approvals Hub</span>
            <Badge variant="purple" className="text-xs">
              {roleDetails.title}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized queue. Click any request to open its primary screen and perform review & approval actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchApprovals(true)}
            className="h-8 px-2.5 text-xs text-slate-600 gap-1.5 shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono font-bold bg-white shadow-2xs">
            {counts.all || 0} Pending
          </Badge>
        </div>
      </div>

      {/* Role Notice Banner */}
      {!isManagementRole ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-amber-800">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Standard employees view personal self-service requests. Approval actions are reserved for managers and executive roles.
            </span>
          </CardContent>
        </Card>
      ) : (
        currentRole === 'internal_audit_head' || currentRole === 'compliance_statutory' ? (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardContent className="p-4 flex items-center gap-3 text-xs text-blue-800">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>{roleDetails.title} Audit Oversight:</strong> Review verified items across departments with segregated audit access.
              </span>
            </CardContent>
          </Card>
        ) : null
      )}

      {/* Dynamic Role-Based Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          let roleCards: { title: string; value: string | number; subtitle: string; icon: any; color: string }[] = [
            {
              title: 'Operational Leaves',
              value: counts.leaves || 0,
              subtitle: 'Pending Team Review',
              icon: Clock,
              color: 'text-emerald-600',
            },
            {
              title: 'Hiring & Transfers',
              value: (counts.requisitions || 0) + (counts.transfers || 0),
              subtitle: 'Active Sanctions',
              icon: GitPullRequest,
              color: 'text-purple-600',
            },
            {
              title: 'Payroll Disbursals',
              value: counts.payroll || 0,
              subtitle: 'Pending Authorization',
              icon: Wallet,
              color: 'text-teal-600',
            },
            {
              title: 'Exits & Disciplinary',
              value: (counts.exits || 0) + (counts.disciplinary || 0),
              subtitle: 'Pending Clearances',
              icon: AlertOctagon,
              color: 'text-rose-600',
            },
          ];

          if (currentRole === 'chairman') {
            roleCards = [
              {
                title: 'Strategic Requisitions',
                value: counts.requisitions || 0,
                subtitle: 'Leadership & Expansions',
                icon: Briefcase,
                color: 'text-blue-600',
              },
              {
                title: 'Board Promotions',
                value: counts.transfers || 0,
                subtitle: 'Director & Plant Mobility',
                icon: GitPullRequest,
                color: 'text-purple-600',
              },
              {
                title: 'Holiday Calendars',
                value: counts.holidays || 0,
                subtitle: 'Annual Plant Calendars',
                icon: Building,
                color: 'text-amber-600',
              },
              {
                title: 'Governance Cases',
                value: counts.disciplinary || 0,
                subtitle: 'Board Review Required',
                icon: AlertTriangle,
                color: 'text-rose-600',
              },
            ];
          } else if (currentRole === 'managing_director') {
            roleCards = [
              {
                title: 'Executive Leaves',
                value: counts.leaves || 0,
                subtitle: 'Dept Heads & Execs',
                icon: Clock,
                color: 'text-emerald-600',
              },
              {
                title: 'Manpower Requisitions',
                value: counts.requisitions || 0,
                subtitle: 'Budget Sanctions',
                icon: Briefcase,
                color: 'text-blue-600',
              },
              {
                title: 'Payroll & CTC Approvals',
                value: counts.payroll || 0,
                subtitle: 'Salary Disbursal & Band Sanctions',
                icon: Wallet,
                color: 'text-teal-600',
              },
              {
                title: 'Clearances & Sanctions',
                value: (counts.exits || 0) + (counts.disciplinary || 0),
                subtitle: 'Exits, Waivers & Inquiry Sign-off',
                icon: AlertOctagon,
                color: 'text-rose-600',
              },
            ];
          } else if (currentRole === 'internal_audit_head') {
            roleCards = [
              {
                title: 'Salary & Wage Audits',
                value: counts.payroll || 0,
                subtitle: 'Gross-to-Net Verification',
                icon: Wallet,
                color: 'text-teal-600',
              },
              {
                title: 'Disciplinary Audits',
                value: counts.disciplinary || 0,
                subtitle: 'Procedural Fairness Checks',
                icon: AlertTriangle,
                color: 'text-amber-600',
              },
              {
                title: 'Total Audited Actions',
                value: counts.all || 0,
                subtitle: 'All Decisions & Logs',
                icon: ShieldCheck,
                color: 'text-indigo-600',
              },
              {
                title: 'Variance Status',
                value: '0 Errors',
                subtitle: '100% Reconciled',
                icon: CheckCircle2,
                color: 'text-emerald-600',
              },
            ];
          } else if (currentRole === 'compliance_statutory') {
            roleCards = [
              {
                title: 'Statutory Leaves',
                value: counts.leaves || 0,
                subtitle: 'Maternity, ESI & Sabbatical',
                icon: Clock,
                color: 'text-emerald-600',
              },
              {
                title: 'Statutory Filings',
                value: counts.payroll || 0,
                subtitle: 'EPF / ESI / TDS Remittances',
                icon: Wallet,
                color: 'text-teal-600',
              },
              {
                title: 'Gazette Calendars',
                value: counts.holidays || 0,
                subtitle: 'Factory Act Holiday Lists',
                icon: Building,
                color: 'text-amber-600',
              },
              {
                title: 'Exit Gratuity Clearances',
                value: counts.exits || 0,
                subtitle: 'Statutory Full & Final',
                icon: AlertOctagon,
                color: 'text-purple-600',
              },
            ];
          } else if (currentRole === 'employee') {
            roleCards = [
              {
                title: 'My Pending Leaves',
                value: counts.leaves || 0,
                subtitle: 'Awaiting Manager Review',
                icon: Clock,
                color: 'text-emerald-600',
              },
              {
                title: 'Exit / Clearance Requests',
                value: counts.exits || 0,
                subtitle: 'Department Sign-offs',
                icon: LogOut,
                color: 'text-amber-600',
              },
              {
                title: 'Grievance Cases',
                value: counts.disciplinary || 0,
                subtitle: '7-Day SLA Track',
                icon: HeartHandshake,
                color: 'text-purple-600',
              },
              {
                title: 'Approval Status',
                value: (counts.all || 0) === 0 ? 'Up to Date' : `${counts.all} Active`,
                subtitle: 'Self-Service Tracking',
                icon: CheckCircle2,
                color: 'text-indigo-600',
              },
            ];
          }

          return roleCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card key={idx} className="shadow-2xs border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{card.title}</span>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <div className={`text-2xl font-extrabold mt-2 ${card.color} font-mono`}>
                    {card.value}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</div>
                </CardContent>
              </Card>
            );
          });
        })()}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 gap-1 max-w-full overflow-x-auto bg-slate-100/90 rounded-xl border">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs font-semibold">
              {tab.label} ({tab.count})
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content Queue */}
        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 py-3.5 px-5">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Pending Approval Queue</span>
                <Badge variant="outline" className="text-xs font-mono bg-white">
                  {filteredItems.length} Items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading queue...</div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <span className="font-semibold text-slate-800">No pending approval items.</span>
                  <span>You are all caught up!</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const canApprove = item.canApprove ?? canUserApproveCategory(currentRole, item.category);
                    const categoryStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.leaves;
                    const CategoryIcon = categoryStyle.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavigateToScreen(item.targetUrl)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* Left Info Column */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className={`p-2.5 rounded-xl ${categoryStyle.bg} border ${categoryStyle.border} shrink-0 mt-0.5 shadow-2xs`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] uppercase font-mono font-bold ${categoryStyle.bg} ${categoryStyle.border}`}>
                                {item.categoryTitle}
                              </Badge>
                              <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.title}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>Applicant: <strong className="text-slate-700">{item.applicantName}</strong></span>
                              <span className="text-slate-300">•</span>
                              <span>Date: <strong>{formatDate(item.date)}</strong></span>
                            </div>

                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 font-mono">
                              {item.details}
                            </p>
                          </div>
                        </div>

                        {/* Right Action Column: Direct Screen Review Link */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {canApprove ? (
                            <Button
                              size="sm"
                              className="h-8 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs font-semibold"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToScreen(item.targetUrl);
                              }}
                            >
                              <span>Review & Act</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>Audit View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
