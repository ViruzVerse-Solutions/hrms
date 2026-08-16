import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const leaves = await attendanceService.getLeaves(userCtx.role, userCtx.employeeId);

    // Standard default allocations for leave counters
    const standardAllocations = [
      { leaveType: 'casual', allocatedDays: 12, usedDays: 2, balanceDays: 10 },
      { leaveType: 'sick', allocatedDays: 12, usedDays: 1, balanceDays: 11 },
      { leaveType: 'earned', allocatedDays: 15, usedDays: 0, balanceDays: 15 },
    ];

    return apiSuccess({
      count: leaves.length,
      leaves,
      leaveAllocations: standardAllocations,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch leave requests', 500);
  }
}
