import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { attendanceService } from '@/services/attendance.service';
import { auditService } from '@/services/audit.service';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const today = new Date().toISOString().split('T')[0];
    const fromStr = String(fromDate).split('T')[0];
    const toStr = String(toDate).split('T')[0];

    if (fromStr < today) {
      return apiError('Leave start date cannot be in the past. Only today or future dates are allowed.', 400);
    }

    if (toStr < fromStr) {
      return apiError('The "To Date" must be greater than or equal to the "From Date".', 400);
    }

    const empId = employeeId || userCtx.employeeId || 'emp_005';
    const leave = await attendanceService.applyLeave(empId, {
      leaveType,
      fromDate,
      toDate,
      reason: reason || (leaveType === 'compensatory_off' ? 'Outdoor Duty Request' : 'Personal Leave'),
    });

    // Invalidate caches instantly
    serverCache.invalidateTags(['leaves', 'dashboard', 'approvals', 'reports']);

    // Log audit trail
    await auditService.logAction({
      userName: userCtx.employeeName || leave.employeeName || 'Employee',
      userRole: userCtx.role,
      action: 'LEAVE_APPLIED',
      module: 'attendance_leave',
      resourceId: leave.id,
      payloadAfter: {
        leaveId: leave.id,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        daysCount: leave.daysCount,
        employeeId: leave.employeeId,
      },
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
