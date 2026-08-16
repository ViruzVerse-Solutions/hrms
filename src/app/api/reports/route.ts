import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'reports_dashboard');
    if (accessError) return accessError;

    let employeeCount = 105;
    let openPositions = 4;
    let pendingLeaves = 3;

    if (prisma) {
      employeeCount = await prisma.employee.count();
      openPositions = await prisma.jobRequisition.count({ where: { status: 'active' } });
      pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'pending' } });
    }

    return apiSuccess({
      metrics: {
        attritionRate: 6.2,
        costPerHire: 48500,
        trainingScore: 4.8,
        leaveUtilization: 68.4,
        totalHeadcount: employeeCount,
        openPositions,
        pendingLeaves,
      },
      payrollTrend: [
        { month: 'Mar', gross: 7200000, net: 6180000 },
        { month: 'Apr', gross: 7850000, net: 6730000 },
        { month: 'May', gross: 8100000, net: 6950000 },
        { month: 'Jun', gross: 8400000, net: 7210000 },
        { month: 'Jul', gross: 8645000, net: 7411000 },
        { month: 'Aug', gross: 8910000, net: 7625000 },
      ],
      headcountGrowth: [
        { month: 'Mar', headcount: 88, joins: 6, exits: 1 },
        { month: 'Apr', headcount: 93, joins: 7, exits: 2 },
        { month: 'May', headcount: 97, joins: 5, exits: 1 },
        { month: 'Jun', headcount: 100, joins: 4, exits: 1 },
        { month: 'Jul', headcount: 102, joins: 3, exits: 1 },
        { month: 'Aug', headcount: 105, joins: 4, exits: 1 },
      ],
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch reports analytics', 500);
  }
}
