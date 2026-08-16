import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { employeeService } from '@/services/employee.service';
import { auditService } from '@/services/audit.service';
import { getPersonaAvatar } from '@/lib/constants';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    const employee = await employeeService.getById(id, userCtx.role, userCtx.employeeId);
    if (!employee) {
      return apiNotFound(`Employee with ID '${id}' not found`);
    }

    const sanitizedEmployee = {
      ...employee,
      avatarUrl: employee.avatarUrl || getPersonaAvatar(employee.employeeCode, `${employee.firstName} ${employee.lastName}`),
      departmentName: employee.department?.name || 'Operations',
      designationTitle: employee.designation?.title || 'Staff',
      branchName: employee.branch?.name || 'Headquarters',
      bankDetails: employee.accountNumber ? {
        accountNumber: employee.accountNumber,
        bankName: employee.bankName || 'HDFC Bank',
        ifscCode: employee.ifscCode || 'HDFC0001234',
        pan: employee.pan || 'ABCDE1234F',
      } : undefined,
      statutoryInfo: employee.pfNumber ? {
        pfNumber: employee.pfNumber,
        uan: employee.uan,
        esiNumber: employee.esiNumber,
      } : undefined,
      emergencyContacts: employee.emergencyContactName ? [
        {
          name: employee.emergencyContactName,
          phone: employee.emergencyContactPhone,
          relationship: employee.emergencyContactRelation || 'Family',
        },
      ] : [],
    };

    return apiSuccess({ employee: sanitizedEmployee });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch employee profile', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'employee_records', 'update');
    if (permError) return permError;

    const body = await req.json();
    const updated = await employeeService.update(id, body);

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'EMPLOYEE_UPDATED',
      module: 'employee_records',
      resourceId: id,
      payloadAfter: { id, name: `${updated.firstName} ${updated.lastName}`, stage: updated.currentLifecycleStage },
    });

    return apiSuccess({ employee: updated }, 'Employee profile updated successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update employee profile', 500);
  }
}
