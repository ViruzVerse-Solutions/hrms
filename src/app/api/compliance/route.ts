import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { complianceService } from '@/services/compliance.service';
import { auditService } from '@/services/audit.service';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'policy_compliance');
    if (accessError) return accessError;

    const data = await serverCache.fetchWithCache(
      'compliance_policies_all',
      () => complianceService.getPolicies(),
      5 * 60 * 1000,
      ['compliance']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch compliance policies', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'policy_compliance', 'create');
    if (permError) return permError;

    const body = await req.json();
    const { title, category, version, effectiveDate, content, fileUrl } = body;

    if (!title || !category || !version) {
      return apiError('Missing required policy fields: title, category, and version are mandatory', 400);
    }

    const newPolicy = await complianceService.createPolicy({
      title,
      category,
      version,
      effectiveDate,
      content,
      fileUrl,
      userId: userCtx.userId,
      userName: userCtx.employeeName,
      userRole: userCtx.role,
    });

    await auditService.logAction({
      userName: userCtx.employeeName || 'Policy Officer',
      userRole: userCtx.role,
      action: 'POLICY_CREATED',
      module: 'policy_compliance',
      resourceId: newPolicy.id,
      payloadAfter: { title: newPolicy.title, version: newPolicy.version },
    });

    serverCache.invalidateTags(['compliance', 'dashboard']);

    return apiSuccess({ policy: newPolicy }, 'Company policy published successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to publish compliance policy', 500);
  }
}
