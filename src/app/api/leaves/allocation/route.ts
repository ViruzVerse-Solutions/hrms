import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);

    // Only HR Head and Managing Director can set/modify company leave allocation policy
    if (!['hr_head', 'managing_director'].includes(userCtx.role)) {
      return apiForbidden('Only HR Head and Managing Director can configure company leave quotas');
    }

    const body = await req.json();
    const { leaveType, allocatedDays, employeeId } = body;

    if (!leaveType || allocatedDays === undefined) {
      return apiError('Missing required fields: leaveType, allocatedDays', 400);
    }

    const numAllocated = Number(allocatedDays);
    if (isNaN(numAllocated) || numAllocated < 0) {
      return apiError('Allocated days must be a non-negative number', 400);
    }

    let updatedAllocations: any[] = [];

    if (prisma) {
      const year = 2026;
      let whereFilter: any = { leaveType, year };
      if (employeeId) {
        whereFilter.employeeId = employeeId;
      }

      const existing = await prisma.leaveAllocation.findMany({
        where: whereFilter,
      });

      for (const alloc of existing) {
        const used = Number(alloc.usedDays);
        const newBalance = Math.max(0, numAllocated - used);

        const updated = await prisma.leaveAllocation.update({
          where: { id: alloc.id },
          data: {
            allocatedDays: numAllocated,
            balanceDays: newBalance,
          },
        });
        updatedAllocations.push(updated);
      }
    }

    return apiSuccess(
      {
        leaveType,
        allocatedDays: numAllocated,
        updatedCount: updatedAllocations.length,
      },
      `Leave policy updated: ${leaveType.toUpperCase()} allocated count set to ${numAllocated} days`,
      200
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update leave policy allocation', 500);
  }
}
