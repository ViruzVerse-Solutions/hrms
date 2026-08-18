import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { canPerformAction } from '@/lib/rbac';
import { attendanceService } from '@/services/attendance.service';
import { auditService } from '@/services/audit.service';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    // Check if user is HR Head, MD, Chairman, or has approve permissions
    const canApprove =
      userCtx.role === 'hr_head' ||
      userCtx.role === 'managing_director' ||
      userCtx.role === 'chairman' ||
      canPerformAction(userCtx.role, 'attendance_leave', 'approve');

    if (!canApprove) {
      return apiForbidden(`Role '${userCtx.role}' does not have approval rights on leave requests`);
    }

    const body = await req.json();
    const { status, comment } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return apiError("Status must be either 'approved' or 'rejected'", 400);
    }

    const defaultComment = comment || (status === 'approved' ? `Approved by ${userCtx.role === 'hr_head' ? 'HR Head' : 'Manager'}` : `Rejected by ${userCtx.role === 'hr_head' ? 'HR Head' : 'Manager'}`);

    const updatedLeave = await attendanceService.updateLeaveStatus(
      id,
      status,
      userCtx.employeeId || userCtx.userId,
      defaultComment
    );

    // Audit log entry
    await auditService.logAction({
      userName: userCtx.employeeName || (userCtx.role === 'hr_head' ? 'Eleanor Vance (HR Head)' : 'Manager'),
      userRole: userCtx.role,
      action: status === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      module: 'attendance_leave',
      resourceId: id,
      payloadAfter: {
        leaveId: id,
        status,
        comment: defaultComment,
        employeeId: updatedLeave.employeeId,
      },
    });

    serverCache.invalidateTags(['leaves', 'dashboard', 'approvals', 'reports']);

    return apiSuccess({
      leave: updatedLeave,
      message: `Leave request ${status} successfully`,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process leave action', 500);
  }
}
