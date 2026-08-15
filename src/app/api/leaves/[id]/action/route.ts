import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden, apiNotFound } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { canPerformAction } from '@/lib/rbac';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    // Check if user has approval rights on attendance_leave
    if (!canPerformAction(userCtx.role, 'attendance_leave', 'approve')) {
      return apiForbidden(`Role '${userCtx.role}' does not have approval rights on leave requests`);
    }

    const body = await req.json();
    const { status, comment } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return apiError("Status must be either 'approved' or 'rejected'", 400);
    }

    if (!prisma) {
      return apiError('Database client is not available', 500);
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as any,
        approverComment: comment || `Processed by ${userCtx.employeeName || 'Manager'}`,
        processedAt: new Date(),
      },
    });

    if (status === 'approved') {
      const alloc = await prisma.leaveAllocation.findFirst({
        where: {
          employeeId: updatedLeave.employeeId,
          leaveType: updatedLeave.leaveType,
          year: 2026,
        },
      });

      if (alloc) {
        const newUsed = Number(alloc.usedDays) + Number(updatedLeave.daysCount);
        const newPending = Math.max(0, Number(alloc.pendingDays) - Number(updatedLeave.daysCount));
        const newBalance = Math.max(0, Number(alloc.allocatedDays) - newUsed);

        await prisma.leaveAllocation.update({
          where: { id: alloc.id },
          data: {
            usedDays: newUsed,
            pendingDays: newPending,
            balanceDays: newBalance,
          },
        });
      }
    } else if (status === 'rejected') {
      const alloc = await prisma.leaveAllocation.findFirst({
        where: {
          employeeId: updatedLeave.employeeId,
          leaveType: updatedLeave.leaveType,
          year: 2026,
        },
      });

      if (alloc) {
        const newPending = Math.max(0, Number(alloc.pendingDays) - Number(updatedLeave.daysCount));
        await prisma.leaveAllocation.update({
          where: { id: alloc.id },
          data: {
            pendingDays: newPending,
          },
        });
      }
    }

    return apiSuccess({
      leave: updatedLeave,
      message: `Leave request ${status} successfully`,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process leave action', 500);
  }
}
