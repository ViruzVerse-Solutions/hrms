'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Wallet,
  Calendar,
  Award,
  Filter,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Layers,
  PieChart as PieIcon,
  LineChart as LineIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { LoadingState } from '@/components/ui/LoadingState';
import { MISReportData } from '@/types';

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
  const { currentRole, isSalaryVisible } = useAuth();

  const [misData, setMisData] = useState<MISReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // MIS Interactive Slicers
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedHorizon, setSelectedHorizon] = useState('6m');

  const fetchMIS = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.set('branch', selectedBranch);
      if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
      params.set('horizon', selectedHorizon);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data?.data) {
        setMisData(json.data.data);
      }
    } catch (err) {
      console.error('Failed to load MIS reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMIS();
  }, [currentRole, selectedBranch, selectedDepartment, selectedHorizon]);

  // Export CSV
  const handleExportCSV = () => {
    if (!misData) return;
    const rows = [
      ['Department', 'Headcount', 'Payroll Share (INR)', 'Average Attendance (%)', 'Active Tasks'],
      ...misData.departmentBreakdown.map((d) => [
        `"${d.department}"`,
        d.headcount,
        d.payrollShare,
        `${d.avgAttendance}%`,
        d.activeTasks,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Viruzverse_MIS_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !misData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState variant="dashboard" />
      </div>
    );
  }

  const m = misData?.metrics || {
    totalHeadcount: 142,
    activeHeadcount: 138,
    attritionRate: 3.4,
    genderRatio: { male: 68, female: 32 },
    totalMonthlyPayroll: 6840000,
    avgMonthlyCTC: 49500,
    statutoryLiability: 820800,
    overtimeHours: 246,
    attendancePunctuality: 94.8,
    leaveBurnRate: 6.2,
    openRequisitions: 8,
    avgTimeToHireDays: 22,
    taskCompletionRate: 85,
    overdueTasksCount: 1,
  };

  const departmentBreakdown = misData?.departmentBreakdown || [];
  const headcountGrowth = misData?.headcountGrowth || [];
  const payrollTrend = misData?.payrollTrend || [];
  const attendanceTrend = misData?.attendanceTrend || [];

  const GENDER_COLORS = ['#6366f1', '#ec4899'];
  const genderData = [
    { name: 'Male', value: m.genderRatio.male },
    { name: 'Female', value: m.genderRatio.female },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* 1. Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Management Information System (MIS) Hub
            </h1>
            <Badge variant="purple" className="text-[11px] font-semibold">
              Strategic BI
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Live enterprise analytics across workforce demographics, compensation variance, attendance muster, and deliverable velocity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs border-slate-200 text-slate-700 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print PDF</span>
          </Button>
        </div>
      </div>

      {/* 2. Interactive Slicer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
          <Filter className="h-3.5 w-3.5 text-indigo-600" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Plant / Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-7 px-2 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none"
            >
              <option value="all">All Plant Locations</option>
              <option value="Pune">Pune Plant (HQ)</option>
              <option value="Chennai">Chennai Logistics</option>
              <option value="Bengaluru">Bengaluru Tech</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-7 px-2 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none"
            >
              <option value="all">All Departments</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Quality">Quality & EHS</option>
              <option value="Engineering">Engineering</option>
              <option value="Logistics">Logistics</option>
              <option value="Human Resources">HR & Legal</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            {(['6m', 'ytd', '12m'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase transition-all ${
                  selectedHorizon === h ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Core 4 Key Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Active Headcount</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{m.activeHeadcount}</div>
            <div className="text-[11px] text-slate-400 mt-1">{m.totalHeadcount} total on payroll</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Monthly Gross Payroll</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 font-mono">
              {isSalaryVisible() ? formatCurrency(m.totalMonthlyPayroll) : '₹ ••••••••'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Avg CTC: {formatCurrency(m.avgMonthlyCTC)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Muster Punctuality</span>
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 mt-2 font-mono">{m.attendancePunctuality}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Overtime: {m.overtimeHours}h logged</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Attrition Rate</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2 font-mono">{m.attritionRate}%</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Below industry ceiling</div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Tabbed Deep-Dive Sections */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs gap-1">
          <TabsTrigger value="overview" className="py-2 text-xs font-semibold rounded-lg">
            Workforce & Diversity
          </TabsTrigger>
          <TabsTrigger value="financials" className="py-2 text-xs font-semibold rounded-lg">
            Compensation & Taxes
          </TabsTrigger>
          <TabsTrigger value="operations" className="py-2 text-xs font-semibold rounded-lg">
            Attendance & Shifts
          </TabsTrigger>
          <TabsTrigger value="departments" className="py-2 text-xs font-semibold rounded-lg">
            Department Matrix
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Workforce & Diversity */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Headcount Trajectory */}
            <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>Headcount Trajectory & Growth</span>
                </CardTitle>
                <Badge variant="outline" className="text-[11px]">Monthly Net Adds</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={headcountGrowth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Active Staff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gender Ratio */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Gender Diversity Ratio</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-[11px] text-slate-500 mt-1">
                  Male: {m.genderRatio.male}% • Female: {m.genderRatio.female}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Financials */}
        <TabsContent value="financials" className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>Monthly Payroll Cost & Statutory Tax Liabilities</span>
              </CardTitle>
              <Badge variant="outline" className="text-[11px]">Gross vs Net vs Statutory</Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {isSalaryVisible() ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payrollTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val))}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="gross" stroke="#6366f1" strokeWidth={2} name="Gross Payroll" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Net Salary" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="statutory" stroke="#ec4899" strokeWidth={2} name="Statutory Dues" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  Restricted Compensation View
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Operations & Attendance */}
        <TabsContent value="operations" className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>7-Day Attendance Rate & Outdoor Duty (OD) Velocity</span>
              </CardTitle>
              <Badge variant="outline" className="text-[11px]">Plant Operations</Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[85, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="presentRate" stroke="#10b981" strokeWidth={2} name="Present Rate (%)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="odCount" stroke="#6366f1" strokeWidth={2} name="Outdoor Duty (OD)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Department Matrix */}
        <TabsContent value="departments" className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Department Operational & Compensation Matrix</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-center">Headcount</th>
                      <th className="p-3">Monthly Wage Share</th>
                      <th className="p-3">Avg Attendance</th>
                      <th className="p-3">Active Tasks</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {departmentBreakdown.map((dept, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {dept.department}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold">
                          {dept.headcount}
                        </td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {isSalaryVisible() ? formatCurrency(dept.payrollShare) : '₹ •••••••'}
                        </td>
                        <td className="p-3 font-mono font-medium">
                          <span className={dept.avgAttendance >= 95 ? 'text-emerald-600' : 'text-amber-600'}>
                            {dept.avgAttendance}%
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <Badge variant="outline" className="text-[10px]">
                            {dept.activeTasks} Tasks
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="success" className="text-[10px]">Optimal</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
