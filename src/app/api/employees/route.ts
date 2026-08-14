import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { canViewSensitiveSalary } from '@/lib/rbac';
import { prisma } from '@/lib/db/prisma';
import { getPersonaAvatar } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const dept = searchParams.get('departmentId');
    const search = searchParams.get('search')?.toLowerCase();

    const canSeeAllSalaries = canViewSensitiveSalary(userCtx.role, false);

    let whereClause: any = {};

    if (dept && dept !== 'all') {
      whereClause.departmentId = dept;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    let employees: any[] = [];

    if (prisma) {
      employees = await prisma.employee.findMany({
        where: whereClause,
        include: {
          department: true,
          designation: true,
          branch: true,
        },
        orderBy: { employeeCode: 'asc' },
      });
    }

    // Field-level confidentiality: redact salary if unauthorized
    const sanitizedEmployees = employees.map((emp: any) => {
      const isSelf = emp.id === userCtx.employeeId;
      const isSalaryVisible = canSeeAllSalaries || isSelf;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        avatarUrl: emp.avatarUrl || getPersonaAvatar(emp.employeeCode, `${emp.firstName} ${emp.lastName}`),
        departmentId: emp.departmentId || emp.department?.id,
        departmentName: emp.department?.name || '',
        designationId: emp.designationId || emp.designation?.id,
        designationTitle: emp.designation?.title || '',
        branchId: emp.branchId || emp.branch?.id,
        branchName: emp.branch?.name || '',
        employmentStatus: emp.employmentStatus,
        currentLifecycleStage: emp.currentLifecycleStage || 'onboarding',
        ctc: isSalaryVisible ? Number(emp.ctc) : 0,
      };
    });

    return apiSuccess({
      count: sanitizedEmployees.length,
      employees: sanitizedEmployees,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch employees', 500);
  }
}
