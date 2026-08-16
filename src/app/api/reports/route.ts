import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'reports_dashboard');
    if (accessError) return accessError;

    if (!prisma) {
      return apiSuccess({
        metrics: {
          attritionRate: 0,
          costPerHire: 0,
          trainingScore: 5.0,
          leaveUtilization: 0,
          totalHeadcount: 0,
          openPositions: 0,
          pendingLeaves: 0,
        },
        payrollTrend: [],
        headcountGrowth: [],
      });
    }

    const [
      employeeCount,
      openPositions,
      pendingLeaves,
      totalExits,
      approvedLeaveCount,
      dbPayrollRuns,
      allEmployees,
      trainingPrograms,
    ] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: { in: ['active', 'probation'] } } }).catch(() => 0),
      prisma.jobRequisition.count({ where: { status: 'active' } }).catch(() => 0),
      prisma.leaveRequest.count({ where: { status: 'pending' } }).catch(() => 0),
      prisma.resignationExitCase.count({ where: { fnfStatus: 'processed' } }).catch(() => 0),
      prisma.leaveRequest.count({ where: { status: 'approved' } }).catch(() => 0),
      prisma.payrollRun.findMany({
        orderBy: { createdAt: 'asc' },
        take: 6,
      }).catch(() => []),
      prisma.employee.findMany({
        where: { employmentStatus: { in: ['active', 'probation'] } },
        select: { dateOfJoining: true, employmentStatus: true },
      }).catch(() => []),
      prisma.trainingProgram.findMany({
        select: { capacity: true, enrolledCount: true },
      }).catch(() => []),
    ]);

    const payrollTrend = dbPayrollRuns.map((run: any) => ({
      month: run.monthYear || 'Month',
      gross: Number(run.totalGross) || 0,
      net: Number(run.totalNet) || 0,
    }));

    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    let cumulativeHeadcount = 0;

    const headcountGrowth = months.map((month, idx) => {
      const joins = allEmployees.filter((e: any) => {
        if (!e.dateOfJoining) return false;
        const d = new Date(e.dateOfJoining);
        return d.getMonth() === (2 + idx) % 12;
      }).length;
      cumulativeHeadcount += joins;
      return {
        month,
        headcount: cumulativeHeadcount || employeeCount,
        joins,
        exits: 0,
      };
    });

    const calculatedAttrition = (employeeCount + totalExits) > 0
      ? Number(((totalExits / (employeeCount + totalExits)) * 100).toFixed(1))
      : 0;

    const calculatedLeaveUtilization = employeeCount > 0
      ? Number(((approvedLeaveCount / (employeeCount * 12)) * 100).toFixed(1))
      : 0;

    return apiSuccess({
      metrics: {
        attritionRate: calculatedAttrition,
        costPerHire: 45000,
        trainingScore: 4.8,
        leaveUtilization: calculatedLeaveUtilization,
        totalHeadcount: employeeCount,
        openPositions,
        pendingLeaves,
      },
      payrollTrend,
      headcountGrowth,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch reports analytics', 500);
  }
}
