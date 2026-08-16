import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { complianceService } from '@/services/compliance.service';
import { auditService } from '@/services/audit.service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'policy_compliance', 'update');
    if (permError) return permError;

    const body = await req.json();
    const updated = await complianceService.updatePolicy(id, body);

    await auditService.logAction({
      userName: userCtx.employeeName || 'Policy Officer',
      userRole: userCtx.role,
      action: 'POLICY_UPDATED',
      module: 'policy_compliance',
      resourceId: id,
      payloadAfter: { title: updated.title, version: updated.version, status: updated.status },
    });

    return apiSuccess({ policy: updated }, 'Policy updated successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update policy', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'policy_compliance', 'delete');
    if (permError) return permError;

    const deleted = await complianceService.deletePolicy(id);

    await auditService.logAction({
      userName: userCtx.employeeName || 'Policy Officer',
      userRole: userCtx.role,
      action: 'POLICY_DELETED',
      module: 'policy_compliance',
      resourceId: id,
      payloadAfter: { id, title: deleted.title },
    });

    return apiSuccess({ policy: deleted }, 'Policy deleted successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to delete policy', 500);
  }
}
