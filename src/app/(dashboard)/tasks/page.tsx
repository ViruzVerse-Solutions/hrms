'use client';

import React, { useState, useEffect } from 'react';
import { RBACGuard } from '@/components/layout/RBACGuard';
import { useAuth } from '@/context/AuthContext';
import { TaskAllocationItem, TaskPriority, TaskCategory, TaskStatus } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Layers,
  Star,
  Sliders,
  Send,
  Building,
  Briefcase,
  TrendingUp,
  X,
  MessageSquare,
  Kanban,
  ListFilter,
  ArrowRight,
  Sparkles,
  Play,
  FileCheck,
  Eye,
  Paperclip,
  FileText,
  ExternalLink,
  UploadCloud,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function TasksPage() {
  return (
    <RBACGuard module="tasks_work">
      <TasksContent />
    </RBACGuard>
  );
}

function TasksContent() {
  const { currentRole, currentUser, currentEmployee, employees } = useAuth();

  const [tasks, setTasks] = useState<TaskAllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskAllocationItem | null>(null);

  const [createError, setCreateError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  // Forms with clean empty initial state (no pre-filled defaults, pure placeholders)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'operational' as TaskCategory,
    priority: 'medium' as TaskPriority,
    assigneeId: '',
    dueDate: '',
    estimatedHours: '',
  });

  const [updateForm, setUpdateForm] = useState({
    actualHours: '',
    deliverableNotes: '',
    proofDocumentName: '',
    proofDocumentUrl: '',
    logMessage: '',
    status: 'in_progress' as TaskStatus,
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    reviewComments: '',
    status: 'completed' as 'completed' | 'in_progress' | 'blocked',
  });

  const isEmployee = currentRole === 'employee';
  const isHigherProfile =
    currentRole === 'hr_head' ||
    currentRole === 'managing_director' ||
    currentRole === 'chairman' ||
    currentRole === 'internal_audit_head' ||
    currentRole === 'compliance_statutory';

  // Active current user identifier for self ownership
  const currentUserIdOrCode = currentEmployee?.id || currentEmployee?.employeeCode || currentUser?.employeeId || '';

  // Filter assignable staff: STRICTLY operational employees (exclude HR, Compliance, Legal, Audit, Executive Board)
  const employeeOnlyList = employees.filter((emp) => {
    const dept = (emp.departmentName || '').toLowerCase();
    const des = (emp.designationTitle || '').toLowerCase();
    const code = (emp.employeeCode || '').toUpperCase();

    const isNonOperationalStaff =
      dept.includes('human resources') ||
      dept.includes('hr') ||
      dept.includes('compliance') ||
      dept.includes('legal') ||
      dept.includes('audit') ||
      dept.includes('executive') ||
      dept.includes('board') ||
      des.includes('chairman') ||
      des.includes('managing director') ||
      des.includes('director') ||
      des.includes('head') ||
      des.includes('compliance') ||
      des.includes('hr') ||
      des.includes('officer') ||
      code === 'VV-001' ||
      code === 'VV-002' ||
      code === 'VV-003' ||
      code === 'VV-004' ||
      code === 'VV-005';

    return !isNonOperationalStaff;
  });

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      if (tasks.length === 0) setLoading(true);
      const json = await apiClient.tasks.getAll(currentRole);
      if (json.success && json.data?.tasks) {
        setTasks(json.data.tasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentRole]);

  // Reactive auto-sync when mutations happen anywhere
  useEffect(() => {
    const handleMutation = (e: any) => {
      const tags = e.detail?.tags || [];
      if (tags.length === 0 || tags.includes('tasks') || tags.includes('dashboard')) {
        apiClient.tasks.getAll(currentRole).then((json) => {
          if (json.success && json.data?.tasks) {
            setTasks((current) => {
              const serverTasks: TaskAllocationItem[] = json.data.tasks;
              const serverIds = new Set(serverTasks.map((t) => t.id));
              const pendingOptimistic = current.filter(
                (t) => t.id.startsWith('temp_task_') && !serverIds.has(t.id)
              );
              return [...pendingOptimistic, ...serverTasks];
            });
          }
        });
      }
    };
    window.addEventListener('hrms_data_mutation', handleMutation);
    return () => window.removeEventListener('hrms_data_mutation', handleMutation);
  }, [currentRole]);

  // Check if caller is the assigned employee (Self)
  const isAssigneeSelf = (task: TaskAllocationItem) => {
    if (!currentUserIdOrCode) return false;
    return (
      task.assigneeId === currentUserIdOrCode ||
      task.assigneeId === currentEmployee?.id ||
      task.assigneeId === currentEmployee?.employeeCode ||
      task.assigneeName.toLowerCase() === `${currentEmployee?.firstName} ${currentEmployee?.lastName}`.toLowerCase()
    );
  };

  // Quick Action: Employee starts working on task (0ms Instant Optimistic update + DB sync)
  const handleQuickStart = async (task: TaskAllocationItem) => {
    // Instant optimistic update (0ms UI latency)
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'in_progress', progressPercent: 50 } : t))
    );

    try {
      const json = await apiClient.tasks.update(task.id, {
        status: 'in_progress',
        logMessage: 'Work initiated on deliverable.',
      }, currentRole);
      if (json.success && json.data?.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? json.data.task : t)));
      }
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  // Handle Create Task (0ms Instant Optimistic dispatch with strict field validation)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.title.trim()) {
      setCreateError('Deliverable Title is required. Please provide a title.');
      return;
    }
    if (!createForm.assigneeId) {
      setCreateError('Please select an operational staff member to assign this task.');
      return;
    }
    if (!createForm.dueDate) {
      setCreateError('Target Due Date is mandatory. Please pick a date.');
      return;
    }
    if (createForm.dueDate < todayStr) {
      setCreateError('Target Due Date cannot be in the past.');
      return;
    }

    const assignedEmp = employeeOnlyList.find(
      (emp) => emp.id === createForm.assigneeId || emp.employeeCode === createForm.assigneeId
    );

    const tempId = `temp_task_${Date.now()}`;
    const optimisticTask: TaskAllocationItem = {
      id: tempId,
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      category: createForm.category,
      priority: createForm.priority,
      status: 'pending',
      progressPercent: 0,
      assigneeId: createForm.assigneeId,
      assigneeName: assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : 'Assigned Employee',
      assigneeDepartment: assignedEmp?.departmentName || assignedEmp?.departmentId || 'Operations',
      assigneeDesignation: assignedEmp?.designationTitle || assignedEmp?.designationId || 'Staff Member',
      assignedById: currentUser?.employeeId || currentRole,
      assignedByName: currentUser?.name || 'Administrator',
      assignedByRole: currentRole,
      dueDate: createForm.dueDate,
      estimatedHours: Number(createForm.estimatedHours || 8),
      actualHours: 0,
      logs: [
        {
          id: `log_${Date.now()}`,
          taskId: tempId,
          authorId: currentUser?.employeeId || currentRole,
          authorName: currentUser?.name || 'Administrator',
          authorRole: currentRole,
          message: 'Task assigned and published.',
          progressAt: 0,
          loggedHours: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 0ms Instant UI Reflection
    setTasks((prev) => [optimisticTask, ...prev]);
    setCreateModalOpen(false);
    const formPayload = { ...createForm };
    setCreateForm({
      title: '',
      description: '',
      category: 'operational',
      priority: 'medium',
      assigneeId: '',
      dueDate: '',
      estimatedHours: '',
    });

    try {
      const json = await apiClient.tasks.create({
        ...formPayload,
        estimatedHours: Number(formPayload.estimatedHours || 8),
        assigneeName: assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : 'Assigned Employee',
        assigneeDepartment: assignedEmp?.departmentName || assignedEmp?.departmentId || 'Operations',
        assigneeDesignation: assignedEmp?.designationTitle || assignedEmp?.designationId || 'Staff Member',
      }, currentRole);
      if (json.success && json.data?.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? json.data.task : t)));
      } else {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      fetchTasks();
    }
  };

  // Handle Update Progress & Proof Attachment (0ms Instant Optimistic update)
  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setUpdateError('');

    const targetStatus = updateForm.status;
    const progress =
      targetStatus === 'completed'
        ? 100
        : targetStatus === 'under_review'
        ? 90
        : targetStatus === 'in_progress'
        ? 50
        : 0;

    // Instant optimistic update (0ms latency)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: targetStatus,
              progressPercent: progress,
              actualHours: Number(updateForm.actualHours || t.actualHours || 0),
              deliverableNotes: updateForm.deliverableNotes || t.deliverableNotes,
              proofDocumentName: updateForm.proofDocumentName || t.proofDocumentName,
              proofDocumentUrl: updateForm.proofDocumentUrl || t.proofDocumentUrl,
            }
          : t
      )
    );

    const taskId = selectedTask.id;
    const formPayload = { ...updateForm };
    setUpdateModalOpen(false);
    setSelectedTask(null);

    try {
      const json = await apiClient.tasks.update(taskId, {
        ...formPayload,
        actualHours: Number(formPayload.actualHours || 0),
      }, currentRole);
      if (json.success && json.data?.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data.task : t)));
      }
    } catch (err) {
      console.error('Failed to update task progress:', err);
      fetchTasks();
    }
  };

  // Handle Manager / Higher Profile Review Sign-Off (0ms Instant Optimistic completion)
  const handleReviewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setReviewError('');

    // Instant optimistic update (0ms latency)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: reviewForm.status as any,
              rating: reviewForm.rating,
              reviewComments: reviewForm.reviewComments,
              progressPercent: reviewForm.status === 'completed' ? 100 : t.progressPercent,
            }
          : t
      )
    );

    const taskId = selectedTask.id;
    const formPayload = { ...reviewForm };
    setReviewModalOpen(false);
    setSelectedTask(null);

    try {
      const json = await apiClient.tasks.review(taskId, formPayload, currentRole);
      if (json.success && json.data?.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data.task : t)));
      }
    } catch (err) {
      console.error('Failed to review task:', err);
      fetchTasks();
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // KPI Calculations
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const underReviewCount = tasks.filter((t) => t.status === 'under_review').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isEmployee ? 'Assigned Work & Deliverables' : 'Enterprise Deliverables & Task Allocation'}
            </h1>
            <Badge variant="purple" className="text-xs font-semibold px-2 py-0.5">
              {isEmployee ? 'Self-Service Execution' : 'Governance & Verification'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {isEmployee
              ? 'View assigned work items, log progress notes, attach verification documents, and submit deliverables for review.'
              : 'Assign tasks to operational employees, inspect deliverable evidence, and authorize phase sign-offs.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              <span>List View</span>
            </button>
          </div>

          {(currentRole === 'hr_head' || currentRole === 'managing_director' || currentRole === 'chairman') && (
            <Button
              size="default"
              onClick={() => {
                setCreateForm({
                  title: '',
                  description: '',
                  category: 'operational',
                  priority: 'medium',
                  assigneeId: '',
                  dueDate: '',
                  estimatedHours: '',
                });
                setCreateModalOpen(true);
              }}
              className="gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md h-10 px-4 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Task to Employee</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Interactive KPI Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer transition-all border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-indigo-400 ${
            statusFilter === 'all' ? 'ring-2 ring-indigo-500/20 border-indigo-600' : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>All Deliverables</span>
              <CheckSquare className="h-4 w-4 text-indigo-600" />
            </div>
            {loading && tasks.length === 0 ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 mt-2 font-mono">{totalCount}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">Total assigned scope</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('in_progress')}
          className={`cursor-pointer transition-all border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 ${
            statusFilter === 'in_progress' ? 'ring-2 ring-blue-500/20 border-blue-600' : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>In Progress</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            {loading && tasks.length === 0 ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2 font-mono">{inProgressCount}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">Being actively executed</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('under_review')}
          className={`cursor-pointer transition-all border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-400 ${
            statusFilter === 'under_review' ? 'ring-2 ring-amber-500/20 border-amber-600' : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Under Review</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            {loading && tasks.length === 0 ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2 font-mono">{underReviewCount}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">Awaiting verification</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('completed')}
          className={`cursor-pointer transition-all border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-400 ${
            statusFilter === 'completed' ? 'ring-2 ring-emerald-500/20 border-emerald-600' : ''
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            {loading && tasks.length === 0 ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{completedCount}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">Signed-off and verified</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={isEmployee ? 'Search your assigned deliverables, categories, or keywords...' : 'Search deliverables, employee assignees, categories...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full outline-none text-xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['all', 'pending', 'in_progress', 'under_review', 'completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none font-semibold"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* 4. Kanban / List Board */}
      {loading && tasks.length === 0 ? (
        <div className="py-4">
          <LoadingState variant={viewMode === 'kanban' ? 'kanban' : 'table'} rows={4} count={4} />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {/* Column 1: To Do */}
          <KanbanColumn
            title="To Do"
            count={filteredTasks.filter((t) => t.status === 'pending').length}
            dotColor="bg-slate-400"
            tasks={filteredTasks.filter((t) => t.status === 'pending')}
            isAssigneeSelf={isAssigneeSelf}
            isHigherProfile={isHigherProfile}
            isEmployee={isEmployee}
            onQuickStart={handleQuickStart}
            onOpenUpdate={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'in_progress',
              });
              setUpdateModalOpen(true);
            }}
            onSubmitForReview={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'under_review',
              });
              setUpdateModalOpen(true);
            }}
            onOpenReview={(task) => {
              setSelectedTask(task);
              setReviewForm({
                rating: 5,
                reviewComments: '',
                status: 'completed',
              });
              setReviewModalOpen(true);
            }}
            onOpenViewDetails={(task) => {
              setSelectedTask(task);
              setViewDetailModalOpen(true);
            }}
          />

          {/* Column 2: In Progress */}
          <KanbanColumn
            title="In Progress"
            count={filteredTasks.filter((t) => t.status === 'in_progress').length}
            dotColor="bg-blue-500"
            tasks={filteredTasks.filter((t) => t.status === 'in_progress')}
            isAssigneeSelf={isAssigneeSelf}
            isHigherProfile={isHigherProfile}
            isEmployee={isEmployee}
            onQuickStart={handleQuickStart}
            onOpenUpdate={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'in_progress',
              });
              setUpdateModalOpen(true);
            }}
            onSubmitForReview={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'under_review',
              });
              setUpdateModalOpen(true);
            }}
            onOpenReview={(task) => {
              setSelectedTask(task);
              setReviewForm({
                rating: 5,
                reviewComments: '',
                status: 'completed',
              });
              setReviewModalOpen(true);
            }}
            onOpenViewDetails={(task) => {
              setSelectedTask(task);
              setViewDetailModalOpen(true);
            }}
          />

          {/* Column 3: Under Review */}
          <KanbanColumn
            title="Under Review"
            count={filteredTasks.filter((t) => t.status === 'under_review').length}
            dotColor="bg-amber-500"
            tasks={filteredTasks.filter((t) => t.status === 'under_review')}
            isAssigneeSelf={isAssigneeSelf}
            isHigherProfile={isHigherProfile}
            isEmployee={isEmployee}
            onQuickStart={handleQuickStart}
            onOpenUpdate={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'under_review',
              });
              setUpdateModalOpen(true);
            }}
            onSubmitForReview={(task) => {
              setSelectedTask(task);
              setUpdateForm({
                actualHours: '',
                deliverableNotes: task.deliverableNotes || '',
                proofDocumentName: task.proofDocumentName || '',
                proofDocumentUrl: task.proofDocumentUrl || '',
                logMessage: '',
                status: 'under_review',
              });
              setUpdateModalOpen(true);
            }}
            onOpenReview={(task) => {
              setSelectedTask(task);
              setReviewForm({
                rating: 5,
                reviewComments: '',
                status: 'completed',
              });
              setReviewModalOpen(true);
            }}
            onOpenViewDetails={(task) => {
              setSelectedTask(task);
              setViewDetailModalOpen(true);
            }}
          />

          {/* Column 4: Completed */}
          <KanbanColumn
            title="Completed"
            count={filteredTasks.filter((t) => t.status === 'completed').length}
            dotColor="bg-emerald-500"
            tasks={filteredTasks.filter((t) => t.status === 'completed')}
            isAssigneeSelf={isAssigneeSelf}
            isHigherProfile={isHigherProfile}
            isEmployee={isEmployee}
            onQuickStart={handleQuickStart}
            onOpenUpdate={(task) => {
              setSelectedTask(task);
              setUpdateModalOpen(true);
            }}
            onSubmitForReview={(task) => {
              setSelectedTask(task);
              setUpdateModalOpen(true);
            }}
            onOpenReview={(task) => {
              setSelectedTask(task);
              setReviewForm({
                rating: 5,
                reviewComments: '',
                status: 'completed',
              });
              setReviewModalOpen(true);
            }}
            onOpenViewDetails={(task) => {
              setSelectedTask(task);
              setViewDetailModalOpen(true);
            }}
          />
        </div>
      ) : (
        /* List View */
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Deliverable Title & Scope</th>
                    {!isEmployee && <th className="p-4">Assigned Employee</th>}
                    {isEmployee && <th className="p-4">Assigned By</th>}
                    <th className="p-4">Category</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Proof Attachment</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTasks.map((task) => {
                    const isSelf = isAssigneeSelf(task);
                    return (
                      <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white truncate">{task.title}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{task.description}</div>
                        </td>
                        {!isEmployee && (
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{task.assigneeName}</div>
                            <div className="text-[11px] text-slate-400">{task.assigneeDepartment}</div>
                          </td>
                        )}
                        {isEmployee && (
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{task.assignedByName}</div>
                            <div className="text-[11px] text-slate-400 capitalize">{task.assignedByRole.replace('_', ' ')}</div>
                          </td>
                        )}
                        <td className="p-4 capitalize font-semibold text-slate-600 dark:text-slate-300">
                          {task.category.replace(/_/g, ' ')}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'}
                            className="text-[10px] uppercase font-bold"
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {task.proofDocumentName ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-semibold">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">{task.proofDocumentName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No proof uploaded</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${task.progressPercent}%` }} />
                            </div>
                            <span className="font-mono text-xs font-bold">{task.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={task.status === 'completed' ? 'success' : task.status === 'under_review' ? 'warning' : 'outline'}
                            className="text-[11px] font-bold capitalize px-2 py-0.5"
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSelf && task.status === 'pending' && (
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                                onClick={() => handleQuickStart(task)}
                              >
                                <Play className="h-3 w-3" />
                                <span>Start Work</span>
                              </Button>
                            )}

                            {isSelf && task.status === 'in_progress' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setUpdateForm({
                                      actualHours: '',
                                      deliverableNotes: task.deliverableNotes || '',
                                      proofDocumentName: task.proofDocumentName || '',
                                      proofDocumentUrl: task.proofDocumentUrl || '',
                                      logMessage: '',
                                      status: 'in_progress',
                                    });
                                    setUpdateModalOpen(true);
                                  }}
                                >
                                  <FileText className="h-3 w-3 text-slate-500" />
                                  <span>Log Progress</span>
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setUpdateForm({
                                      actualHours: '',
                                      deliverableNotes: task.deliverableNotes || '',
                                      proofDocumentName: task.proofDocumentName || '',
                                      proofDocumentUrl: task.proofDocumentUrl || '',
                                      logMessage: '',
                                      status: 'under_review',
                                    });
                                    setUpdateModalOpen(true);
                                  }}
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Submit for Review</span>
                                </Button>
                              </>
                            )}

                            {isSelf && task.status === 'under_review' && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                                <Clock className="h-3 w-3" />
                                <span>Awaiting Review</span>
                              </div>
                            )}

                            {isSelf && task.status === 'completed' && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Completed ({task.rating || 5}/5)</span>
                              </div>
                            )}

                            {isHigherProfile && (
                              <Button
                                size="sm"
                                className={`h-8 px-3 text-xs font-bold text-white flex items-center gap-1.5 ${
                                  task.status === 'under_review'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                                    : 'bg-slate-700 hover:bg-slate-800'
                                }`}
                                onClick={() => {
                                  setSelectedTask(task);
                                  if (task.status === 'under_review') {
                                    setReviewForm({
                                      rating: 5,
                                      reviewComments: '',
                                      status: 'completed',
                                    });
                                    setReviewModalOpen(true);
                                  } else {
                                    setViewDetailModalOpen(true);
                                  }
                                }}
                              >
                                {task.status === 'under_review' ? (
                                  <>
                                    <Star className="h-3 w-3 fill-white" />
                                    <span>Verify & Review</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>View Scope</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal 1: Create Task (Assigned strictly to operational employees) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Assign Task to Operational Employee</span>
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Pressure Rig Safety Calibration & ISO Sign-Off"
                  value={createForm.title}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, title: e.target.value });
                    setCreateError('');
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">
                  Assignee (Operational Staff Only) *
                </label>
                <select
                  required
                  value={createForm.assigneeId}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, assigneeId: e.target.value });
                    setCreateError('');
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none font-semibold"
                >
                  <option value="">Select Operational Staff Member...</option>
                  {employeeOnlyList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode}) — {emp.designationTitle || 'Staff'} ({emp.departmentName || 'Dept'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as TaskCategory })}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="operational">Plant Operations</option>
                    <option value="quality_audit">Quality & ISO Inspection</option>
                    <option value="project">Engineering & Project Work</option>
                    <option value="ad_hoc">Equipment Maintenance & Safety</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Priority *</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as TaskPriority })}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={createForm.dueDate}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, dueDate: e.target.value });
                      setCreateError('');
                    }}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Estimated Hours</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 16"
                    value={createForm.estimatedHours}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedHours: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Deliverable Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Detail the scope of work, technical guidelines, and acceptance criteria..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" className="h-10 px-4 text-xs font-bold" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                  Dispatch Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Employee Self Progress Update & Proof Document Attachment */}
      {updateModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-sm flex items-center gap-2">
                  {updateForm.status === 'under_review' ? (
                    <Send className="h-4 w-4 text-amber-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-indigo-600" />
                  )}
                  <span>{updateForm.status === 'under_review' ? 'Submit Deliverable for Review' : 'Deliverable Progress & Proof'}</span>
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">{selectedTask.title}</div>
              </div>
              <button onClick={() => setUpdateModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="p-6 space-y-4 text-xs">
              {updateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}

              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-bold">Automatic Progress Calculation</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Calculated automatically on status transition</div>
                </div>
                <Badge className="bg-indigo-600 text-white font-mono text-xs font-bold px-3 py-1">
                  {updateForm.status === 'completed'
                    ? '100%'
                    : updateForm.status === 'under_review'
                    ? '90%'
                    : updateForm.status === 'in_progress'
                    ? '50%'
                    : '0%'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Phase Transition</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as TaskStatus })}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none font-semibold"
                  >
                    <option value="in_progress">In Progress (Active Work)</option>
                    <option value="under_review">Submit for Executive Review</option>
                    <option value="blocked">Flag Blocked / On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Log Effort (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 4"
                    value={updateForm.actualHours}
                    onChange={(e) => setUpdateForm({ ...updateForm, actualHours: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Deliverable Work Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe the work completed, inspection logs verified, or test observations..."
                  value={updateForm.deliverableNotes}
                  onChange={(e) => setUpdateForm({ ...updateForm, deliverableNotes: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Document Proof Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Paperclip className="h-4 w-4 text-indigo-600" />
                  <span>Attach Proof & Verification Documents</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1 text-slate-600 dark:text-slate-400">
                    Document / Report Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rig_Calibration_Inspection_Aug2026.pdf"
                    value={updateForm.proofDocumentName}
                    onChange={(e) => setUpdateForm({ ...updateForm, proofDocumentName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1 text-slate-600 dark:text-slate-400">
                    Document URL / Storage Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://storage.viruzverse.com/evidence/doc-2026.pdf"
                    value={updateForm.proofDocumentUrl}
                    onChange={(e) => setUpdateForm({ ...updateForm, proofDocumentUrl: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border text-xs bg-white dark:bg-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" className="h-10 px-4 text-xs font-bold" onClick={() => setUpdateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`h-10 px-5 text-xs font-bold text-white shadow-md flex items-center gap-1.5 ${
                    updateForm.status === 'under_review' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {updateForm.status === 'under_review' ? (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit for Executive Review</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      <span>Save Progress & Evidence</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Manager / Higher Profile Verification & Review */}
      {reviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span>Verify Deliverable & Transition Phase</span>
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReviewTask} className="p-6 space-y-4 text-xs">
              {reviewError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedTask.title}</div>
                <div className="text-slate-500">
                  Assignee: <strong>{selectedTask.assigneeName}</strong> • Logged Effort: {selectedTask.actualHours}h / {selectedTask.estimatedHours}h
                </div>

                {selectedTask.deliverableNotes && (
                  <div className="text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <strong className="text-indigo-600">Employee Notes:</strong> {selectedTask.deliverableNotes}
                  </div>
                )}

                {selectedTask.proofDocumentName && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                      <FileText className="h-4 w-4" />
                      <span>{selectedTask.proofDocumentName}</span>
                    </div>
                    {selectedTask.proofDocumentUrl ? (
                      <a
                        href={selectedTask.proofDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        <span>Inspect URL</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Verified Proof</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Quality Rating (1 to 5 Scale)</label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1.5 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= reviewForm.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-extrabold ml-3 text-amber-600 text-sm">{reviewForm.rating} / 5 Score</span>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Executive Decision</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none font-bold"
                >
                  <option value="completed">Approve & Sign-Off (Completed)</option>
                  <option value="in_progress">Request Revisions (In Progress)</option>
                  <option value="blocked">Flag Blocked / On Hold</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-200">Review Feedback Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter executive feedback, quality assessment, or revision requests..."
                  value={reviewForm.reviewComments}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewComments: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs bg-white dark:bg-slate-900 outline-none resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" className="h-10 px-4 text-xs font-bold" onClick={() => setReviewModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                  Confirm Sign-Off & Transition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Read-Only Detail View */}
      {viewDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-600" />
                <span>Deliverable Scope & Audit Evidence</span>
              </h3>
              <button onClick={() => setViewDetailModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-base text-slate-900 dark:text-white">{selectedTask.title}</div>
                <div className="text-slate-500">{selectedTask.description || 'No instructions provided.'}</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                  {!isEmployee && <div>Assignee: <strong>{selectedTask.assigneeName}</strong></div>}
                  <div>Assigned By: <strong>{selectedTask.assignedByName}</strong></div>
                  <div>Due Date: <strong>{selectedTask.dueDate}</strong></div>
                  <div>Hours: <strong>{selectedTask.actualHours}h / {selectedTask.estimatedHours}h</strong></div>
                </div>
              </div>

              {selectedTask.deliverableNotes && (
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  <div className="font-bold text-indigo-700 dark:text-indigo-300">Deliverable Work Notes:</div>
                  <div className="text-slate-700 dark:text-slate-300">{selectedTask.deliverableNotes}</div>
                </div>
              )}

              {selectedTask.proofDocumentName && (
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <Paperclip className="h-4 w-4" />
                    <span>Proof Attachment: {selectedTask.proofDocumentName}</span>
                  </div>
                  {selectedTask.proofDocumentUrl && (
                    <a
                      href={selectedTask.proofDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {selectedTask.reviewComments && (
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">
                    Executive Review Feedback ({selectedTask.rating || 5} / 5 Score):
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">{selectedTask.reviewComments}</div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button className="h-10 px-5 text-xs font-bold" onClick={() => setViewDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  dotColor,
  tasks,
  isAssigneeSelf,
  isHigherProfile,
  isEmployee,
  onQuickStart,
  onOpenUpdate,
  onSubmitForReview,
  onOpenReview,
  onOpenViewDetails,
}: {
  title: string;
  count: number;
  dotColor: string;
  tasks: TaskAllocationItem[];
  isAssigneeSelf: (t: TaskAllocationItem) => boolean;
  isHigherProfile: boolean;
  isEmployee: boolean;
  onQuickStart: (t: TaskAllocationItem) => void;
  onOpenUpdate: (t: TaskAllocationItem) => void;
  onSubmitForReview: (t: TaskAllocationItem) => void;
  onOpenReview: (t: TaskAllocationItem) => void;
  onOpenViewDetails: (t: TaskAllocationItem) => void;
}) {
  return (
    <div className="bg-slate-100/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {title} ({count})
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-10 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl">
            No deliverables in this phase
          </div>
        ) : (
          tasks.map((task) => {
            const isSelf = isAssigneeSelf(task);

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {task.category.replace(/_/g, ' ')}
                  </span>
                  <Badge
                    variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'}
                    className="text-[10px] px-2 py-0.5 uppercase font-extrabold"
                  >
                    {task.priority}
                  </Badge>
                </div>

                <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                  {task.title}
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Progress</span>
                    <span className="font-mono text-indigo-600">{task.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500'
                          : task.status === 'under_review'
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${task.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Proof indicator pill */}
                {task.proofDocumentName && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{task.proofDocumentName}</span>
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
                  {isEmployee ? (
                    <span className="text-[11px] font-medium text-slate-400">
                      Assigned by <strong className="text-slate-700 dark:text-slate-300">{task.assignedByName}</strong>
                    </span>
                  ) : (
                    <span className="truncate max-w-[120px] font-bold text-slate-700 dark:text-slate-300">
                      {task.assigneeName}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-slate-500">{task.dueDate}</span>
                </div>

                {/* Action Buttons with High Visibility */}
                <div className="pt-1.5 space-y-1.5">
                  {/* Case 1: Employee Self Actions */}
                  {isSelf && (
                    <>
                      {task.status === 'pending' && (
                        <Button
                          size="default"
                          className="w-full h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
                          onClick={() => onQuickStart(task)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Start Working</span>
                        </Button>
                      )}

                      {task.status === 'in_progress' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="default"
                            variant="outline"
                            className="h-9 text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5"
                            onClick={() => onOpenUpdate(task)}
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>Log Progress</span>
                          </Button>
                          <Button
                            size="default"
                            className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
                            onClick={() => onSubmitForReview(task)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Submit for Review</span>
                          </Button>
                        </div>
                      )}

                      {task.status === 'under_review' && (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Awaiting Executive Sign-Off</span>
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verified ({task.rating || 5} / 5 Score)</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Case 2: Higher Profile (Manager / HR Head / MD) Actions */}
                  {isHigherProfile && (
                    <>
                      {task.status === 'under_review' ? (
                        <Button
                          size="default"
                          className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
                          onClick={() => onOpenReview(task)}
                        >
                          <Star className="h-3.5 w-3.5 fill-white" />
                          <span>Verify & Sign-Off</span>
                        </Button>
                      ) : (
                        <Button
                          size="default"
                          variant="outline"
                          className="w-full h-9 text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 dark:text-slate-200 gap-1.5"
                          onClick={() => onOpenViewDetails(task)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect Evidence</span>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Case 3: Other employee (neither self nor higher profile) */}
                  {!isSelf && !isHigherProfile && (
                    <Button
                      size="default"
                      variant="outline"
                      className="w-full h-9 text-xs font-bold"
                      onClick={() => onOpenViewDetails(task)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
