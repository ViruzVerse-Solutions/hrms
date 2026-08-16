import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const body = await req.json();
    const { leaveType, fromDate, toDate, reason, employeeId } = body;

    if (!leaveType || !fromDate || !toDate) {
      return apiError('Missing required fields: leaveType, fromDate, toDate are mandatory', 400);
    }

    const empId = employeeId || userCtx.employeeId || 'emp_005';
    const leave = await attendanceService.applyLeave(empId, {
      leaveType,
      fromDate,
      toDate,
      reason: reason || 'Personal Leave',
    });

    return apiSuccess(
      { leaveRequest: leave },
      'Leave application submitted successfully',
      201
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit leave application', 500);
  }
}
