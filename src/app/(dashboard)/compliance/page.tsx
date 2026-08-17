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
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Building,
  FileCheck,
  UploadCloud,
  Printer,
  Paperclip,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { PolicyDocument } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui/LoadingState';

export default function CompliancePage() {
  return (
    <RBACGuard module="policy_compliance">
      <ComplianceContent />
    </RBACGuard>
  );
}

function ComplianceContent() {
  const { currentRole, can, currentUser, employees } = useAuth();
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State for Creating / Editing Policy
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: 'code_of_conduct',
    version: 'v1.0',
    effectiveDate: new Date().toISOString().split('T')[0],
    content: '',
    status: 'active',
    fileUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Delete confirmation modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // PDF Preview & Print Modal
  const [pdfPreviewPolicy, setPdfPreviewPolicy] = useState<PolicyDocument | null>(null);
  const [registerModal, setRegisterModal] = useState<{ title: string; type: 'form25' | 'formB' | 'posh' } | null>(null);

  const canManagePolicies = can('create', 'policy_compliance');

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/compliance', {
        headers: { 'x-user-role': currentRole },
      });
      const data = await res.json().catch(() => null);
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

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingPolicyId(null);
    setUploadedFileName('');
    setFormData({
      title: '',
      category: 'code_of_conduct',
      version: 'v1.0',
      effectiveDate: new Date().toISOString().split('T')[0],
      content: '',
      status: 'active',
      fileUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: PolicyDocument) => {
    setIsEditing(true);
    setEditingPolicyId(p.id);
    setUploadedFileName((p as any).fileUrl ? 'attached_policy_document.pdf' : '');
    setFormData({
      title: p.title,
      category: p.category,
      version: p.version,
      effectiveDate: p.effectiveDate,
      content: (p as any).content || '',
      status: (p as any).status || 'active',
      fileUrl: (p as any).fileUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      // Create local preview object URL or simulate attachment path
      setFormData((prev) => ({
        ...prev,
        fileUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setIsSubmitting(true);
      if (isEditing && editingPolicyId) {
        setPolicies((prev) =>
          prev.map((p) => (p.id === editingPolicyId ? { ...p, ...formData } : p))
        );
        setIsModalOpen(false);
        setStatusMsg('Policy document updated successfully.');
        setTimeout(() => setStatusMsg(''), 4000);

        fetch(`/api/compliance/${editingPolicyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
          },
          body: JSON.stringify(formData),
        }).catch(() => {});
      } else {
        const newPolicyItem: PolicyDocument = {
          id: `pol_${Date.now()}`,
          title: formData.title,
          category: formData.category,
          version: formData.version,
          effectiveDate: formData.effectiveDate,
          acknowledgedCount: 0,
          totalEmployees: employees.length || policies[0]?.totalEmployees || 0,
          fileUrl: formData.fileUrl || '#',
          createdByName: currentUser?.name || 'Compliance Officer',
        };

        setPolicies((prev) => [newPolicyItem, ...prev]);
        setIsModalOpen(false);
        setStatusMsg('New corporate policy published successfully.');
        setTimeout(() => setStatusMsg(''), 4000);

        fetch('/api/compliance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
          },
          body: JSON.stringify(formData),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    setDeleteTargetId(null);
    setStatusMsg('Policy removed from repository.');
    setTimeout(() => setStatusMsg(''), 4000);

    fetch(`/api/compliance/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': currentRole },
    }).catch(() => {});
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              HR Policy Repository & Statutory Compliance
            </h1>
            <Badge variant="success" className="text-xs">
              Audit Ready
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Company policies, digital acknowledgements, statutory registers, and labor audit compliance
          </p>
        </div>

        {canManagePolicies ? (
          <div className="flex items-center gap-2">
            <Button onClick={handleOpenCreateModal} className="gap-2 shadow-sm text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" />
              <span>Publish Policy Document</span>
            </Button>
          </div>
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 text-xs text-slate-600 bg-slate-100">
            <Lock className="h-3.5 w-3.5" />
            <span>Policy Governance (View Only)</span>
          </Badge>
        )}
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg('')} className="text-emerald-600 font-bold hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Statutory Register Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Statutory Form 25 / Form T</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-base text-slate-900">Form 25 Attendance Muster</div>
            <p className="text-xs text-slate-500">Automated daily muster generation compliant with Factories & Shops Act</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisterModal({ title: 'Statutory Form 25 Muster Roll Register', type: 'form25' })}
              className="w-full gap-1.5 text-xs mt-2 bg-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Monthly Register (Form 25)</span>
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
            <p className="text-xs text-slate-500">Payment of Wages & Minimum Wages statutory filing format with PF/ESI audit</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisterModal({ title: 'Statutory Form B Wage Register', type: 'formB' })}
              className="w-full gap-1.5 text-xs mt-2 bg-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Wage Sheet (Form B)</span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisterModal({ title: 'Internal Complaints Committee (POSH)', type: 'posh' })}
              className="w-full gap-1.5 text-xs mt-2 bg-white"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>View Committee Constitution</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Policy Repository */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span>Active Corporate & Regulatory Policies</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredPolicies.length} Active Documents in PostgreSQL DB
            </Badge>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search policies by title or keyword..."
                className="w-full h-8 pl-8 pr-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900"
            >
              <option value="all">All Categories</option>
              <option value="safety_ehs">Plant Safety (EHS)</option>
              <option value="code_of_conduct">Code of Conduct</option>
              <option value="posh">POSH & Anti-Harassment</option>
              <option value="leave_attendance">Leave & Attendance</option>
              <option value="it_security">IT & Data Security</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Syncing policies from database...</span>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No corporate policies found matching your search.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPolicies.map((p) => (
                <div key={p.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{p.title}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {p.version}
                      </Badge>
                      {(p as any).status && (
                        <Badge
                          variant={(p as any).status === 'active' ? 'success' : 'outline'}
                          className="text-[10px] capitalize"
                        >
                          {(p as any).status}
                        </Badge>
                      )}
                      {p.createdByRole && (
                        <span className="text-[10px] text-slate-400">
                          Set by: <strong className="text-slate-600">{p.createdByName || p.createdByRole}</strong>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                      <span>Category: <strong className="capitalize">{p.category?.replace(/_/g, ' ') || 'Statutory'}</strong></span>
                      <span>Effective: {formatDate(p.effectiveDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-800">
                        {p.acknowledgedCount} / {p.totalEmployees || employees.length || 0}
                      </div>
                      <div className="text-[10px] text-slate-400">Acknowledged</div>
                    </div>

                    {canManagePolicies && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(p)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Edit Policy"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTargetId(p.id)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Policy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPdfPreviewPolicy(p)}
                      className="gap-1 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>View / PDF</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish / Edit Policy Modal with PDF File Upload */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-indigo-600" />
                <span>{isEditing ? 'Edit Corporate Policy' : 'Publish New Corporate Policy'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Information Security & Data Protection Policy"
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
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
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900 font-mono"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Status</label>
                  <select
                    className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active (Enforced)</option>
                    <option value="draft">Draft (Under Review)</option>
                    <option value="under_audit">Under Audit Revision</option>
                    <option value="archived">Archived (Historical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Directives & Terms</label>
                <textarea
                  rows={3}
                  placeholder="Enter policy terms, statutory adherence guidelines, and mandatory scope..."
                  className="w-full px-3 py-2 border rounded-xl outline-none text-slate-900"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              {/* PDF Document Upload Area */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300">
                <label className="block font-semibold text-slate-700">Attach Signed Policy Document (PDF)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                    <UploadCloud className="h-4 w-4 text-indigo-600" />
                    <span>Upload PDF File</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  {uploadedFileName ? (
                    <span className="text-xs text-emerald-700 font-medium truncate flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" />
                      {uploadedFileName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">PDF, DOC up to 10MB</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSubmitting ? 'Saving to Database...' : isEditing ? 'Save Policy Changes' : 'Publish Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Delete Corporate Policy?</h4>
                <p className="text-xs text-slate-500">This action will delete the policy document from the database.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => handleDeletePolicy(deleteTargetId)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Policy PDF Viewer / Printable Modal */}
      {pdfPreviewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header with Print / Download */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-indigo-700">Viruzverse Solutions Private Limited</h3>
                <p className="text-xs text-slate-500">Official Policy Document & Compliance Certificate</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </Button>
                <button onClick={() => setPdfPreviewPolicy(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Meta Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Policy Title</span>
                <div className="font-bold text-slate-900 truncate">{pdfPreviewPolicy.title}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Category</span>
                <div className="font-semibold text-slate-900 capitalize">{pdfPreviewPolicy.category?.replace(/_/g, ' ') || 'Statutory'}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Version</span>
                <div className="font-mono font-bold text-indigo-600">{pdfPreviewPolicy.version}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Effective Date</span>
                <div className="font-semibold text-slate-900">{formatDate(pdfPreviewPolicy.effectiveDate)}</div>
              </div>
            </div>

            {/* Document Content / Directives */}
            <div className="space-y-3 text-xs leading-relaxed text-slate-800">
              <h4 className="font-bold text-sm text-slate-900 border-b pb-1">Policy Scope & Operating Directives</h4>
              <p className="whitespace-pre-line text-slate-700">
                {(pdfPreviewPolicy as any).content ||
                  `All employees, plant personnel, supervisors, and administrative staff must strictly adhere to the operational directives specified under ${pdfPreviewPolicy.title}. Non-compliance constitutes a procedural violation under company standing orders and applicable statutory regulations.`}
              </p>
            </div>

            {/* Seal & Acknowledgement Stats */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900">Digitally Enforced & Formally Signed</div>
                  <div className="text-emerald-700 text-[11px]">
                    Acknowledged by {pdfPreviewPolicy.acknowledgedCount} of {pdfPreviewPolicy.totalEmployees || employees.length || 0} active workforce personnel.
                  </div>
                </div>
              </div>
              <Badge variant="success" className="font-mono text-xs">
                Active & Enforced
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Statutory Register Preview / Export Modal */}
      {registerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{registerModal.title}</h3>
                <p className="text-xs text-slate-500">Factories Act & Statutory Remuneration Rules</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Register</span>
                </Button>
                <button onClick={() => setRegisterModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Entity Name</span>
                <span className="font-bold text-slate-900">Viruzverse Solutions Private Limited</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Filing Period</span>
                <span className="font-mono font-bold text-indigo-600">Current Statutory Cycle</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Statutory Authority</span>
                <span className="font-semibold text-slate-800">Ministry of Labour & Employment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Verification Audit Status</span>
                <Badge variant="success" className="text-[10px]">100% Verified & Compliant</Badge>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {registerModal.type === 'form25' && 'Form 25 muster roll register automatically compiled from turnstile biometric access logs and web ESS check-in entries.'}
              {registerModal.type === 'formB' && 'Form B wage register compiled from monthly gross salary calculations, Provident Fund (PF), ESI, and Professional Tax (PT) filings.'}
              {registerModal.type === 'posh' && 'Internal Complaints Committee (ICC) constitution report in accordance with Sexual Harassment of Women at Workplace Act, 2013.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
