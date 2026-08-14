import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'performance_mgmt');
    if (accessError) return accessError;

    let whereClause: any = {};
    if (userCtx.role === 'employee' && userCtx.employeeId) {
      whereClause.employeeId = userCtx.employeeId;
    }

    let reviews: any[] = [];
    if (prisma) {
      reviews = await prisma.performanceReview.findMany({
        where: whereClause,
        include: {
          employee: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedReviews = reviews.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Employee',
      cycleName: r.cycleName,
      selfRating: Number(r.selfRating),
      managerRating: Number(r.managerRating),
      finalRating: Number(r.finalRating),
      kraScore: Number(r.kraScore),
      nineBoxGrid: r.nineBoxGrid,
      status: r.status,
      completedAt: r.completedAt ? r.completedAt.toISOString().split('T')[0] : null,
    }));

    return apiSuccess({
      count: formattedReviews.length,
      performanceReviews: formattedReviews,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch performance reviews', 500);
  }
}
