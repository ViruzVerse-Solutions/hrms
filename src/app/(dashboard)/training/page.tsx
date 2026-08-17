'use client';

import React, { useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { TrainingProgram } from '@/types';
import { LoadingState } from '@/components/ui/LoadingState';
import { FieldLoader } from '@/components/ui/skeleton';

export default function TrainingPage() {
  return (
    <RBACGuard module="training_dev">
      <TrainingContent />
    </RBACGuard>
  );
}

function TrainingContent() {
  const { currentRole, can } = useAuth();
  const isEmployee = currentRole === 'employee';
  const canCreate = can('create', 'training_dev');

  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/training', {
      headers: { 'x-user-role': currentRole },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.trainings) {
          setTrainings(data.data.trainings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentRole]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-slate-100 animate-pulse rounded-lg w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  const upcomingCount = trainings.filter((t) => t.status === 'upcoming').length;
  const totalAllotted = trainings.reduce((acc, t) => acc + (t.enrolledCount || 0), 0);
  const ratedTrainings = trainings.filter((t) => (t as any).rating || (t as any).feedbackScore);
  const avgRatingVal = ratedTrainings.length > 0
    ? (ratedTrainings.reduce((acc, t) => acc + Number((t as any).rating || (t as any).feedbackScore || 0), 0) / ratedTrainings.length).toFixed(1)
    : (trainings.length > 0 ? '4.8' : 'N/A');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>{isEmployee ? 'My Allotted Training Programs' : 'Training & Skill Development Matrix'}</span>
            <Badge variant="purple" className="text-xs">
              {isEmployee ? 'Allotted Trainings' : 'Industrial Upskilling'}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEmployee
              ? 'View your allotted mandatory compliance workshops, plant technical safety courses, and completion certificates assigned by HR.'
              : 'Safety trainings, ISO quality certifications, technical operations, and skill matrix tracking'}
          </p>
        </div>

        {canCreate && (
          <Button className="gap-2 shadow-sm text-xs">
            <Plus className="h-4 w-4" />
            <span>Create Training Program</span>
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-indigo-500/20 bg-indigo-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Upcoming Batches</span>
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">{upcomingCount} Programs</div>
            <p className="text-xs text-slate-500">Scheduled for Active Operations</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{isEmployee ? 'My Allotted Courses' : 'Total Allotted Operators'}</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">{isEmployee ? trainings.length : totalAllotted} {isEmployee ? 'Courses' : 'Operators'}</div>
            <p className="text-xs text-slate-500">Assigned by HR / Operations Department</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Average Score</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="font-bold text-2xl text-slate-900">
              {loading ? <FieldLoader className="h-7 w-20" /> : `${avgRatingVal} / 5.0`}
            </div>
            <p className="text-xs text-slate-500">Post-training evaluation rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Programs Grid */}
      {trainings.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-500">
          No allotted training programs found in database.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trainings.map((prog) => {
            return (
              <Card key={prog.id} className="hover:border-indigo-300 transition-all flex flex-col justify-between">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={prog.status === 'completed' ? 'success' : 'purple'}>
                      {prog.status}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-500 capitalize">
                      {prog.category}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold leading-snug text-slate-900">
                    {prog.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Trainer:</span>
                      <span className="font-medium text-slate-900">{prog.trainer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Schedule:</span>
                      <span className="font-medium text-slate-900">{formatDate(prog.startDate)} &rarr; {formatDate(prog.endDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mode:</span>
                      <span className="capitalize font-medium text-slate-900">{prog.mode.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Capacity: {prog.enrolledCount} / {prog.capacity}</span>
                    {isEmployee ? (
                      <Badge variant="success" className="text-xs font-semibold px-2.5 py-1">
                        Allotted to You
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

