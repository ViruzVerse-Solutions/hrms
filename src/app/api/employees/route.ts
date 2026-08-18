import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { employeeService } from '@/services/employee.service';
import { auditService } from '@/services/audit.service';
import { getPersonaAvatar } from '@/lib/constants';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const cacheKey = `employees_${userCtx.role}_${departmentId || 'all'}_${status || 'all'}_${search || 'all'}`;

    const data = await serverCache.fetchWithCache(
      cacheKey,
      async () => {
        const employees = await employeeService.getAll(userCtx.role, {
          departmentId,
          status,
          search,
        });

        const sanitizedEmployees = employees.map((emp: any) => ({
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
          ctc: emp.ctc || 0,
          salaryMasked: emp.salaryMasked,
        }));

        return {
          count: sanitizedEmployees.length,
          employees: sanitizedEmployees,
        };
      },
      5 * 60 * 1000,
      ['employees']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch employees', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'employee_records', 'create');
    if (permError) return permError;

    const body = await req.json();
    if (!body.firstName || !body.lastName || !body.email) {
      return apiError('Missing required fields: firstName, lastName, and email are mandatory', 400);
    }

    const newEmp = await employeeService.create(body, userCtx.role);

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'EMPLOYEE_CREATED',
      module: 'employee_records',
      resourceId: newEmp.id,
      payloadAfter: { code: newEmp.employeeCode, name: `${newEmp.firstName} ${newEmp.lastName}` },
    });

    serverCache.invalidateTags(['employees', 'dashboard', 'reports']);

    return apiSuccess(newEmp, 'Employee created successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to create employee', 500);
  }
}
