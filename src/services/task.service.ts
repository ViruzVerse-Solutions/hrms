import { prisma } from '@/lib/db/prisma';
import { UserRole, TaskAllocationItem, TaskLogItem, TaskStatus, TaskPriority, TaskCategory } from '@/types';
import { serverCache } from '@/lib/server-cache';

let cachedOrgId: string | null = null;
async function getOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

// Helper to compute progress percent automatically based on state & hours
export function computeAutoProgress(status: TaskStatus, actualHours?: number, estimatedHours?: number): number {
  switch (status) {
    case 'completed':
      return 100;
    case 'under_review':
      return 90;
    case 'in_progress': {
      if (actualHours && estimatedHours && estimatedHours > 0) {
        const calculated = Math.round((actualHours / estimatedHours) * 80);
        return Math.min(85, Math.max(30, calculated));
      }
      return 50;
    }
    case 'blocked':
      return 35;
    case 'pending':
    default:
      return 0;
  }
}

export const taskService = {
  async getTasks(params: {
    role: UserRole;
    employeeId?: string;
    email?: string;
    employeeName?: string;
    department?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<TaskAllocationItem[]> {
    if (!prisma) return [];

    const where: any = {};

    // 1. Strict Role-scoping
    if (params.role === 'employee') {
      const orConditions: any[] = [];
      if (params.employeeId) {
        orConditions.push({ assigneeId: params.employeeId });
        orConditions.push({ assignee: { employeeCode: params.employeeId } });
      }
      if (params.email) {
        orConditions.push({ assignee: { email: params.email } });
      }
      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    // 2. Department filter
    if (params.department && params.department !== 'all') {
      where.assignee = {
        ...(where.assignee || {}),
        department: { name: { contains: params.department, mode: 'insensitive' } },
      };
    }

    // 3. Status filter
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    // 4. Priority filter
    if (params.priority && params.priority !== 'all') {
      where.priority = params.priority;
    }

    // 5. Search filter
    if (params.search) {
      const q = params.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { assignee: { firstName: { contains: q, mode: 'insensitive' } } },
            { assignee: { lastName: { contains: q, mode: 'insensitive' } } },
            { assignee: { employeeCode: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    try {
      const dbTasks = await (prisma as any).taskAllocation.findMany({
        where,
        select: {
          id: true,
          organizationId: true,
          title: true,
          description: true,
          category: true,
          priority: true,
          status: true,
          assigneeId: true,
          assignedById: true,
          assignedByName: true,
          assignedByRole: true,
          dueDate: true,
          estimatedHours: true,
          actualHours: true,
          progressPercent: true,
          deliverableNotes: true,
          proofDocumentName: true,
          proofDocumentUrl: true,
          reviewComments: true,
          rating: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          assignee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              email: true,
              department: { select: { name: true } },
              designation: { select: { title: true } },
            },
          },
          logs: {
            select: {
              id: true,
              taskId: true,
              authorId: true,
              authorName: true,
              authorRole: true,
              message: true,
              progressAt: true,
              loggedHours: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      });

      return dbTasks.map((t: any) => ({
        id: t.id,
        organizationId: t.organizationId,
        title: t.title,
        description: t.description || undefined,
        category: t.category as TaskCategory,
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Assigned Staff',
        assigneeDepartment: t.assignee?.department?.name || 'Operations',
        assigneeDesignation: t.assignee?.designation?.title || 'Staff',
        assignedById: t.assignedById,
        assignedByName: t.assignedByName,
        assignedByRole: t.assignedByRole as UserRole,
        dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString().split('T')[0] : String(t.dueDate).split('T')[0],
        estimatedHours: Number(t.estimatedHours || 0),
        actualHours: Number(t.actualHours || 0),
        progressPercent: Number(t.progressPercent || computeAutoProgress(t.status as TaskStatus, Number(t.actualHours), Number(t.estimatedHours))),
        deliverableNotes: t.deliverableNotes || undefined,
        proofDocumentName: t.proofDocumentName || undefined,
        proofDocumentUrl: t.proofDocumentUrl || undefined,
        reviewComments: t.reviewComments || undefined,
        rating: t.rating !== null ? Number(t.rating) : undefined,
        reviewedAt: t.reviewedAt ? t.reviewedAt.toISOString() : undefined,
        logs: (t.logs || []).map((l: any) => ({
          id: l.id,
          taskId: l.taskId,
          authorId: l.authorId,
          authorName: l.authorName,
          authorRole: l.authorRole as UserRole,
          message: l.message,
          progressAt: l.progressAt,
          loggedHours: Number(l.loggedHours || 0),
          createdAt: l.createdAt.toISOString(),
        })),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error('Error fetching tasks from DB:', err);
      return [];
    }
  },

  async createTask(data: {
    title: string;
    description?: string;
    category: TaskCategory;
    priority: TaskPriority;
    assigneeId: string;
    assigneeName?: string;
    assigneeDepartment?: string;
    assigneeDesignation?: string;
    assignedById: string;
    assignedByName: string;
    assignedByRole: UserRole;
    dueDate: string;
    estimatedHours: number;
  }): Promise<TaskAllocationItem> {
    if (!prisma) throw new Error('Database unavailable');

    const orgId = await getOrgId();
    if (!orgId) throw new Error('Organization not found');

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: data.assigneeId }, { employeeCode: data.assigneeId }],
      },
      include: { department: true, designation: true },
    });

    if (!employee) throw new Error(`Employee with ID "${data.assigneeId}" not found in database.`);

    const deptName = (employee.department?.name || '').toLowerCase();
    const desTitle = (employee.designation?.title || '').toLowerCase();
    const isNonOperational =
      deptName.includes('human resources') ||
      deptName.includes('hr') ||
      deptName.includes('compliance') ||
      deptName.includes('legal') ||
      deptName.includes('audit') ||
      deptName.includes('executive') ||
      deptName.includes('board') ||
      desTitle.includes('chairman') ||
      desTitle.includes('managing director') ||
      desTitle.includes('director') ||
      desTitle.includes('head') ||
      desTitle.includes('compliance') ||
      desTitle.includes('officer') ||
      ['VV-001', 'VV-002', 'VV-003', 'VV-004', 'VV-005'].includes(employee.employeeCode);

    if (isNonOperational) {
      throw new Error('Forbidden: Tasks can only be assigned to operational employees, not HR, Compliance, or executive roles.');
    }

    const autoProgress = computeAutoProgress('pending');

    const created = await (prisma as any).taskAllocation.create({
      data: {
        organizationId: orgId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'pending',
        assigneeId: employee.id,
        assignedById: data.assignedById,
        assignedByName: data.assignedByName,
        assignedByRole: data.assignedByRole,
        dueDate: new Date(data.dueDate),
        estimatedHours: data.estimatedHours || 8,
        actualHours: 0,
        progressPercent: autoProgress,
        logs: {
          create: [
            {
              authorId: data.assignedById,
              authorName: data.assignedByName,
              authorRole: data.assignedByRole,
              message: `Task created and dispatched by ${data.assignedByName} (${data.assignedByRole}).`,
              progressAt: autoProgress,
              loggedHours: 0,
            },
          ],
        },
      },
      include: {
        assignee: {
          include: { department: true, designation: true },
        },
        logs: true,
      },
    });

    serverCache.invalidateTags(['tasks', 'dashboard']);

    return {
      id: created.id,
      organizationId: created.organizationId,
      title: created.title,
      description: created.description || undefined,
      category: created.category as TaskCategory,
      priority: created.priority as TaskPriority,
      status: created.status as TaskStatus,
      assigneeId: created.assigneeId,
      assigneeName: `${created.assignee.firstName} ${created.assignee.lastName}`,
      assigneeDepartment: created.assignee.department?.name || 'Operations',
      assigneeDesignation: created.assignee.designation?.title || 'Staff',
      assignedById: created.assignedById,
      assignedByName: created.assignedByName,
      assignedByRole: created.assignedByRole as UserRole,
      dueDate: created.dueDate.toISOString().split('T')[0],
      estimatedHours: Number(created.estimatedHours),
      actualHours: Number(created.actualHours),
      progressPercent: created.progressPercent,
      logs: created.logs.map((l: any) => ({
        id: l.id,
        taskId: l.taskId,
        authorId: l.authorId,
        authorName: l.authorName,
        authorRole: l.authorRole as UserRole,
        message: l.message,
        progressAt: l.progressAt,
        loggedHours: Number(l.loggedHours),
        createdAt: l.createdAt.toISOString(),
      })),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateTaskProgress(
    taskId: string,
    data: {
      status?: TaskStatus;
      actualHours?: number;
      deliverableNotes?: string;
      proofDocumentName?: string;
      proofDocumentUrl?: string;
      logMessage?: string;
      authorId: string;
      authorName: string;
      authorRole: UserRole;
    }
  ): Promise<TaskAllocationItem | null> {
    if (!prisma) return null;

    const existing = await (prisma as any).taskAllocation.findUnique({
      where: { id: taskId },
      include: { assignee: true },
    });

    if (data.authorRole === 'employee') {
      const author = String(data.authorId || '').toLowerCase().trim();
      const isOwner =
        !data.authorId ||
        existing.assigneeId === data.authorId ||
        existing.assignee?.id === data.authorId ||
        existing.assignee?.employeeCode?.toLowerCase() === author ||
        (existing.assignee?.workEmail && existing.assignee.workEmail.toLowerCase() === author) ||
        (existing.assignee && `${existing.assignee.firstName} ${existing.assignee.lastName}`.toLowerCase() === author);
      if (!isOwner) {
        throw new Error('Forbidden: You can only update tasks assigned to your profile.');
      }
    }

    const nextStatus = data.status || existing.status;
    const addedHours = Number(data.actualHours || 0);
    const newActualHours = Number(existing.actualHours || 0) + addedHours;
    const autoProgress = computeAutoProgress(nextStatus as TaskStatus, newActualHours, Number(existing.estimatedHours));

    const updated = await (prisma as any).taskAllocation.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        actualHours: newActualHours,
        progressPercent: autoProgress,
        ...(data.deliverableNotes ? { deliverableNotes: data.deliverableNotes } : {}),
        ...(data.proofDocumentName ? { proofDocumentName: data.proofDocumentName } : {}),
        ...(data.proofDocumentUrl ? { proofDocumentUrl: data.proofDocumentUrl } : {}),
        logs: {
          create: [
            {
              authorId: data.authorId,
              authorName: data.authorName,
              authorRole: data.authorRole,
              message:
                data.logMessage ||
                `Status moved to ${nextStatus.replace('_', ' ')}. Progress automatically recalculated to ${autoProgress}%.${
                  data.proofDocumentName ? ` Attached proof: ${data.proofDocumentName}` : ''
                }`,
              progressAt: autoProgress,
              loggedHours: addedHours,
            },
          ],
        },
      },
      include: {
        assignee: {
          include: { department: true, designation: true },
        },
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });

    serverCache.invalidateTags(['tasks', 'dashboard']);

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      title: updated.title,
      description: updated.description || undefined,
      category: updated.category as TaskCategory,
      priority: updated.priority as TaskPriority,
      status: updated.status as TaskStatus,
      assigneeId: updated.assigneeId,
      assigneeName: `${updated.assignee.firstName} ${updated.assignee.lastName}`,
      assigneeDepartment: updated.assignee.department?.name || 'Operations',
      assigneeDesignation: updated.assignee.designation?.title || 'Staff',
      assignedById: updated.assignedById,
      assignedByName: updated.assignedByName,
      assignedByRole: updated.assignedByRole as UserRole,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      estimatedHours: Number(updated.estimatedHours),
      actualHours: Number(updated.actualHours),
      progressPercent: updated.progressPercent,
      deliverableNotes: updated.deliverableNotes || undefined,
      proofDocumentName: updated.proofDocumentName || undefined,
      proofDocumentUrl: updated.proofDocumentUrl || undefined,
      reviewComments: updated.reviewComments || undefined,
      rating: updated.rating !== null ? Number(updated.rating) : undefined,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : undefined,
      logs: updated.logs.map((l: any) => ({
        id: l.id,
        taskId: l.taskId,
        authorId: l.authorId,
        authorName: l.authorName,
        authorRole: l.authorRole as UserRole,
        message: l.message,
        progressAt: l.progressAt,
        loggedHours: Number(l.loggedHours),
        createdAt: l.createdAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async reviewTask(
    taskId: string,
    data: {
      status: 'completed' | 'in_progress' | 'blocked';
      rating?: number;
      reviewComments?: string;
      reviewerId: string;
      reviewerName: string;
      reviewerRole: UserRole;
    }
  ): Promise<TaskAllocationItem | null> {
    if (!prisma) return null;

    const existing = await (prisma as any).taskAllocation.findUnique({
      where: { id: taskId },
    });

    if (!existing) return null;

    const autoProgress = computeAutoProgress(data.status as TaskStatus, Number(existing.actualHours), Number(existing.estimatedHours));

    const updated = await (prisma as any).taskAllocation.update({
      where: { id: taskId },
      data: {
        status: data.status,
        progressPercent: autoProgress,
        rating: data.rating,
        reviewComments: data.reviewComments,
        reviewedAt: new Date(),
        logs: {
          create: [
            {
              authorId: data.reviewerId,
              authorName: data.reviewerName,
              authorRole: data.reviewerRole,
              message: `Review completed by ${data.reviewerName} (${data.reviewerRole}): Marked "${data.status}" with rating ${data.rating || 5}/5 stars. Notes: ${data.reviewComments || 'Approved'}`,
              progressAt: autoProgress,
              loggedHours: 0,
            },
          ],
        },
      },
      include: {
        assignee: {
          include: { department: true, designation: true },
        },
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });

    serverCache.invalidateTags(['tasks', 'dashboard']);

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      title: updated.title,
      description: updated.description || undefined,
      category: updated.category as TaskCategory,
      priority: updated.priority as TaskPriority,
      status: updated.status as TaskStatus,
      assigneeId: updated.assigneeId,
      assigneeName: `${updated.assignee.firstName} ${updated.assignee.lastName}`,
      assigneeDepartment: updated.assignee.department?.name || 'Operations',
      assigneeDesignation: updated.assignee.designation?.title || 'Staff',
      assignedById: updated.assignedById,
      assignedByName: updated.assignedByName,
      assignedByRole: updated.assignedByRole as UserRole,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      estimatedHours: Number(updated.estimatedHours),
      actualHours: Number(updated.actualHours),
      progressPercent: updated.progressPercent,
      deliverableNotes: updated.deliverableNotes || undefined,
      reviewComments: updated.reviewComments || undefined,
      rating: updated.rating !== null ? Number(updated.rating) : undefined,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : undefined,
      logs: updated.logs.map((l: any) => ({
        id: l.id,
        taskId: l.taskId,
        authorId: l.authorId,
        authorName: l.authorName,
        authorRole: l.authorRole as UserRole,
        message: l.message,
        progressAt: l.progressAt,
        loggedHours: Number(l.loggedHours),
        createdAt: l.createdAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteTask(taskId: string): Promise<boolean> {
    if (!prisma) return false;
    try {
      await (prisma as any).taskAllocation.delete({
        where: { id: taskId },
      });
      serverCache.invalidateTags(['tasks', 'dashboard']);
      return true;
    } catch {
      return false;
    }
  },
};
