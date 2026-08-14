'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  HeartHandshake,
  AlertOctagon,
  Plus,
  Clock,
  Shield,
  CheckCircle2,
  Lock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { formatDate, formatDateTime, getStatusColorBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GrievanceTicket } from '@/types';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function EngagementPage() {
  return (
    <RBACGuard module="engagement_welfare">
      <EngagementContent />
    </RBACGuard>
  );
}

function EngagementContent() {
  const {
    grievances,
    submitGrievance,
    currentUser,
    currentEmployee,
    can,
  } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'work_environment' as GrievanceTicket['category'],
    subject: '',
    description: '',
    isAnonymous: false,
    priority: 'medium' as GrievanceTicket['priority'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitGrievance({
      category: form.category,
      subject: form.subject,
      description: form.description,
      isAnonymous: form.isAnonymous,
      priority: form.priority,
      employeeId: form.isAnonymous ? undefined : (currentEmployee?.id || 'emp_005'),
      employeeName: form.isAnonymous ? undefined : (currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : currentUser.name),
    });
    setModalOpen(false);
    setForm({
      category: 'work_environment',
      subject: '',
      description: '',
      isAnonymous: false,
      priority: 'medium',
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Employee Engagement, Welfare & Grievances</span>
            <Badge variant="purple" className="text-xs">
              Confidential SLA Routing
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Anonymous and identified concern logging, SLA resolution tracking, and welfare initiatives
          </p>
        </div>

        {/* Raise Grievance Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md text-xs">
              <Plus className="h-4 w-4" />
              <span>Raise a Concern / Ticket</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>File a Confidential Grievance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Submit Anonymously</span>
                  <div className="text-[11px] text-slate-500">Your name will be concealed from HR</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                  className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="w-full h-11 px-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="work_environment">Workplace Environment & Ergonomics</option>
                  <option value="payroll_dispute">Payroll or Allowance Discrepancy</option>
                  <option value="policy_violation">Policy or Compliance Infraction</option>
                  <option value="harassment">POSH / Harassment (Priority Routing)</option>
                  <option value="other">General Concern</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <Input
                  required
                  placeholder="Summary of the issue..."
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete facts, dates, and witnesses if any..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Concern with SLA Tracking
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grievance Tickets Register */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Active Grievance & Welfare Case Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {grievances.map((grv) => {
            const statusBadge = getStatusColorBadge(grv.status);

            return (
              <div
                key={grv.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {grv.ticketNumber}
                    </span>
                    <Badge variant={grv.isAnonymous ? 'purple' : 'outline'} className="text-[10px]">
                      {grv.isAnonymous ? 'Anonymous' : grv.employeeName}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {grv.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Badge variant={grv.status === 'resolved' ? 'success' : 'warning'} className="text-[10px] capitalize">
                    {grv.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{grv.subject}</h4>
                  <p className="text-slate-600 dark:text-slate-300">{grv.description}</p>
                </div>

                {grv.resolutionNotes && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <strong className="block font-semibold">Resolution Note:</strong>
                    {grv.resolutionNotes}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-slate-400 pt-2 border-t text-[11px]">
                  <span>Filed: {formatDate(grv.createdAt)}</span>
                  <span>SLA Target: {formatDate(grv.slaDeadline)}</span>
                  <span>Handler: {grv.assignedToName || 'HR Grievance Committee'}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
