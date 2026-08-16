import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiNotFound, apiForbidden } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { canPerformAction } from '@/lib/rbac';
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

    const employee: any = await employeeService.getById(id, userCtx.role, userCtx.employeeId);
    if (!employee) {
      return apiNotFound(`Employee with ID '${id}' not found`);
    }

    const sanitizedEmployee = {
      ...employee,
      avatarUrl: employee.avatarUrl || getPersonaAvatar(employee.employeeCode, `${employee.firstName} ${employee.lastName}`),
      departmentName: employee.department?.name || 'General',
      designationTitle: employee.designation?.title || 'Staff',
      branchName: employee.branch?.name || 'Headquarters',
      gender: employee.gender || '',
      dob: employee.dob || '',
      dateOfJoining: employee.dateOfJoining || '',
      bankDetails: {
        accountNumber: employee.accountNumber || employee.bankDetails?.accountNumber || '',
        bankName: employee.bankName || employee.bankDetails?.bankName || '',
        ifscCode: employee.ifscCode || employee.bankDetails?.ifscCode || '',
        pan: employee.pan || employee.bankDetails?.pan || '',
      },
      statutoryInfo: {
        pan: employee.pan || '',
        pfNumber: employee.pfNumber || employee.statutoryInfo?.pfNumber || '',
        uan: employee.uan || employee.statutoryInfo?.uan || '',
        esiNumber: employee.esiNumber || employee.statutoryInfo?.esiNumber || '',
        ptState: employee.ptState || '',
      },
      emergencyContacts: employee.emergencyContactName ? [
        {
          name: employee.emergencyContactName,
          phone: employee.emergencyContactPhone || '',
          relationship: employee.emergencyContactRelation || 'Family',
        },
      ] : (employee.emergencyContacts?.length ? employee.emergencyContacts : []),
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
    const isOwnProfile = userCtx.employeeId === id || userCtx.employeeCode === id;
    
    // RBAC: Only HR Head, MD, or authorized administrators can update employee details
    const hasAdminPerm = canPerformAction(userCtx.role, 'employee_records', 'update');
    if (!hasAdminPerm || userCtx.role === 'employee') {
      return apiForbidden(`Employees are not permitted to edit profile details. Contact HR Administration for record updates.`);
    }

    const body = await req.json();
    const updatePayload = body;

    const updated = await employeeService.update(id, updatePayload);

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'EMPLOYEE_UPDATED',
      module: 'employee_records',
      resourceId: id,
      payloadAfter: { id, name: `${updated.firstName} ${updated.lastName}`, updatedBy: userCtx.role },
    });

    return apiSuccess({ employee: updated }, 'Employee profile updated successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update employee profile', 500);
  }
}
