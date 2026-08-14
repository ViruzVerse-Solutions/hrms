'use client';

import React from 'react';
import { MOCK_TRAININGS } from '@/lib/mock-data';
import {
  GraduationCap,
  Calendar,
  Users,
  Award,
  Star,
  ExternalLink,
  Plus,
  BookOpen,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RBACGuard } from '@/components/layout/RBACGuard';

export default function TrainingPage() {
  return (
    <RBACGuard module="training_dev">
      <TrainingContent />
    </RBACGuard>
  );
}

function TrainingContent() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Training & Skill Development</span>
            <Badge variant="outline" className="text-xs">
              Annual Calendar
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Skill gap identification, internal workshops, vendor-led programs, and feedback metrics
          </p>
        </div>

        <Button className="gap-2 shadow-sm text-xs">
          <Plus className="h-4 w-4" />
          <span>Schedule Program</span>
        </Button>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MOCK_TRAININGS.map((prog) => (
          <Card key={prog.id} className="hover:shadow-md transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant={prog.category === 'technical' ? 'purple' : 'info'} className="text-[10px] capitalize">
                    {prog.category}
                  </Badge>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {prog.title}
                  </h3>
                  <div className="text-xs text-slate-500">Trainer: {prog.trainer}</div>
                </div>
                <Badge
                  variant={prog.status === 'completed' ? 'success' : 'warning'}
                  className="text-[10px] uppercase font-mono"
                >
                  {prog.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <div>
                    <div className="text-[10px] text-slate-400">Duration</div>
                    <div className="font-semibold">
                      {formatDate(prog.startDate)} {prog.startDate !== prog.endDate && `→ ${formatDate(prog.endDate)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="text-[10px] text-slate-400">Enrollment</div>
                    <div className="font-semibold">
                      {prog.enrolledCount} / {prog.capacity} Seats
                    </div>
                  </div>
                </div>
              </div>

              {prog.feedbackAvgScore && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Effectiveness Rating:</span>
                  <span className="font-bold text-emerald-600 font-mono flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-emerald-500" />
                    {prog.feedbackAvgScore} / 5.0
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
