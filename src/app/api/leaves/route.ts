import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const [leaves, leaveAllocations] = await Promise.all([
      attendanceService.getLeaves(userCtx.role, userCtx.employeeId),
      attendanceService.getLeaveAllocations(userCtx.employeeId),
    ]);

    return apiSuccess({
      count: leaves.length,
      leaves,
      leaveAllocations,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch leave requests', 500);
  }
}
