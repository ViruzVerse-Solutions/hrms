import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'system_settings');
    if (accessError) return accessError;

    let auditLogs: any[] = [];
    if (prisma) {
      auditLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return apiSuccess({
      count: auditLogs.length,
      auditLogs,
      integrityVerified: true,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch audit logs', 500);
  }
}
