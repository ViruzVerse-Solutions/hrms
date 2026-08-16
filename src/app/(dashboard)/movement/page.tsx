'use client';

import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Users,
  Building,
  TrendingUp,
  Plus,
  X,
  Lock,
  Check,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { TransferPromotionCase } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function MovementPage() {
  return (
    <RBACGuard module="transfer_promotion">
      <MovementContent />
    </RBACGuard>
  );
}

function MovementContent() {
  const { currentRole, can, employees } = useAuth();
  const [transfers, setTransfers] = useState<TransferPromotionCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const firstEmp = employees[0];
  const [formData, setFormData] = useState({
    employeeId: firstEmp?.id || '',
    type: 'promotion',
    currentDepartment: firstEmp?.departmentName || 'Operations & Engineering',
    newDepartment: firstEmp?.departmentName || 'Operations & Engineering',
    currentDesignation: firstEmp?.designationTitle || 'Quality Engineer',
    newDesignation: 'Senior ' + (firstEmp?.designationTitle || 'Quality Engineer'),
    currentBranch: firstEmp?.branchName || 'Headquarters',
    newBranch: firstEmp?.branchName || 'Headquarters',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/movement', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json();
      if (data?.data?.transfers) {
        setTransfers(data.data.transfers);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [currentRole]);

  const handleActionTransfer = async (transferId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/movement', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ transferId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTransfers();
      }
    } catch (err) {
      console.error('Failed to update transfer action:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = formData.employeeId || employees[0]?.id;
    if (!empId) return;

    try {
      const res = await fetch('/api/movement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ ...formData, employeeId: empId }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchTransfers();
      }
    } catch (err) {
      console.error('Failed to submit transfer case:', err);
    }
  };

  const canInitiate = can('create', 'transfer_promotion');
  const canApprove = ['managing_director', 'chairman', 'hr_head'].includes(currentRole);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Inter-Plant Transfers & Grade Promotions</span>
            <Badge variant="outline" className="text-xs">
              Mobility Engine
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plant-to-plant relocation, department reorganization, job role enhancements, and salary structure updates
          </p>
        </div>

        {canInitiate ? (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm text-xs bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            <span>Initiate Transfer / Promotion</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 text-xs text-slate-600 bg-slate-100">
            <Lock className="h-3.5 w-3.5" />
            <span>Mobility View Only</span>
          </Badge>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-indigo-500/20 bg-indigo-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Upcoming Promotions</span>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {transfers.filter((t) => t.type === 'promotion').length} Cases
            </div>
            <p className="text-xs text-slate-500">Grade level advancements & leadership promotions</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Plant Relocations</span>
              <Building className="h-4 w-4 text-blue-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {transfers.filter((t) => t.type === 'transfer' || t.type === 'relocation').length} Active
            </div>
            <p className="text-xs text-slate-500">Inter-branch & plant operational mobility</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Approved Cases</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {transfers.filter((t) => t.status === 'approved').length} Cases
            </div>
            <p className="text-xs text-slate-500">Mobility cases fully authorized</p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Cases List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-indigo-600" />
            <span>Mobility Case Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading cases from database...</div>
          ) : transfers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No transfer or promotion cases recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <div key={t.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.employeeName}</span>
                      <Badge variant={t.type === 'promotion' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                        {t.type}
                      </Badge>
                      <Badge variant={t.status === 'approved' ? 'success' : t.status === 'pending' ? 'warning' : 'destructive'} className="text-[10px] uppercase">
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                      <span>Designation: <strong className="text-slate-700">{t.currentDesignation}</strong> → <strong className="text-indigo-600">{t.newDesignation}</strong></span>
                      <span>Effective: {formatDate(t.effectiveDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500 text-right">
                      <div>Initiated by: <strong className="text-slate-700">{t.initiatedBy}</strong></div>
                      <div className="text-[10px] text-slate-400">Approval chain: {t.approvalChain?.join(' → ') || 'Pending'}</div>
                    </div>

                    {t.status === 'pending' && canApprove && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => handleActionTransfer(t.id, 'approve')}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleActionTransfer(t.id, 'reject')}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Initiate Transfer / Promotion</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Employee</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Movement Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="promotion">Promotion</option>
                    <option value="transfer">Inter-Plant Transfer</option>
                    <option value="relocation">Role Relocation</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Designation Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior QC Chemist (L4)"
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.newDesignation}
                  onChange={(e) => setFormData({ ...formData, newDesignation: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations & Engineering"
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.newDepartment}
                  onChange={(e) => setFormData({ ...formData, newDepartment: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Initiate Case
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
