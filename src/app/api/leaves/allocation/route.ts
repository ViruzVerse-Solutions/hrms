import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);

    // Only HR Head and Managing Director can set/modify company leave allocation policy
    if (!['hr_head', 'managing_director'].includes(userCtx.role)) {
      return apiForbidden('Only HR Head and Managing Director can configure company leave quotas');
    }

    const body = await req.json();
    const { leaveType, allocatedDays, quotas, employeeId } = body;

    // Convert to normalized quota entries array
    const quotaList: Array<{ leaveType: string; allocatedDays: number }> = [];
    if (quotas && typeof quotas === 'object') {
      if (Array.isArray(quotas)) {
        quotaList.push(...quotas.map((q: any) => ({ leaveType: q.leaveType, allocatedDays: Number(q.allocatedDays) })));
      } else {
        Object.entries(quotas).forEach(([lt, days]) => {
          quotaList.push({ leaveType: lt, allocatedDays: Number(days) });
        });
      }
    } else if (leaveType && allocatedDays !== undefined) {
      quotaList.push({ leaveType, allocatedDays: Number(allocatedDays) });
    }

    if (quotaList.length === 0) {
      return apiError('Missing required fields: provide quotas or leaveType with allocatedDays', 400);
    }

    let updatedAllocations: any[] = [];

    if (prisma) {
      const year = 2026;
      const org = await prisma.organization.findFirst();
      if (!org) return apiError('Organization not found', 404);

      const allEmployees = employeeId
        ? await prisma.employee.findMany({ where: { id: employeeId } })
        : await prisma.employee.findMany({ where: { employmentStatus: { not: 'terminated' } } });

      for (const item of quotaList) {
        const numAllocated = Math.max(0, Number(item.allocatedDays) || 0);

        for (const emp of allEmployees) {
          // Enforce Gender-based leave allocation rules
          if (item.leaveType === 'maternity' && emp.gender !== 'female') {
            continue; // Maternity leave is restricted to female employees
          }
          if (item.leaveType === 'paternity' && emp.gender !== 'male') {
            continue; // Paternity leave is restricted to male employees
          }

          const existing = await prisma.leaveAllocation.findFirst({
            where: { employeeId: emp.id, leaveType: item.leaveType as any, year },
          });

          const used = existing ? Number(existing.usedDays) : 0;
          const pending = existing ? Number(existing.pendingDays) : 0;
          const newBalance = Math.max(0, numAllocated - used);

          const updated = await prisma.leaveAllocation.upsert({
            where: {
              employeeId_leaveType_year: {
                employeeId: emp.id,
                leaveType: item.leaveType as any,
                year,
              },
            },
            create: {
              organizationId: org.id,
              employeeId: emp.id,
              leaveType: item.leaveType as any,
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
    }

    return apiSuccess(
      {
        quotas: quotaList,
        updatedCount: updatedAllocations.length,
      },
      `Company leave policy updated for ${quotaList.length} leave categories across active employees`,
      200
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update leave policy allocation', 500);
  }
}
