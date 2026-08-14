import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'payroll_benefits');
    if (accessError) return accessError;

    // If role is employee, they only receive personal payslips
    if (userCtx.role === 'employee' && userCtx.employeeId) {
      let payslips: any[] = [];
      if (prisma) {
        payslips = await prisma.payslip.findMany({
          where: {
            OR: [
              { employeeId: userCtx.employeeId },
              { employee: { employeeCode: userCtx.employeeId } },
            ],
          },
          include: { employee: true },
        });
      }

      return apiSuccess({
        payslips,
        userRole: userCtx.role,
      });
    }

    let runs: any[] = [];
    if (prisma) {
      runs = await prisma.payrollRun.findMany({
        include: {
          payslips: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return apiSuccess({
      payrollRuns: runs,
      totalRuns: runs.length,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch payroll data', 500);
  }
}
