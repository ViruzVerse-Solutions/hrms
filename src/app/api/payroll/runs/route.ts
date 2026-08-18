import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { payrollService } from '@/services/payroll.service';
import { auditService } from '@/services/audit.service';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'payroll_benefits');
    if (accessError) return accessError;

    const cacheKey = `payroll_runs_${userCtx.role}_${userCtx.employeeId || 'all'}`;

    const data = await serverCache.fetchWithCache(
      cacheKey,
      async () => {
        const raw = await payrollService.getRuns(userCtx.role, userCtx.employeeId);

        const formattedPayslips = raw.payslips.map((ps: any) => ({
          id: ps.id,
          employeeId: ps.employeeId,
          employeeCode: ps.employeeCode,
          employeeName: ps.employeeName,
          department: ps.department,
          designation: ps.designation,
          period: ps.period,
          paidDays: 30,
          lopDays: 0,
          breakup: {
            basic: ps.basicSalary,
            hra: ps.hra,
            specialAllowance: ps.specialAllowance,
            conveyance: ps.conveyance,
            medicalAllowance: ps.medical,
            grossEarnings: ps.grossEarnings,
            pfEmployee: ps.pfDeduction,
            esiEmployee: ps.esiDeduction,
            professionalTax: ps.professionalTax,
            tds: ps.incomeTaxTds,
            totalDeductions: ps.totalDeductions,
            netPay: ps.netPay,
            pfEmployer: 1800,
            esiEmployer: 0,
            ctcMonthly: ps.grossEarnings + 1800,
            ctcAnnual: (ps.grossEarnings + 1800) * 12,
          },
          paymentMode: 'bank_transfer',
          status: 'published',
        }));

        return {
          payrollRuns: raw.payrollRuns,
          payslips: formattedPayslips,
          totalRuns: raw.payrollRuns.length,
          userRole: userCtx.role,
        };
      },
      5 * 60 * 1000,
      ['payroll']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch payroll data', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'payroll_benefits', 'create');
    if (permError) return permError;

    const body = await req.json().catch(() => ({}));
    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const monthYear = body.monthYear || currentYearMonth;

    const run = await payrollService.calculateRun(monthYear, userCtx.employeeName || 'HR Officer');

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'PAYROLL_RUN_CALCULATED',
      module: 'payroll_benefits',
      resourceId: run.id,
      payloadAfter: { monthYear, totalGross: run.totalGross },
    });

    serverCache.invalidateTags(['payroll', 'dashboard', 'reports', 'approvals']);

    return apiSuccess(
      { payrollRun: run },
      `Payroll for ${monthYear} calculated successfully`,
      201
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to calculate payroll', 500);
  }
}
