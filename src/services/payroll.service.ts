import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { calculateSalaryBreakup } from '@/lib/utils';

export const payrollService = {
  async getRuns(role: UserRole, employeeId?: string) {
    if (!prisma) return { payrollRuns: [], payslips: [] };

    const payrollRuns = await prisma.payrollRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        calculatedByUser: { select: { name: true } },
        approvedByUser: { select: { name: true } },
        payslips: {
          take: 10,
        },
      },
    });

    const wherePayslip: any = {};
    if (role === 'employee' && employeeId) {
      wherePayslip.OR = [{ employeeId }, { employee: { employeeCode: employeeId } }];
    }

    const payslips = await prisma.payslip.findMany({
      where: wherePayslip,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true, designation: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      payrollRuns: payrollRuns.map((r: any) => ({
        id: r.id,
        monthYear: r.monthYear,
        totalEmployees: r.totalEmployees,
        totalGross: Number(r.totalGross),
        totalDeductions: Number(r.totalDeductions),
        totalNet: Number(r.totalNet),
        status: r.status,
        calculatedBy: r.calculatedByUser?.name || 'HR Head',
        approvedBy: r.approvedByUser?.name || (r.status === 'approved' ? 'Managing Director' : undefined),
        version: r.version,
      })),
      payslips: payslips.map((p: any) => ({
        id: p.id,
        employeeId: p.employeeId,
        employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
        employeeCode: p.employee.employeeCode,
        department: p.employee.department?.name || 'Operations',
        designation: p.employee.designation?.title || 'Staff',
        period: p.period,
        basicSalary: Number(p.basicSalary),
        hra: Number(p.hra),
        specialAllowance: Number(p.specialAllowance),
        conveyance: Number(p.conveyance),
        medical: Number(p.medical),
        grossEarnings: Number(p.grossEarnings),
        pfDeduction: Number(p.pfDeduction),
        esiDeduction: Number(p.esiDeduction),
        professionalTax: Number(p.professionalTax),
        incomeTaxTds: Number(p.incomeTaxTds),
        totalDeductions: Number(p.totalDeductions),
        netPay: Number(p.netPay),
        paymentStatus: p.paymentStatus,
      })),
    };
  },

  async calculateRun(monthYear: string, userId: string) {
    if (!prisma) throw new Error('Database unavailable');

    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organization not found');

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { employeeId: userId }, { activeRole: 'hr_head' }] },
    });

    const calculatedById = user?.id || (await prisma.user.findFirst({ where: { activeRole: 'hr_head' } }))?.id || userId;

    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id, employmentStatus: { in: ['active', 'probation'] }, deletedAt: null },
    });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const payslipData: any[] = [];

    for (const emp of employees) {
      const ctc = Number(emp.ctc || 600000);
      const breakup = calculateSalaryBreakup(ctc);

      totalGross += breakup.grossEarnings;
      totalDeductions += breakup.totalDeductions;
      totalNet += breakup.netPay;

      payslipData.push({
        organizationId: org.id,
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
          organizationId: org.id,
          monthYear,
        },
      },
      create: {
        organizationId: org.id,
        monthYear,
        periodStart: new Date(),
        periodEnd: new Date(),
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        status: 'calculated',
        calculatedById,
        version: 1,
      },
      update: {
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        status: 'calculated',
        calculatedById,
        version: { increment: 1 },
      },
    });

    // Delete and recreate payslips for this run
    await prisma.payslip.deleteMany({ where: { payrollRunId: run.id } });
    await prisma.payslip.createMany({
      data: payslipData.map((p) => ({ ...p, payrollRunId: run.id })),
    });

    return run;
  },

  async approveRun(id: string, userId: string) {
    if (!prisma) throw new Error('Database unavailable');

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { employeeId: userId }, { activeRole: 'managing_director' }] },
    });

    return prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: user?.id,
        version: { increment: 1 },
      },
    });
  },
};
