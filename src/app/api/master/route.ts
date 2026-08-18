import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db/prisma';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const data = await serverCache.fetchWithCache(
      'master_data_all',
      async () => {
        let departments: any[] = [];
        let designations: any[] = [];
        let branches: any[] = [];

        if (prisma) {
          [departments, designations, branches] = await Promise.all([
            prisma.department.findMany({
              select: {
                id: true,
                name: true,
                code: true,
                _count: { select: { employees: true } },
              },
              orderBy: { name: 'asc' },
            }).catch(() => []),
            prisma.designation.findMany({
              select: { id: true, title: true, code: true, departmentId: true },
              orderBy: { title: 'asc' },
            }).catch(() => []),
            prisma.branch.findMany({
              select: { id: true, name: true, code: true, city: true, isHeadquarters: true },
              orderBy: { name: 'asc' },
            }).catch(() => []),
          ]);
        }

        const formattedDepartments = departments.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          employeeCount: d._count?.employees || 0,
        }));

        return {
          departments: formattedDepartments,
          designations,
          branches,
        };
      },
      30 * 60 * 1000, // 30 minutes TTL
      ['master']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch master data', 500);
  }
}
