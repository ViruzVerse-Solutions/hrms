'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  BookOpen,
  X,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { PolicyDocument } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function CompliancePage() {
  return (
    <RBACGuard module="policy_compliance">
      <ComplianceContent />
    </RBACGuard>
  );
}

function ComplianceContent() {
  const { currentRole, can } = useAuth();
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'code_of_conduct',
    version: 'v1.0',
    effectiveDate: new Date().toISOString().split('T')[0],
    content: '',
  });

  const canPublish = can('create', 'policy_compliance');

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/compliance', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json();
      if (data?.data?.policies) {
        setPolicies(data.data.policies);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [currentRole]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          title: '',
          category: 'code_of_conduct',
          version: 'v1.0',
          effectiveDate: new Date().toISOString().split('T')[0],
          content: '',
        });
        fetchPolicies();
      }
    } catch (err) {
      console.error('Failed to publish policy:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>HR Policy Repository & Statutory Compliance</span>
            <Badge variant="success" className="text-xs">
              Audit Ready
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Company policies, digital acknowledgements, statutory registers, and labor audit compliance
          </p>
        </div>

        {canPublish ? (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm text-xs bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            <span>Publish Policy Document</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 text-xs text-slate-600 bg-slate-100">
            <Lock className="h-3.5 w-3.5" />
            <span>Policy Governance (View Only)</span>
          </Badge>
        )}
      </div>

      {/* Statutory Register Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Statutory Form T</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Form T Attendance Register</div>
            <p className="text-xs text-slate-500">Automated daily generation compliant with Factories & Shops Act</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <Download className="h-3.5 w-3.5" />
              <span>Export Monthly Register</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Form B (Wage Register)</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Equal Remuneration & Wages</div>
            <p className="text-xs text-slate-500">Payment of Wages & Minimum Wages statutory filing format</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <Download className="h-3.5 w-3.5" />
              <span>Export Wage Sheet</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">POSH IC Committee</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Internal Complaints Committee</div>
            <p className="text-xs text-slate-500">Annual statutory POSH compliance report & committee constitution</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>View Constitution</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Policy Repository */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span>Active Corporate Policies</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {policies.length} Active Documents
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Syncing policies from database...</div>
          ) : policies.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No active corporate policies found in database.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {policies.map((p) => (
                <div key={p.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{p.title}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {p.version}
                      </Badge>
                      {p.createdByRole && (
                        <span className="text-[10px] text-slate-400">
                          Set by: <strong className="text-slate-600">{p.createdByName || p.createdByRole}</strong>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-4">
                      <span>Category: <strong className="capitalize">{p.category.replace(/_/g, ' ')}</strong></span>
                      <span>Effective: {formatDate(p.effectiveDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {p.acknowledgedCount} / {p.totalEmployees || 110}
                      </div>
                      <div className="text-[10px] text-slate-400">Acknowledged</div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Publish New Corporate Policy</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePublish} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Information Security & Data Protection Policy"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="code_of_conduct">Code of Conduct</option>
                    <option value="posh">POSH Compliance</option>
                    <option value="leave_attendance">Leave & Attendance</option>
                    <option value="safety_ehs">Plant Safety (EHS)</option>
                    <option value="it_security">IT & Data Security</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    required
                    placeholder="v1.0"
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Description & Directives</label>
                <textarea
                  rows={3}
                  placeholder="Enter policy terms, statutory adherence guidelines, and mandatory scope..."
                  className="w-full px-3 py-2 border rounded-lg outline-none"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Publish Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
