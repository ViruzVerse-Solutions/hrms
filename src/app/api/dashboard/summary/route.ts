import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';
import { formatAuditDetails } from '@/lib/utils';
import { serverCache } from '@/lib/server-cache';

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

    const cacheKey = `dashboard_summary_${userCtx.role}_${userCtx.employeeId || 'all'}`;

    const data = await serverCache.fetchWithCache(
      cacheKey,
      async () => {
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

          // 2. Attendance Records
          prisma.attendanceRecord.findMany({
            take: 50,
            orderBy: { date: 'desc' },
            select: {
              id: true,
              employeeId: true,
              date: true,
              inTime: true,
              outTime: true,
              totalHours: true,
              status: true,
              source: true,
              isRegularized: true,
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
              },
            },
          }).catch(() => []),

          // 3. Leaves
          prisma.leaveRequest.findMany({
            select: {
              id: true,
              employeeId: true,
              leaveType: true,
              fromDate: true,
              toDate: true,
              daysCount: true,
              reason: true,
              status: true,
              approverComment: true,
              createdAt: true,
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          }).catch(() => []),

          // 4. Payroll Runs
          prisma.payrollRun.findMany({
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: {
              id: true,
              monthYear: true,
              totalEmployees: true,
              totalGross: true,
              totalDeductions: true,
              totalNet: true,
              status: true,
              approvedById: true,
              createdAt: true,
            },
          }).catch(() => []),

          // 5. Payslips
          prisma.payslip.findMany({
            where: userCtx.role === 'employee' && userCtx.employeeId ? {
              OR: [{ employeeId: userCtx.employeeId }, { employee: { employeeCode: userCtx.employeeId } }],
            } : {},
            select: {
              id: true,
              payrollRunId: true,
              employeeId: true,
              period: true,
              basicSalary: true,
              hra: true,
              specialAllowance: true,
              conveyance: true,
              medical: true,
              grossEarnings: true,
              pfDeduction: true,
              esiDeduction: true,
              professionalTax: true,
              incomeTaxTds: true,
              totalDeductions: true,
              netPay: true,
              paymentStatus: true,
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
            select: {
              id: true,
              title: true,
              headcount: true,
              status: true,
              experienceMin: true,
              experienceMax: true,
              department: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []),

          // 7. Candidates
          prisma.candidate.findMany({
            select: {
              id: true,
              candidateCode: true,
              name: true,
              stage: true,
              matchScore: true,
              jobRequisition: { select: { title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          }).catch(() => []),

          // 8. Policies
          prisma.companyPolicy.findMany({
            where: { status: 'active' },
            select: {
              id: true,
              title: true,
              category: true,
              version: true,
              effectiveDate: true,
              acknowledgedCount: true,
              status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }).catch(() => []),

          // 9. Audit Logs
          prisma.auditLog.findMany({
            select: {
              id: true,
              userName: true,
              userRole: true,
              action: true,
              module: true,
              payloadAfter: true,
              createdAt: true,
            },
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
          employeeName: a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : 'Employee',
          employeeCode: a.employee?.employeeCode || '',
          department: a.employee?.department?.name || 'Operations',
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
          employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : (l.employeeName || 'Employee'),
          employeeCode: l.employee?.employeeCode || l.employeeCode || '',
          department: l.employee?.department?.name || l.department || 'General',
          leaveType: l.leaveType,
          fromDate: l.fromDate instanceof Date ? l.fromDate.toISOString().split('T')[0] : String(l.fromDate).split('T')[0],
          toDate: l.toDate instanceof Date ? l.toDate.toISOString().split('T')[0] : String(l.toDate).split('T')[0],
          daysCount: Number(l.daysCount || 0),
          reason: l.reason || '',
          status: l.status,
          approverComment: l.approverComment,
          createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : (l.createdAt ? String(l.createdAt) : new Date().toISOString()),
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
            employeeCode: p.employee?.employeeCode || '',
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

        return {
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
            approvedBy: r.approvedById,
          })),
          payslips: formattedPayslips,
          requisitions: requisitions.map((r: any) => ({
            id: r.id,
            positionTitle: r.title,
            departmentName: r.department?.name || 'General',
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
            userName: l.userName || 'System User',
            userRole: l.userRole,
            role: l.userRole,
            action: l.action || 'system_event',
            module: l.module || 'system_settings',
            details: formatAuditDetails(l.payloadAfter, l.action),
            timestamp: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
          })),
          branches,
          departments,
          summary: {
            totalEmployees: formattedEmployees.length,
            presentToday: formattedAttendance.filter((a: any) => a.status === 'present').length,
            pendingLeaves: formattedLeaves.filter((l: any) => l.status === 'pending').length,
            activeRequisitions: requisitions.filter((r: any) => r.status === 'active').length,
          },
        };
      },
      5 * 60 * 1000, // 5 minutes TTL (instant purge on any write)
      ['dashboard']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch dashboard summary', 500);
  }
}
