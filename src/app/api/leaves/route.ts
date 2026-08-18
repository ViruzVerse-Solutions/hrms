import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const cacheKey = `leaves_${userCtx.role}_${userCtx.employeeId || 'all'}`;

    const data = await serverCache.fetchWithCache(
      cacheKey,
      async () => {
        const [leaves, leaveAllocations] = await Promise.all([
          attendanceService.getLeaves(userCtx.role, userCtx.employeeId),
          attendanceService.getLeaveAllocations(userCtx.employeeId),
        ]);

        return {
          count: leaves.length,
          leaves,
          leaveAllocations,
          userRole: userCtx.role,
        };
      },
      5 * 60 * 1000,
      ['leaves']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch leave requests', 500);
  }
}
