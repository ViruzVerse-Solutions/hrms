import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { calculateSalaryBreakup } from '@/lib/utils';
import { serverCache } from '@/lib/server-cache';

let cachedOrgId: string | null = null;
async function getOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

export const payrollService = {
  async getRuns(role: UserRole, employeeId?: string) {
    if (!prisma) return { payrollRuns: [], payslips: [] };

    const wherePayslip: any = {};
    if (role === 'employee' && employeeId) {
      wherePayslip.OR = [{ employeeId }, { employee: { employeeCode: employeeId } }];
    }

    const [payrollRuns, payslips] = await Promise.all([
      prisma.payrollRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          monthYear: true,
          totalEmployees: true,
          totalGross: true,
          totalDeductions: true,
          totalNet: true,
          status: true,
          calculatedById: true,
          approvedById: true,
          version: true,
          createdAt: true,
        },
      }),
      prisma.payslip.findMany({
        where: wherePayslip,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true, designation: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      payrollRuns: payrollRuns.map((r: any) => ({
        id: r.id,
        monthYear: r.monthYear,
        totalEmployees: r.totalEmployees,
        totalGross: Number(r.totalGross || 0),
        totalDeductions: Number(r.totalDeductions || 0),
        totalNet: Number(r.totalNet || 0),
        status: r.status,
        calculatedBy: 'HR Head',
        approvedBy: r.status === 'approved' ? 'Managing Director' : undefined,
        version: r.version,
      })),
      payslips: payslips.map((p: any) => {
        const basic = Number(p.basicSalary || 0);
        const hra = Number(p.hra || 0);
        const specialAllowance = Number(p.specialAllowance || 0);
        const conveyance = Number(p.conveyance || 0);
        const medicalAllowance = Number(p.medical || 0);
        const grossEarnings = Number(p.grossEarnings || (basic + hra + specialAllowance + conveyance + medicalAllowance));
        const pfEmployee = Number(p.pfDeduction || 0);
        const esiEmployee = Number(p.esiDeduction || 0);
        const professionalTax = Number(p.professionalTax || 0);
        const tds = Number(p.incomeTaxTds || 0);
        const totalDeductions = Number(p.totalDeductions || (pfEmployee + esiEmployee + professionalTax + tds));
        const netPay = Number(p.netPay || (grossEarnings - totalDeductions));

        return {
          id: p.id,
          payrollRunId: p.payrollRunId || '',
          employeeId: p.employeeId,
          employeeName: p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : 'Employee',
          employeeCode: p.employee?.employeeCode || '',
          department: p.employee?.department?.name || '',
          designation: p.employee?.designation?.title || '',
          period: p.period,
          paidDays: 30,
          lopDays: 0,
          paymentMode: 'bank_transfer',
          status: 'published',
          breakup: {
            basic,
            hra,
            specialAllowance,
            conveyance,
            medicalAllowance,
            grossEarnings,
            pfEmployee,
            esiEmployee,
            professionalTax,
            tds,
            totalDeductions,
            netPay,
            pfEmployer: pfEmployee,
            esiEmployer: esiEmployee,
            ctcMonthly: grossEarnings + pfEmployee,
            ctcAnnual: (grossEarnings + pfEmployee) * 12,
          },
          netPay,
          paymentStatus: p.paymentStatus,
        };
      }),
    };
  },

  async calculateRun(monthYear: string, userId: string) {
    if (!prisma) throw new Error('Database unavailable');

    const orgId = await getOrgId();
    if (!orgId) throw new Error('Organization not found');

    const employees = await prisma.employee.findMany({
      where: { employmentStatus: { in: ['active', 'probation'] } },
      select: { id: true, ctc: true },
    });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const payslipData: any[] = [];

    for (const emp of employees) {
      const ctc = Number(emp.ctc || 0);
      const breakup = calculateSalaryBreakup(ctc);

      totalGross += breakup.grossEarnings;
      totalDeductions += breakup.totalDeductions;
      totalNet += breakup.netPay;

      payslipData.push({
        organizationId: orgId,
        employeeId: emp.id,
        period: monthYear,
        basicSalary: breakup.basic,
        hra: breakup.hra,
        specialAllowance: breakup.specialAllowance,
        conveyance: breakup.conveyance,
        medical: breakup.medicalAllowance,
        grossEarnings: breakup.grossEarnings,
        pfDeduction: breakup.pfEmployee,
        esiDeduction: breakup.esiEmployee,
        professionalTax: breakup.professionalTax,
        incomeTaxTds: breakup.tds,
        totalDeductions: breakup.totalDeductions,
        netPay: breakup.netPay,
        paymentMode: 'Bank Transfer',
        paymentStatus: 'Processed',
      });
    }

    const run = await prisma.payrollRun.upsert({
      where: {
        organizationId_monthYear: {
          organizationId: orgId,
          monthYear,
        },
      },
      create: {
        organizationId: orgId,
        monthYear,
        periodStart: new Date(),
        periodEnd: new Date(),
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        status: 'calculated',
        calculatedById: userId,
        version: 1,
      } as any,
      update: {
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        status: 'calculated',
        calculatedById: userId,
        version: { increment: 1 },
      } as any,
    });

    // Transactional batch delete & create payslips
    await prisma.$transaction([
      prisma.payslip.deleteMany({ where: { payrollRunId: run.id } }),
      prisma.payslip.createMany({
        data: payslipData.map((p) => ({ ...p, payrollRunId: run.id })),
      }),
    ]);

    // Invalidate payroll and dashboard cache tags
    serverCache.invalidateTags(['payroll', 'dashboard', 'reports']);

    return run;
  },

  async approveRun(id: string, userId: string) {
    if (!prisma) throw new Error('Database unavailable');

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: userId,
        version: { increment: 1 },
      } as any,
    });

    serverCache.invalidateTags(['payroll', 'dashboard', 'reports', 'approvals']);

    return updated;
  },
};
