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
      department: r.employee?.department?.name || 'Quality Assurance & Analytical Lab',
      designation: r.employee?.designation?.title || 'Senior Analytical Chemist',
      cycleName: r.cycleName,
      selfRating: Number(r.selfRating),
      managerRating: Number(r.managerRating),
      finalRating: Number(r.finalRating),
      kraScore: Number(r.kraScore),
      nineBoxGrid: r.nineBoxGrid,
      status: r.status,
      completedAt: r.completedAt ? r.completedAt.toISOString().split('T')[0] : null,
      kras: [
        { title: 'Core Process & Quality Compliance', weightage: 40, target: 'Zero procedural deviations and adherence to cGMP/ISO guidelines', selfScore: Number(r.selfRating) || 4.5, managerScore: Number(r.managerRating) || 4.6 },
        { title: 'Operational Efficiency & Turnaround', weightage: 35, target: 'Achieve >95% SLA adherence across batch processes and analysis', selfScore: 4.6, managerScore: 4.8 },
        { title: 'Team Collaboration & Plant Safety', weightage: 25, target: 'Active participation in EHS audits and junior team mentoring', selfScore: 4.8, managerScore: 4.7 },
      ],
    }));

    return apiSuccess({
      count: formattedReviews.length,
      performanceReviews: formattedReviews,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch performance reviews', 500);
  }
}
