import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || userCtx.employeeId;
    const date = searchParams.get('date') || undefined;

    const records = await attendanceService.getRecords(userCtx.role, employeeId, date);

    return apiSuccess({
      count: records.length,
      attendanceRecords: records,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch attendance records', 500);
  }
}
