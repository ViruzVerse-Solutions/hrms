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
} from 'recharts';

const PAYROLL_TREND_DATA = [
  { month: 'Mar', gross: 7200000, net: 6180000 },
  { month: 'Apr', gross: 7850000, net: 6730000 },
  { month: 'May', gross: 8100000, net: 6950000 },
  { month: 'Jun', gross: 8400000, net: 7210000 },
  { month: 'Jul', gross: 8645000, net: 7411000 },
  { month: 'Aug', gross: 8910000, net: 7625000 },
];

const HEADCOUNT_GROWTH_DATA = [
  { month: 'Mar', headcount: 88, joins: 6, exits: 1 },
  { month: 'Apr', headcount: 93, joins: 7, exits: 2 },
  { month: 'May', headcount: 97, joins: 5, exits: 1 },
  { month: 'Jun', headcount: 100, joins: 4, exits: 1 },
  { month: 'Jul', headcount: 102, joins: 3, exits: 1 },
  { month: 'Aug', headcount: 105, joins: 4, exits: 1 },
];

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Executive Analytics & Report Library</span>
            <Badge variant="purple" className="text-xs">
              Cross-Module BI
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
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">6.2%</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Well below industry 14% benchmark</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Avg. Cost Per Hire</span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2 font-mono">₹48,500</div>
            <div className="text-xs text-slate-400 mt-1">Time to fill: 24 Days</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Training ROI / Satisfaction</span>
            <div className="text-3xl font-extrabold text-purple-600 mt-2">4.8 / 5.0</div>
            <div className="text-xs text-purple-600 font-medium mt-1">94% skill applicability rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-slate-500">Leave Utilization</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">68.4%</div>
            <div className="text-xs text-slate-400 mt-1">Healthy work-life balance</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Expense Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-600" />
              <span>Monthly Payroll Expenditure (Gross vs Net Disbursal)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PAYROLL_TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis
                    fontSize={11}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="gross" fill="#6366f1" name="Gross Wages" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" fill="#10b981" name="Net Disbursed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Headcount Trajectory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span>Workforce Headcount Trajectory (6 Months)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={HEADCOUNT_GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} domain={[80, 115]} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="headcount"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Total Headcount"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
