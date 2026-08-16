'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Wallet,
  Calendar,
  Award,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { FieldLoader } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const { currentRole } = useAuth();

  if (currentRole === 'employee') {
    return (
      <RBACGuard module="system_settings">
        <ReportsContent />
      </RBACGuard>
    );
  }

  return (
    <RBACGuard module="reports_dashboard">
      <ReportsContent />
    </RBACGuard>
  );
}

function ReportsContent() {
  const { currentRole, isSalaryVisible } = useAuth();
  const [reportsData, setReportsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/reports', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setReportsData(data.data);
        }
      })
      .catch((err) => console.error('Failed to load reports API data:', err))
      .finally(() => setLoading(false));
  }, [currentRole]);

  const metrics = reportsData?.metrics || {
    attritionRate: 0,
    costPerHire: 0,
    trainingScore: 0,
    leaveUtilization: 0,
  };

  const payrollTrend = reportsData?.payrollTrend || [];
  const headcountGrowth = reportsData?.headcountGrowth || [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Executive Analytics & Report Library</span>
            <Badge variant="purple" className="text-xs">
              Live Database BI
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Headcount trends, attrition rate, payroll cost evolution, and statutory compliance status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => alert('Exporting comprehensive quarterly executive report (PDF)...')}
          >
            <Download className="h-4 w-4" />
            <span>Export Executive Summary</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Annualized Attrition Rate</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              {loading ? <FieldLoader className="h-8 w-16" /> : `${metrics.attritionRate}%`}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Calculated from live exit records</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Avg. Cost Per Hire</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2 font-mono">
              {loading ? <FieldLoader className="h-8 w-24" /> : formatCurrency(metrics.costPerHire)}
            </div>
            <div className="text-xs text-slate-400 mt-1">Active talent acquisition cost</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Training ROI / Satisfaction</span>
            <div className="text-3xl font-extrabold text-purple-600 mt-2">
              {loading ? <FieldLoader className="h-8 w-20" /> : `${metrics.trainingScore} / 5.0`}
            </div>
            <div className="text-xs text-purple-600 font-medium mt-1">Workshop completion rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Leave Utilization</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {loading ? <FieldLoader className="h-8 w-16" /> : `${metrics.leaveUtilization}%`}
            </div>
            <div className="text-xs text-slate-400 mt-1">Approved leaves to workforce quota</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Evolution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Headcount Growth & Net Movement</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Live Headcount
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              {headcountGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={headcountGrowth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                    <Bar dataKey="headcount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Headcount" />
                    <Bar dataKey="joins" fill="#10b981" radius={[4, 4, 0, 0]} name="New Joins" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading headcount trends...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payroll Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>Payroll Cost Evolution</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Monthly Cycles
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            {isSalaryVisible() ? (
              <div className="h-72 w-full">
                {payrollTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payrollTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val))}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                      />
                      <Line type="monotone" dataKey="gross" stroke="#6366f1" strokeWidth={2} name="Gross CTC" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Net Disbursed" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No payroll cycle records found</div>
                )}
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200">
                <div className="text-xs font-semibold text-slate-500">Restricted Executive Data</div>
                <div className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Payroll aggregation is restricted to Board Directors and CHRO.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
