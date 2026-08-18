import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { taskService } from '@/services/task.service';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'tasks_work');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;

    const tasks = await taskService.getTasks({
      role: userCtx.role,
      employeeId: userCtx.employeeId,
      email: userCtx.email,
      employeeName: userCtx.employeeName || userCtx.email,
      department,
      status,
      priority,
      search,
    });

    return apiSuccess({
      count: tasks.length,
      tasks,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch tasks', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'tasks_work');
    if (accessError) return accessError;

    if (userCtx.role === 'employee' || userCtx.role === 'internal_audit_head') {
      return apiError('Forbidden: Only managers and HR leadership can assign tasks', 403);
    }

    const body = await req.json();
    if (!body.title || !body.assigneeId || !body.dueDate) {
      return apiError('Missing required task fields: title, assigneeId, dueDate', 400);
    }

    const newTask = await taskService.createTask({
      title: body.title,
      description: body.description,
      category: body.category || 'operational',
      priority: body.priority || 'medium',
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName || 'Assigned Staff',
      assigneeDepartment: body.assigneeDepartment,
      assigneeDesignation: body.assigneeDesignation,
      assignedById: userCtx.employeeId || userCtx.userId,
      assignedByName: userCtx.employeeName || userCtx.email,
      assignedByRole: userCtx.role,
      dueDate: body.dueDate,
      estimatedHours: Number(body.estimatedHours || 0),
    });

    serverCache.invalidateTags(['tasks', 'dashboard']);

    return apiSuccess({ task: newTask });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to create task', 500);
  }
}
