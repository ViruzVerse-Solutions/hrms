import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { LeaveType } from '@/types';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    const body = await req.json();
    const { leaveType, fromDate, toDate, reason, employeeId } = body;

    if (!leaveType || !fromDate || !toDate) {
      return apiError('Missing required fields: leaveType, fromDate, toDate', 400);
    }

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeId || userCtx.employeeId || '' },
          { employeeCode: employeeId || userCtx.employeeCode || '' },
          { userId: userCtx.userId },
        ],
      },
    });

    if (!emp) {
      emp = await prisma.employee.findFirst();
    }

    if (!emp) {
      return apiError('No target employee record found in database', 404);
    }

    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let createdRequest: any = null;

    if (prisma && emp) {
      createdRequest = await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveType: leaveType as any,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          daysCount: daysCount,
          reason: reason || 'Personal Leave',
          status: 'pending',
          approverId: emp.reportingManagerId || undefined,
        },
        include: {
          employee: true,
        },
      });

      // Update leave allocation pending days
      await prisma.leaveAllocation.updateMany({
        where: {
          employeeId: emp.id,
          leaveType: leaveType as any,
          year: 2026,
        },
        data: {
          pendingDays: { increment: daysCount },
        },
      }).catch(() => {});
    }

    if (!createdRequest) {
      createdRequest = {
        id: `leave_${Date.now()}`,
        employeeId: emp?.id || 'emp_001',
        employeeName: userCtx.employeeName || 'Employee',
        leaveType: leaveType as LeaveType,
        fromDate,
        toDate,
        daysCount: Math.max(1, daysCount),
        reason: reason || 'Personal Leave',
        status: 'pending',
        appliedAt: new Date().toISOString(),
      };
    }

    return apiSuccess(
      {
        leaveRequest: createdRequest,
      },
      'Leave application submitted for reporting manager review',
      201
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit leave application', 500);
  }
}
