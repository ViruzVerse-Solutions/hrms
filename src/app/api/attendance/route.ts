import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';
import { auditService } from '@/services/audit.service';
import { canPerformAction } from '@/lib/rbac/permissions';

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

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    // Only HR Head, MD, or roles with update access can upload biometric Excel sync files
    const canSync = canPerformAction(userCtx.role, 'attendance_leave', 'update') ||
      userCtx.role === 'hr_head' ||
      userCtx.role === 'managing_director';

    if (!canSync) {
      return apiForbidden('Only HR Administration can sync biometric attendance data from Excel.');
    }

    const body = await req.json();
    const records = Array.isArray(body?.records) ? body.records : [];

    if (records.length === 0) {
      return apiError('No attendance records found in upload payload.', 400);
    }

    const syncResult = await attendanceService.syncExcelAttendance(records);

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'BIOMETRIC_EXCEL_SYNCED',
      module: 'attendance_leave',
      resourceId: `SYNC_${Date.now()}`,
      payloadAfter: {
        syncedCount: syncResult.syncedCount,
        errorsCount: syncResult.errorsCount,
      },
    });

    const updatedRecords = await attendanceService.getRecords(userCtx.role);

    return apiSuccess({
      ...syncResult,
      attendanceRecords: updatedRecords,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to sync biometric Excel data', 500);
  }
}

