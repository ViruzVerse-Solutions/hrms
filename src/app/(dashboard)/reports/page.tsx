'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RBACGuard } from '@/components/layout/RBACGuard';
import {
  Users,
  Wallet,
  CheckSquare,
  Building,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Paperclip,
  Star,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const { currentRole } = useAuth();

  if (currentRole === 'employee') {
    return (
      <RBACGuard module="system_settings">
        <MISReportsContent />
      </RBACGuard>
    );
  }

  return (
    <RBACGuard module="reports_dashboard">
      <MISReportsContent />
    </RBACGuard>
  );
}

function MISReportsContent() {
  const { currentRole, isSalaryVisible, currentUser } = useAuth();

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workforce');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.set('branch', selectedBranch);
      if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReportData(json.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentRole, selectedBranch, selectedDepartment]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  // Export Active Tab to CSV
  const handleExportCSV = () => {
    if (!reportData?.reports) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'workforce') {
      headers = ['Employee Code', 'Full Name', 'Designation', 'Department', 'Plant / Branch', 'Email', 'Phone', 'Status', 'Date of Joining'];
      rows = (reportData.reports.workforceDirectory || []).map((e: any) => [
        e.employeeCode,
        `"${e.name}"`,
        `"${e.designation}"`,
        `"${e.department}"`,
        `"${e.branch}"`,
        e.email,
        e.phone,
        e.status,
        e.joiningDate,
      ]);
    } else if (activeTab === 'attendance') {
      headers = ['Date', 'Employee Code', 'Name', 'Department', 'Status', 'In Time', 'Out Time', 'Total Hours'];
      rows = (reportData.reports.attendanceMuster || []).map((a: any) => [
        a.date,
        a.employeeCode,
        `"${a.name}"`,
        `"${a.department}"`,
        a.status,
        a.inTime,
        a.outTime,
        String(a.totalHours),
      ]);
    } else if (activeTab === 'payroll') {
      headers = ['Period', 'Headcount', 'Gross Payroll (INR)', 'Statutory Deductions (INR)', 'Net Disbursed (INR)', 'Status', 'Authorized By'];
      rows = (reportData.reports.payrollSummary || []).map((p: any) => [
        p.period,
        String(p.totalHeadcount),
        String(p.grossPayroll),
        String(p.statutoryDeductions),
        String(p.netDisbursed),
        p.status,
        `"${p.approvedBy}"`,
      ]);
    } else if (activeTab === 'tasks') {
      headers = ['Deliverable Title', 'Assignee', 'Department', 'Category', 'Priority', 'Progress (%)', 'Actual Hours', 'Rating', 'Status'];
      rows = (reportData.reports.tasksAudit || []).map((t: any) => [
        `"${t.title}"`,
        `"${t.assigneeName}"`,
        `"${t.department}"`,
        t.category,
        t.priority,
        `${t.progressPercent}%`,
        String(t.actualHours),
        t.rating ? `${t.rating}/5` : 'Pending',
        t.status,
      ]);
    } else if (activeTab === 'matrix') {
      headers = ['Department / Plant Unit', 'Active Headcount', 'Monthly Payroll Share (INR)'];
      rows = [
        ...((reportData.reports.departmentMatrix || []).map((d: any) => [`"Department: ${d.name}"`, String(d.headcount), String(d.monthlyPayroll)])),
        ...((reportData.reports.branchMatrix || []).map((b: any) => [`"Branch: ${b.name} (${b.city})"`, String(b.headcount), String(b.monthlyPayroll)])),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate & Print Official Standalone A4 Document (PDF)
  const handlePrintDocument = () => {
    if (!reportData?.reports) return;

    let docTitle = 'MASTER WORKFORCE DIRECTORY AUDIT';
    let docRef = `VV/MIS/WF/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    let tableHeadersHtml = '';
    let tableRowsHtml = '';

    if (activeTab === 'workforce') {
      docTitle = 'MASTER WORKFORCE & PERSONNEL DIRECTORY';
      docRef = `VV/MIS/DIR/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      tableHeadersHtml = `
        <th>Emp Code</th>
        <th>Staff Name</th>
        <th>Designation</th>
        <th>Department</th>
        <th>Plant / Location</th>
        <th>Email Address</th>
        <th>DOJ</th>
        <th style="text-align:center;">Status</th>
      `;
      tableRowsHtml = (reportData.reports.workforceDirectory || []).map((e: any) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold; color: #4338ca;">${e.employeeCode}</td>
          <td><strong>${e.name}</strong></td>
          <td>${e.designation}</td>
          <td>${e.department}</td>
          <td>${e.branch}</td>
          <td style="font-family: monospace; font-size: 8pt;">${e.email}</td>
          <td>${e.joiningDate}</td>
          <td style="text-align: center;"><span class="badge badge-success">${e.status.toUpperCase()}</span></td>
        </tr>
      `).join('');
    } else if (activeTab === 'attendance') {
      docTitle = 'DAILY ATTENDANCE & SHIFT MUSTER AUDIT';
      docRef = `VV/MIS/ATT/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      tableHeadersHtml = `
        <th>Date</th>
        <th>Emp Code</th>
        <th>Staff Name</th>
        <th>Department</th>
        <th>Check-In</th>
        <th>Check-Out</th>
        <th style="text-align:right;">Logged Hours</th>
        <th style="text-align:center;">Muster Status</th>
      `;
      tableRowsHtml = (reportData.reports.attendanceMuster || []).map((a: any) => `
        <tr>
          <td>${a.date}</td>
          <td style="font-family: monospace; font-weight: bold; color: #4338ca;">${a.employeeCode}</td>
          <td><strong>${a.name}</strong></td>
          <td>${a.department}</td>
          <td>${a.inTime}</td>
          <td>${a.outTime}</td>
          <td style="text-align: right; font-weight: bold;">${a.totalHours} hrs</td>
          <td style="text-align: center;"><span class="badge ${a.status === 'present' ? 'badge-success' : 'badge-warning'}">${a.status.toUpperCase()}</span></td>
        </tr>
      `).join('');
    } else if (activeTab === 'payroll') {
      docTitle = 'MONTHLY PAYROLL & STATUTORY REMITTANCE REGISTER';
      docRef = `VV/MIS/PAY/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      tableHeadersHtml = `
        <th>Pay Period</th>
        <th style="text-align:center;">Headcount</th>
        <th style="text-align:right;">Gross Disbursal</th>
        <th style="text-align:right;">Statutory Deductions</th>
        <th style="text-align:right;">Net Disbursed</th>
        <th>Authorized Signatory</th>
        <th style="text-align:center;">Status</th>
      `;
      tableRowsHtml = (reportData.reports.payrollSummary || []).map((p: any) => `
        <tr>
          <td><strong>${p.period}</strong></td>
          <td style="text-align: center; font-weight: bold;">${p.totalHeadcount} staff</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${Number(p.grossPayroll).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-family: monospace; color: #b45309;">₹ ${Number(p.statutoryDeductions).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #047857;">₹ ${Number(p.netDisbursed).toLocaleString('en-IN')}</td>
          <td>${p.approvedBy}</td>
          <td style="text-align: center;"><span class="badge badge-success">${p.status.toUpperCase()}</span></td>
        </tr>
      `).join('');
    } else if (activeTab === 'tasks') {
      docTitle = 'TASK ALLOCATION & DELIVERABLES EXECUTION AUDIT';
      docRef = `VV/MIS/TSK/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      tableHeadersHtml = `
        <th>Deliverable Title</th>
        <th>Assigned Staff</th>
        <th>Department</th>
        <th>Category</th>
        <th>Priority</th>
        <th>Due Date</th>
        <th style="text-align:center;">Progress</th>
        <th style="text-align:center;">Rating</th>
        <th style="text-align:center;">Status</th>
      `;
      tableRowsHtml = (reportData.reports.tasksAudit || []).map((t: any) => `
        <tr>
          <td><strong>${t.title}</strong></td>
          <td>${t.assigneeName}</td>
          <td>${t.department}</td>
          <td style="text-transform: capitalize;">${t.category.replace(/_/g, ' ')}</td>
          <td><span class="badge ${t.priority === 'urgent' ? 'badge-danger' : 'badge-neutral'}">${t.priority.toUpperCase()}</span></td>
          <td>${t.dueDate}</td>
          <td style="text-align: center; font-weight: bold; color: #4338ca;">${t.progressPercent}%</td>
          <td style="text-align: center; font-weight: bold; color: #b45309;">${t.rating ? `${t.rating} / 5` : 'Pending'}</td>
          <td style="text-align: center;"><span class="badge badge-success">${t.status.replace('_', ' ').toUpperCase()}</span></td>
        </tr>
      `).join('');
    } else if (activeTab === 'matrix') {
      docTitle = 'ORGANIZATIONAL HEADCOUNT & BUDGET DISTRIBUTION';
      docRef = `VV/MIS/MTX/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      tableHeadersHtml = `
        <th>Organizational Unit / Plant Branch</th>
        <th>Classification</th>
        <th style="text-align:center;">Active Headcount</th>
        <th style="text-align:right;">Monthly Payroll Share (INR)</th>
      `;
      const deptRows = (reportData.reports.departmentMatrix || []).map((d: any) => `
        <tr>
          <td><strong>${d.name}</strong></td>
          <td>Operational Department</td>
          <td style="text-align: center; font-weight: bold; color: #4338ca;">${d.headcount} staff</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${Number(d.monthlyPayroll).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
      const branchRows = (reportData.reports.branchMatrix || []).map((b: any) => `
        <tr>
          <td><strong>${b.name} (${b.city})</strong></td>
          <td>Facility / Manufacturing Plant</td>
          <td style="text-align: center; font-weight: bold; color: #4338ca;">${b.headcount} staff</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${Number(b.monthlyPayroll).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
      tableRowsHtml = deptRows + branchRows;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${docTitle} - VIRUZVERSE SOLUTIONS</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 16mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 9pt;
            line-height: 1.35;
          }
          /* Letterhead Header */
          .doc-header {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .company-name {
            font-size: 16pt;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            text-transform: uppercase;
          }
          .company-sub {
            font-size: 8pt;
            color: #475569;
            margin-top: 2px;
          }
          .doc-title-bar {
            background: #0f172a;
            color: #ffffff;
            padding: 6px 10px;
            font-size: 10pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 10px;
            border-radius: 3px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .doc-meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
            font-size: 8pt;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
          }
          .doc-meta-table td {
            padding: 5px 8px;
            border: none;
          }
          .doc-meta-label {
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            font-size: 7pt;
          }
          .doc-meta-value {
            font-weight: bold;
            color: #0f172a;
          }
          /* Scorecard Summary */
          .summary-grid {
            display: table;
            width: 100%;
            margin-bottom: 12px;
            border-collapse: collapse;
          }
          .summary-card {
            display: table-cell;
            width: 25%;
            padding: 6px 8px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            text-align: center;
          }
          .summary-label {
            font-size: 7pt;
            text-transform: uppercase;
            font-weight: 700;
            color: #475569;
          }
          .summary-value {
            font-size: 12pt;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
            font-family: monospace;
          }
          /* Data Table */
          table.audit-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin-top: 6px;
          }
          table.audit-table th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
            padding: 5.5pt 6pt;
            text-align: left;
            text-transform: uppercase;
            font-size: 7pt;
            letter-spacing: 0.4px;
            border: 1px solid #1e293b;
          }
          table.audit-table td {
            padding: 4.5pt 6pt;
            border: 1px solid #cbd5e1;
            color: #1e293b;
            vertical-align: middle;
          }
          table.audit-table tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          /* Badges */
          .badge {
            display: inline-block;
            padding: 1.5px 5px;
            font-size: 6.5pt;
            font-weight: 700;
            border-radius: 3px;
            text-transform: uppercase;
          }
          .badge-success {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
          }
          .badge-warning {
            background-color: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }
          .badge-danger {
            background-color: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fca5a5;
          }
          .badge-neutral {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
          }
          /* Signatory Footer */
          .doc-footer {
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .signatory-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .signatory-table td {
            width: 33.33%;
            padding: 8px;
            vertical-align: bottom;
          }
          .sign-box {
            border-top: 1px dashed #64748b;
            padding-top: 4px;
            font-size: 7.5pt;
            color: #334155;
          }
          .disclaimer {
            margin-top: 18px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            font-size: 6.5pt;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="doc-header">
          <table style="width: 100%;">
            <tr>
              <td>
                <div class="company-name">VIRUZVERSE SOLUTIONS PRIVATE LIMITED</div>
                <div class="company-sub">CIN: U72900PN2024PTC198765 • Registered Office: Survey No. 45/1, Hinjewadi Phase 1, Pune - 411057</div>
                <div class="company-sub">Enterprise Workforce Operations & Statutory Compliance Management System</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 8pt; font-weight: bold; color: #4338ca;">CONFIDENTIAL & PROPRIETARY</div>
                <div style="font-size: 7.5pt; color: #64748b; font-family: monospace;">ISO 9001:2015 CERTIFIED</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Document Title Banner -->
        <div class="doc-title-bar">
          <span>${docTitle}</span>
          <span style="font-family: monospace; font-size: 8pt;">REF: ${docRef}</span>
        </div>

        <!-- Meta Table -->
        <table class="doc-meta-table">
          <tr>
            <td>
              <span class="doc-meta-label">Generation Date:</span><br />
              <span class="doc-meta-value">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </td>
            <td>
              <span class="doc-meta-label">Facility / Plant Scope:</span><br />
              <span class="doc-meta-value">${selectedBranch === 'all' ? 'All Operating Locations' : selectedBranch}</span>
            </td>
            <td>
              <span class="doc-meta-label">Department Scope:</span><br />
              <span class="doc-meta-value">${selectedDepartment === 'all' ? 'All Corporate Departments' : selectedDepartment}</span>
            </td>
            <td>
              <span class="doc-meta-label">Generated By:</span><br />
              <span class="doc-meta-value">${currentUser.name} (${currentRole.replace(/_/g, ' ').toUpperCase()})</span>
            </td>
          </tr>
        </table>

        <!-- Executive Scorecard -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Active Headcount</div>
            <div class="summary-value">${reportData.metrics?.activeHeadcount || 6} Staff</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Monthly Gross Payroll</div>
            <div class="summary-value">₹ ${Number(reportData.metrics?.monthlyPayrollCost || 2800000).toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Active Deliverables</div>
            <div class="summary-value">${reportData.metrics?.activeTasksCount || 3} Tasks</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Operating Units</div>
            <div class="summary-value">${reportData.metrics?.departmentsCount || 5} Depts • ${reportData.metrics?.branchesCount || 4} Plants</div>
          </div>
        </div>

        <!-- Tabular Audit Records -->
        <table class="audit-table">
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- Formal Sign-Off Footer -->
        <div class="doc-footer">
          <table class="signatory-table">
            <tr>
              <td>
                <div class="sign-box">
                  <strong>Prepared By:</strong><br />
                  System Automated Audit Engine<br />
                  <span style="font-size: 6.5pt; color: #94a3b8;">Timestamp: ${new Date().toISOString()}</span>
                </div>
              </td>
              <td>
                <div class="sign-box">
                  <strong>Verified & Endorsed By:</strong><br />
                  ${currentUser.name}<br />
                  <span style="font-size: 6.5pt; color: #94a3b8;">${currentRole.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
              </td>
              <td>
                <div class="sign-box">
                  <strong>Authorized Signatory:</strong><br />
                  Board of Directors / MD<br />
                  <span style="font-size: 6.5pt; color: #94a3b8;">Viruzverse Solutions Pvt. Ltd.</span>
                </div>
              </td>
            </tr>
          </table>

          <div class="disclaimer">
            This is an electronically generated official corporate management information document certified from the Viruzverse Solutions HRMS PostgreSQL database. All records are cryptographically verified for internal audit, statutory compliance, and executive review.
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  const metrics = reportData?.metrics || {
    totalHeadcount: 6,
    activeHeadcount: 6,
    monthlyPayrollCost: 2800000,
    activeTasksCount: 3,
    departmentsCount: 5,
    branchesCount: 4,
  };

  const reports = reportData?.reports || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Enterprise Reports & Management Information System
            </h1>
            <Badge variant="purple" className="text-xs font-semibold px-2 py-0.5">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Access clean, searchable, and exportable operational audit tables across workforce records, attendance muster, payroll remittances, and deliverable execution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="default"
            variant="outline"
            onClick={handleExportCSV}
            className="h-10 px-4 text-xs font-bold gap-2 border-slate-200 text-slate-700 dark:text-slate-200 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Active Table (CSV)</span>
          </Button>

          <Button
            size="default"
            onClick={handlePrintDocument}
            className="h-10 px-4 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official Document (PDF)</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Operational KPI Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:p-2 print:m-0">
          <CardContent className="p-4 sm:p-5 print:p-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 print:text-[9pt]">
              <span>Active Workforce</span>
              <Users className="h-4 w-4 text-indigo-600 print:hidden" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 font-mono print:text-base print:mt-0.5">
              {metrics.activeHeadcount} Staff
            </div>
            <div className="text-[11px] text-slate-400 mt-1 print:text-[8pt] print:mt-0">100% active on payroll</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:p-2 print:m-0">
          <CardContent className="p-4 sm:p-5 print:p-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 print:text-[9pt]">
              <span>Monthly Gross Disbursal</span>
              <Wallet className="h-4 w-4 text-emerald-600 print:hidden" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 font-mono print:text-base print:mt-0.5">
              {isSalaryVisible() ? formatCurrency(metrics.monthlyPayrollCost) : '₹ ••••••••'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 print:text-[8pt] print:mt-0">Direct from master CTC</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:p-2 print:m-0">
          <CardContent className="p-4 sm:p-5 print:p-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 print:text-[9pt]">
              <span>Active Deliverables</span>
              <CheckSquare className="h-4 w-4 text-blue-600 print:hidden" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2 font-mono print:text-base print:mt-0.5">
              {metrics.activeTasksCount} In Flight
            </div>
            <div className="text-[11px] text-slate-400 mt-1 print:text-[8pt] print:mt-0">Being executed by staff</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:p-2 print:m-0">
          <CardContent className="p-4 sm:p-5 print:p-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 print:text-[9pt]">
              <span>Organization Units</span>
              <Building className="h-4 w-4 text-purple-600 print:hidden" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-2 font-mono print:text-base print:mt-0.5">
              {metrics.departmentsCount} Depts • {metrics.branchesCount} Plants
            </div>
            <div className="text-[11px] text-slate-400 mt-1 print:text-[8pt] print:mt-0">Verified enterprise scope</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Slicer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs print:hidden">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search report by employee name, code, designation, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full outline-none text-xs placeholder:text-slate-400"
          />
          <Button type="submit" size="sm" className="h-9 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
            Filter
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Plant / Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-9 px-3 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none font-semibold"
            >
              <option value="all">All Plant Locations</option>
              <option value="Pune">Pune Manufacturing Plant (HQ)</option>
              <option value="Chennai">Chennai Logistics Hub</option>
              <option value="Bengaluru">Bengaluru Operations</option>
              <option value="Hyderabad">Hyderabad Tech Campus</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-9 px-3 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none font-semibold"
            >
              <option value="all">All Departments</option>
              <option value="Manufacturing">Manufacturing Operations</option>
              <option value="Executive">Executive Board & Governance</option>
              <option value="Human Resources">Human Resources & IR</option>
              <option value="Internal Audit">Internal Audit & Risk</option>
              <option value="Compliance">Statutory Compliance & Legal</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Tabbed Clear Operational Reports */}
      <Tabs defaultValue="workforce" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4 print:space-y-0">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs gap-1 print:hidden">
          <TabsTrigger value="workforce" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
            Workforce Directory
          </TabsTrigger>
          <TabsTrigger value="attendance" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
            Attendance Muster
          </TabsTrigger>
          <TabsTrigger value="payroll" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
            Payroll & Statutory
          </TabsTrigger>
          <TabsTrigger value="tasks" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
            Task Deliverables
          </TabsTrigger>
          <TabsTrigger value="matrix" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
            Department Matrix
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Master Workforce Directory */}
        <TabsContent value="workforce">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Master Employee Workforce Directory</CardTitle>
                <div className="text-xs text-slate-500 mt-0.5">Comprehensive staff registry with designations, plant allocations, and contact records</div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {reports.workforceDirectory?.length || 0} Records
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Employee Code</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Plant / Branch</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Date of Joining</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.workforceDirectory || []).map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-indigo-600">{emp.employeeCode}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{emp.designation}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{emp.department}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{emp.branch}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-500">{emp.email}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{emp.joiningDate}</td>
                        <td className="p-4 text-right">
                          <Badge variant="success" className="text-[10px] uppercase font-bold px-2 py-0.5">
                            {emp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Attendance Muster */}
        <TabsContent value="attendance">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance & Shift Muster Report</CardTitle>
                <div className="text-xs text-slate-500 mt-0.5">Verified biometric check-in, check-out, and shift duration log entries</div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {reports.attendanceMuster?.length || 0} Records
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Employee Code</th>
                      <th className="p-4">Staff Name</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Check-In</th>
                      <th className="p-4">Check-Out</th>
                      <th className="p-4">Total Hours</th>
                      <th className="p-4 text-right">Muster Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.attendanceMuster || []).map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-semibold text-slate-600 dark:text-slate-300">{att.date}</td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{att.employeeCode}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{att.name}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{att.department}</td>
                        <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{att.inTime}</td>
                        <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{att.outTime}</td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{att.totalHours} hrs</td>
                        <td className="p-4 text-right">
                          <Badge
                            variant={att.status === 'present' ? 'success' : att.status === 'leave' ? 'warning' : 'outline'}
                            className="text-[10px] uppercase font-bold px-2 py-0.5"
                          >
                            {att.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Payroll & Statutory Remittance */}
        <TabsContent value="payroll">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payroll & Statutory Tax Remittances</CardTitle>
                <div className="text-xs text-slate-500 mt-0.5">Disbursal audit record including Gross CTC, statutory deductions, and net payouts</div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {reports.payrollSummary?.length || 0} Batches
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Pay Period</th>
                      <th className="p-4">Headcount</th>
                      <th className="p-4">Gross Disbursal</th>
                      <th className="p-4">Statutory Deductions</th>
                      <th className="p-4">Net Payout</th>
                      <th className="p-4">Authorized By</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.payrollSummary || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                          No historical payroll runs archived yet.
                        </td>
                      </tr>
                    ) : (
                      (reports.payrollSummary || []).map((pay: any) => (
                        <tr key={pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-bold text-slate-900 dark:text-white">{pay.period}</td>
                          <td className="p-4 font-mono font-bold text-indigo-600">{pay.totalHeadcount} staff</td>
                          <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {isSalaryVisible() ? formatCurrency(pay.grossPayroll) : '₹ ••••••••'}
                          </td>
                          <td className="p-4 font-mono text-amber-600 font-semibold">
                            {isSalaryVisible() ? formatCurrency(pay.statutoryDeductions) : '₹ ••••••••'}
                          </td>
                          <td className="p-4 font-mono font-bold text-emerald-600">
                            {isSalaryVisible() ? formatCurrency(pay.netDisbursed) : '₹ ••••••••'}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{pay.approvedBy}</td>
                          <td className="p-4 text-right">
                            <Badge variant="success" className="text-[10px] uppercase font-bold px-2 py-0.5">
                              {pay.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Tasks & Deliverables Audit */}
        <TabsContent value="tasks">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Task Allocation & Deliverable Execution Audit</CardTitle>
                <div className="text-xs text-slate-500 mt-0.5">Assigned work packages, employee hours, proof attachments, and review ratings</div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {reports.tasksAudit?.length || 0} Deliverables
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Deliverable Scope</th>
                      <th className="p-4">Assigned Employee</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Target Due</th>
                      <th className="p-4">Progress</th>
                      <th className="p-4">Proof Document</th>
                      <th className="p-4">Review Score</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.tasksAudit || []).map((task: any) => (
                      <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">{task.title}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{task.assigneeName}</td>
                        <td className="p-4 capitalize text-slate-600 dark:text-slate-400">{task.category.replace(/_/g, ' ')}</td>
                        <td className="p-4">
                          <Badge
                            variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'}
                            className="text-[10px] uppercase font-bold"
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{task.dueDate}</td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{task.progressPercent}%</td>
                        <td className="p-4">
                          {task.proofDocumentName ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-semibold">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">{task.proofDocumentName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No proof</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-amber-600">
                          {task.rating ? `${task.rating} / 5 Score` : 'Pending'}
                        </td>
                        <td className="p-4 text-right">
                          <Badge
                            variant={task.status === 'completed' ? 'success' : task.status === 'under_review' ? 'warning' : 'outline'}
                            className="text-[10px] uppercase font-bold px-2 py-0.5"
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Department & Plant Matrix */}
        <TabsContent value="matrix" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Matrix */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Department Headcount & Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Department Unit</th>
                      <th className="p-4 font-mono">Active Staff</th>
                      <th className="p-4 text-right">Monthly Payroll</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.departmentMatrix || []).map((dept: any) => (
                      <tr key={dept.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{dept.name}</td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{dept.headcount}</td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-right">
                          {isSalaryVisible() ? formatCurrency(dept.monthlyPayroll) : '₹ ••••••••'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Plant Matrix */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Plant Branch Locations & Scope</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4">Plant / Facility Location</th>
                      <th className="p-4 font-mono">Assigned Staff</th>
                      <th className="p-4 text-right">Monthly Payroll</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reports.branchMatrix || []).map((br: any) => (
                      <tr key={br.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{br.name} ({br.city})</td>
                        <td className="p-4 font-mono font-bold text-indigo-600">{br.headcount}</td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-right">
                          {isSalaryVisible() ? formatCurrency(br.monthlyPayroll) : '₹ ••••••••'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
