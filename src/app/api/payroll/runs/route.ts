import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'payroll_benefits');
    if (accessError) return accessError;

    const formatPayslip = (ps: any) => ({
      id: ps.id,
      payrollRunId: ps.payrollRunId,
      employeeId: ps.employeeId,
      employeeCode: ps.employee?.employeeCode || 'VV-1005',
      employeeName: ps.employee ? `${ps.employee.firstName} ${ps.employee.lastName}` : 'Employee',
      designation: ps.employee?.designationTitle || 'Senior Specialist',
      department: ps.employee?.departmentName || 'Operations',
      period: ps.period,
      paidDays: 30,
      lopDays: 0,
      breakup: {
        basic: Number(ps.basicSalary || 0),
        hra: Number(ps.hra || 0),
        specialAllowance: Number(ps.specialAllowance || 0),
        conveyance: Number(ps.conveyance || 0),
        medicalAllowance: Number(ps.medical || 0),
        grossEarnings: Number(ps.grossEarnings || 0),
        pfEmployee: Number(ps.pfDeduction || 0),
        esiEmployee: Number(ps.esiDeduction || 0),
        professionalTax: Number(ps.professionalTax || 0),
        tds: Number(ps.incomeTaxTds || 0),
        totalDeductions: Number(ps.totalDeductions || 0),
        netPay: Number(ps.netPay || 0),
        pfEmployer: 1800,
        esiEmployer: 0,
        ctcMonthly: Number(ps.grossEarnings || 0) + 1800,
        ctcAnnual: (Number(ps.grossEarnings || 0) + 1800) * 12,
      },
      paymentMode: ps.paymentMode || 'bank_transfer',
      status: ps.paymentStatus === 'Disbursed' ? 'published' : 'draft',
    });

    if (userCtx.role === 'employee' && userCtx.employeeId) {
      let rawPayslips: any[] = [];
      if (prisma) {
        let emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { id: userCtx.employeeId },
              { employeeCode: userCtx.employeeId },
              { userId: userCtx.userId },
              { email: userCtx.email },
            ],
          },
        });

        rawPayslips = await prisma.payslip.findMany({
          where: emp ? { employeeId: emp.id } : {},
          include: { employee: true },
        });
      }

      const payslips = rawPayslips.map(formatPayslip);

      return apiSuccess({
        payslips,
        userRole: userCtx.role,
      });
    }

    let runs: any[] = [];
    let allPayslips: any[] = [];
    if (prisma) {
      runs = await prisma.payrollRun.findMany({
        include: {
          payslips: { include: { employee: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const raw = await prisma.payslip.findMany({
        include: { employee: true },
      });
      allPayslips = raw.map(formatPayslip);
    }

    return apiSuccess({
      payrollRuns: runs,
      payslips: allPayslips,
      totalRuns: runs.length,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch payroll data', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'payroll_benefits');
    if (accessError) return accessError;

    const body = await req.json();
    const { action, monthYear, payrollRunId } = body;

    if (!prisma) {
      return apiError('Database client unavailable', 500);
    }

    const org = await prisma.organization.findFirst();
    if (!org) return apiError('Organization not found', 404);

    if (action === 'approve_run') {
      const updatedRun = await prisma.payrollRun.update({
        where: { id: payrollRunId },
        data: {
          status: 'approved',
          approvedBy: userCtx.employeeName || 'Managing Director',
        },
      });

      // Update payslip statuses to Disbursed
      await prisma.payslip.updateMany({
        where: { payrollRunId },
        data: { paymentStatus: 'Disbursed' },
      });

      return apiSuccess({ payrollRun: updatedRun }, 'Payroll run approved for disbursement');
    }

    // Default: Calculate & Trigger New Payroll Run
    const employees = await prisma.employee.findMany();
    const totalEmployees = employees.length || 1;

    let totalGross = 0;
    let totalDeductions = 0;

    employees.forEach((e: any) => {
      const gross = Number(e.ctcAnnual) / 12;
      totalGross += gross;
      totalDeductions += gross * 0.15;
    });

    const newRun = await prisma.payrollRun.create({
      data: {
        organizationId: org.id,
        monthYear: monthYear || 'August 2026',
        totalEmployees,
        totalGross,
        totalNet: totalGross - totalDeductions,
        status: 'calculated',
        calculatedBy: userCtx.employeeName || 'HR Operations',
      },
    });

    // Create payslip records for each active employee
    for (const emp of employees) {
      const basic = Number(emp.ctcAnnual) / 24;
      const hra = basic * 0.4;
      const special = basic * 0.4;
      const gross = basic + hra + special;
      const pf = Math.min(1800, basic * 0.12);
      const tax = gross > 100000 ? gross * 0.1 : 0;
      const ded = pf + tax + 200;
      const net = gross - ded;

      await prisma.payslip.create({
        data: {
          payrollRunId: newRun.id,
          employeeId: emp.id,
          period: monthYear || 'August 2026',
          basicSalary: basic,
          hra,
          specialAllowance: special,
          grossEarnings: gross,
          pfDeduction: pf,
          incomeTaxTds: tax,
          professionalTax: 200,
          totalDeductions: ded,
          netPay: net,
          paymentStatus: 'Pending',
        },
      });
    }

    return apiSuccess({ payrollRun: newRun }, 'New payroll calculation run completed and saved', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process payroll action', 500);
  }
}
