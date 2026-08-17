import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { taskService } from '@/services/task.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'tasks_work');
    if (accessError) return accessError;

    const { id: taskId } = await params;
    const body = await req.json();

    // Check if this is a manager review or employee progress update
    if (body.action === 'review') {
      if (userCtx.role === 'employee') {
        return apiError('Forbidden: Employees cannot review their own tasks', 403);
      }

      const updated = await taskService.reviewTask(taskId, {
        status: body.status || 'completed',
        rating: body.rating,
        reviewComments: body.reviewComments,
        reviewerId: userCtx.employeeId || userCtx.userId,
        reviewerName: userCtx.employeeName || userCtx.email,
        reviewerRole: userCtx.role,
      });

      if (!updated) return apiError('Task not found', 404);
      return apiSuccess({ task: updated });
    }

    // Default: Employee/Manager progress update
    const updated = await taskService.updateTaskProgress(taskId, {
      status: body.status,
      actualHours: body.actualHours !== undefined ? Number(body.actualHours) : undefined,
      deliverableNotes: body.deliverableNotes,
      proofDocumentName: body.proofDocumentName,
      proofDocumentUrl: body.proofDocumentUrl,
      logMessage: body.logMessage,
      authorId: userCtx.employeeId || userCtx.userId,
      authorName: userCtx.employeeName || userCtx.email,
      authorRole: userCtx.role,
    });

    if (!updated) return apiError('Task not found', 404);
    return apiSuccess({ task: updated });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update task', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'tasks_work');
    if (accessError) return accessError;

    if (userCtx.role === 'employee' || userCtx.role === 'internal_audit_head') {
      return apiError('Forbidden: Only managers and HR leadership can delete tasks', 403);
    }

    const { id: taskId } = await params;
    const deleted = await taskService.deleteTask(taskId);
    if (!deleted) return apiError('Task not found', 404);

    return apiSuccess({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to delete task', 500);
  }
}
