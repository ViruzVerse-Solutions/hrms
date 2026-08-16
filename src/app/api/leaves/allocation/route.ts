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
      const org = await prisma.organization.findFirst();
      if (!org) return apiError('Organization not found', 404);

      const allEmployees = employeeId
        ? await prisma.employee.findMany({ where: { id: employeeId } })
        : await prisma.employee.findMany({ where: { employmentStatus: { not: 'terminated' } } });

      for (const emp of allEmployees) {
        const existing = await prisma.leaveAllocation.findFirst({
          where: { employeeId: emp.id, leaveType: leaveType as any, year },
        });

        const used = existing ? Number(existing.usedDays) : 0;
        const pending = existing ? Number(existing.pendingDays) : 0;
        const newBalance = Math.max(0, numAllocated - used);

        const updated = await prisma.leaveAllocation.upsert({
          where: {
            employeeId_leaveType_year: {
              employeeId: emp.id,
              leaveType: leaveType as any,
              year,
            },
          },
          create: {
            organizationId: org.id,
            employeeId: emp.id,
            leaveType: leaveType as any,
            year,
            allocatedDays: numAllocated,
            usedDays: used,
            pendingDays: pending,
            balanceDays: newBalance,
          },
          update: {
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
