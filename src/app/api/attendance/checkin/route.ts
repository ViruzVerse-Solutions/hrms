import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const body = await req.json().catch(() => ({}));
    const status = body.status || 'present';

    const empId = userCtx.employeeId || 'emp_005';
    const record = await attendanceService.checkIn(empId, status);

    return apiSuccess(
      { record },
      `Attendance marked as ${status} successfully`,
      201
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to record attendance', 500);
  }
}
