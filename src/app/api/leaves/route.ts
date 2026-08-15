import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    let whereClause: any = {};

    // Strict RBAC: Employee only sees own requests
    if (userCtx.role === 'employee' && userCtx.employeeId) {
      whereClause.employeeId = userCtx.employeeId;
    }

    let leaves: any[] = [];

    if (prisma) {
      leaves = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          employee: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedLeaves = leaves.map((l: any) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employeeName || `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim() || 'Employee',
      leaveType: l.leaveType,
      fromDate: typeof l.fromDate === 'string' ? l.fromDate : l.fromDate?.toISOString().split('T')[0],
      toDate: typeof l.toDate === 'string' ? l.toDate : l.toDate?.toISOString().split('T')[0],
      daysCount: Number(l.daysCount),
      reason: l.reason,
      status: l.status,
      approverId: l.approverId,
      approverName: l.approverName || 'Reporting Manager',
      approverComment: l.approverComment,
    }));

    return apiSuccess({
      count: formattedLeaves.length,
      leaves: formattedLeaves,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch leave requests', 500);
  }
}
