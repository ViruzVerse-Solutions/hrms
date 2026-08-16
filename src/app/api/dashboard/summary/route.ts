import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    if (!prisma) {
      return apiSuccess({
        employees: [],
        attendanceRecords: [],
        leaveRequests: [],
        payrollRuns: [],
        payslips: [],
        requisitions: [],
        candidates: [],
        policies: [],
        auditLogs: [],
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel high-performance database fetch
    const [
      employees,
      attendanceToday,
      leaves,
      payrollRuns,
      payslips,
      requisitions,
      candidates,
      policies,
      auditLogs,
      branches,
      departments,
    ] = await Promise.all([
      // 1. Employees
      prisma.employee.findMany({
        where: { employmentStatus: { not: 'terminated' } },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          departmentId: true,
          designationId: true,
          branchId: true,
          employmentStatus: true,
          currentLifecycleStage: true,
          ctc: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { employeeCode: 'asc' },
      }).catch(() => []),

      // 2. Attendance Today
      prisma.attendanceRecord.findMany({
        where: { date: today },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
          },
        },
      }).catch(() => []),

      // 3. Leaves
      prisma.leaveRequest.findMany({
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }).catch(() => []),

      // 4. Payroll Runs
      prisma.payrollRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
      }).catch(() => []),

      // 5. Payslips
      prisma.payslip.findMany({
        where: userCtx.role === 'employee' && userCtx.employeeId ? {
          OR: [{ employeeId: userCtx.employeeId }, { employee: { employeeCode: userCtx.employeeId } }],
        } : {},
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { name: true } },
              designation: { select: { title: true } },
              ctc: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []),

      // 6. Requisitions
      prisma.jobRequisition.findMany({
        include: {
          department: true,
          designation: true,
          candidates: true,
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),

      // 7. Candidates
      prisma.candidate.findMany({
        include: {
          jobRequisition: { select: { title: true, department: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).catch(() => []),

      // 8. Policies
      prisma.companyPolicy.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []),

      // 9. Audit Logs
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),

      // 10. Branches
      prisma.branch.findMany({
        select: { id: true, name: true, city: true, isHeadquarters: true },
      }).catch(() => []),

      // 11. Departments
      prisma.department.findMany({
        select: { id: true, name: true, code: true },
      }).catch(() => []),
    ]);

    const formattedEmployees = employees.map((emp: any) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      departmentId: emp.departmentId,
      departmentName: emp.department?.name || 'General',
      designationId: emp.designationId,
      designationTitle: emp.designation?.title || 'Staff',
      branchId: emp.branchId,
      branchName: emp.branch?.name || 'Headquarters',
      employmentStatus: emp.employmentStatus,
      currentLifecycleStage: emp.currentLifecycleStage,
      ctc: Number(emp.ctc || 0),
    }));

    const formattedAttendance = attendanceToday.map((a: any) => ({
      id: a.id,
      employeeId: a.employeeId,
      employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
      employeeCode: a.employee.employeeCode,
      department: a.employee.department?.name || 'Operations',
      date: a.date.toISOString().split('T')[0],
      inTime: a.inTime ? a.inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      outTime: a.outTime ? a.outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      totalHours: Number(a.totalHours || 0),
      status: a.status,
      source: a.source,
      isRegularized: a.isRegularized,
    }));

    const formattedLeaves = leaves.map((l: any) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
      department: l.employee.department?.name || 'General',
      leaveType: l.leaveType,
      fromDate: l.fromDate.toISOString().split('T')[0],
      toDate: l.toDate.toISOString().split('T')[0],
      daysCount: Number(l.daysCount),
      reason: l.reason,
      status: l.status,
      approverComment: l.approverComment,
    }));

    const formattedPayslips = payslips.map((p: any) => {
      const basic = Number(p.basicSalary || 0);
      const hra = Number(p.hra || 0);
      const specialAllowance = Number(p.specialAllowance || 0);
      const conveyance = Number(p.conveyance || 1600);
      const medicalAllowance = Number(p.medical || 1250);
      const grossEarnings = Number(p.grossEarnings || (basic + hra + specialAllowance + conveyance + medicalAllowance));
      const pfEmployee = Number(p.pfDeduction || 0);
      const esiEmployee = Number(p.esiDeduction || 0);
      const professionalTax = Number(p.professionalTax || 200);
      const tds = Number(p.incomeTaxTds || 0);
      const totalDeductions = Number(p.totalDeductions || (pfEmployee + esiEmployee + professionalTax + tds));
      const netPay = Number(p.netPay || (grossEarnings - totalDeductions));

      return {
        id: p.id,
        payrollRunId: p.payrollRunId || 'pr_001',
        employeeId: p.employeeId,
        employeeCode: p.employee?.employeeCode || 'VV-006',
        employeeName: p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : 'Employee',
        designation: p.employee?.designation?.title || 'Staff',
        department: p.employee?.department?.name || 'Operations',
        period: p.period || '2026-08',
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
        paymentStatus: p.paymentStatus || 'Processed',
      };
    });

    return apiSuccess({
      employees: formattedEmployees,
      attendanceRecords: formattedAttendance,
      leaveRequests: formattedLeaves,
      payrollRuns: payrollRuns.map((r: any) => ({
        id: r.id,
        period: r.monthYear || '2026-08',
        monthName: r.monthYear || 'August 2026',
        year: 2026,
        status: r.status === 'approved' ? 'approved' : 'under_review',
        totalEmployees: r.totalEmployees,
        totalGrossPay: Number(r.totalGross || 0),
        totalDeductions: Number(r.totalDeductions || 0),
        totalNetPay: Number(r.totalNet || 0),
        varianceCount: 0,
        runDate: r.createdAt ? r.createdAt.toISOString().split('T')[0] : '2026-08-01',
        approvedBy: r.approvedBy,
      })),
      payslips: formattedPayslips,
      requisitions: requisitions.map((r: any) => ({
        id: r.id,
        positionTitle: r.title,
        departmentName: r.department.name,
        openingsCount: r.headcount,
        status: r.status,
        minExperience: `${r.experienceMin}-${r.experienceMax} Years`,
      })),
      candidates: candidates.map((c: any) => ({
        id: c.id,
        candidateCode: c.candidateCode,
        name: c.name,
        stage: c.stage,
        matchScore: c.matchScore,
        positionApplied: c.jobRequisition?.title || 'Open Position',
      })),
      policies: policies.map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        version: p.version,
        effectiveDate: p.effectiveDate.toISOString().split('T')[0],
        acknowledgedCount: p.acknowledgedCount,
        status: p.status,
      })),
      auditLogs: auditLogs.map((l: any) => ({
        id: l.id,
        userName: l.userName,
        userRole: l.userRole,
        action: l.action,
        module: l.module,
        timestamp: l.createdAt.toISOString(),
      })),
      branches,
      departments,
      summary: {
        totalEmployees: formattedEmployees.length,
        presentToday: formattedAttendance.filter((a: any) => a.status === 'present').length,
        pendingLeaves: formattedLeaves.filter((l: any) => l.status === 'pending').length,
        activeRequisitions: requisitions.filter((r: any) => r.status === 'active').length,
      },
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch dashboard summary', 500);
  }
}
