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

  const upcomingCount = trainings.filter((t) => t.status === 'upcoming').length;
  const totalEnrolled = trainings.reduce((acc, t) => acc + (t.enrolledCount || 0), 0);

  const [enrolledMap, setEnrolledMap] = useState<Record<string, boolean>>({});

  const handleEnroll = async (trainingId: string) => {
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ action: 'enroll', trainingId }),
      });

      const data = await res.json();
      if (data?.success) {
        setEnrolledMap((prev) => ({ ...prev, [trainingId]: true }));
        setTrainings((prev) =>
          prev.map((t) => (t.id === trainingId ? { ...t, enrolledCount: (t.enrolledCount || 0) + 1 } : t))
        );
      }
    } catch (err) {
      console.error('Failed to enroll in training program:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>{isEmployee ? 'My Enrolled Training Programs & Certifications' : 'Training & Skill Development Matrix'}</span>
            <Badge variant="purple" className="text-xs">
              {isEmployee ? 'Enrolled Active' : 'Industrial Upskilling'}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEmployee
              ? 'View your assigned mandatory compliance workshops, plant technical safety courses, and completion certificates.'
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
            <p className="text-xs text-slate-500">Scheduled for August 2026</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Enrolled</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="font-bold text-2xl text-slate-900">{totalEnrolled} Operators</div>
            <p className="text-xs text-slate-500">Across Plant Operations & QC</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-50/20">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Average Score</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="font-bold text-2xl text-slate-900">4.8 / 5.0</div>
            <p className="text-xs text-slate-500">Post-training evaluation rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trainings.map((prog) => {
          const isEnrolled = enrolledMap[prog.id];

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
                  <span className="text-slate-500 font-semibold">Enrolled: {prog.enrolledCount} / {prog.capacity}</span>
                  {isEmployee ? (
                    <Button
                      size="sm"
                      variant={isEnrolled ? 'outline' : 'default'}
                      disabled={isEnrolled}
                      onClick={() => handleEnroll(prog.id)}
                      className={isEnrolled ? 'text-emerald-600 border-emerald-300 bg-emerald-50 h-7 text-xs font-bold' : 'bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs'}
                    >
                      {isEnrolled ? 'Enrolled' : 'Enroll Now'}
                    </Button>
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
    </div>
  );
}

