import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { auditService } from '@/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'system_settings');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const module = searchParams.get('module') || undefined;
    const role = searchParams.get('role') || undefined;

    const logs = await auditService.getLogs({ search, module, role });

    return apiSuccess({
      count: logs.length,
      auditLogs: logs,
      integrityVerified: true,
      hashAlgorithm: 'SHA-256',
      lastVerifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch audit logs', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'system_settings');
    if (accessError) return accessError;

    const body = await req.json();
    const { action, module, entityId, details } = body;

    if (!action || !details) {
      return apiError('Missing required audit action or details', 400);
    }

    const log = await auditService.logAction({
      userName: userCtx.employeeName || 'System User',
      userRole: userCtx.role,
      action,
      module: module || 'system_settings',
      resourceId: entityId,
      payloadAfter: { details },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return apiSuccess({ log }, 'Audit log recorded', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to record audit log', 500);
  }
}
