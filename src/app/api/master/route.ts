import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);

    let departments: any[] = [];
    let designations: any[] = [];
    let branches: any[] = [];

    if (prisma) {
      [departments, designations, branches] = await Promise.all([
        prisma.department.findMany({
          include: { employees: true },
          orderBy: { name: 'asc' },
        }).catch(() => []),
        prisma.designation.findMany({
          orderBy: { title: 'asc' },
        }).catch(() => []),
        prisma.branch.findMany({
          orderBy: { name: 'asc' },
        }).catch(() => []),
      ]);
    }

    const formattedDepartments = departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      employeeCount: d.employees?.length || 0,
    }));

    return apiSuccess({
      departments: formattedDepartments,
      designations,
      branches,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch master data', 500);
  }
}
