import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { formatAuditDetails } from '@/lib/utils';
import { serverCache } from '@/lib/server-cache';
import crypto from 'crypto';

// In-memory cache for organization and hash chain tracking
let cachedOrgId: string | null = null;
let lastIntegrityHash: string | null = null;

async function getCachedOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

export const auditService = {
  async getLogs(filters?: { role?: string; module?: string; search?: string }) {
    if (!prisma) return [];

    const where: any = {};
    if (filters?.role && filters.role !== 'all') {
      where.userRole = filters.role;
    }
    if (filters?.module && filters.module !== 'all') {
      where.module = filters.module;
    }
    if (filters?.search) {
      where.OR = [
        { userName: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { module: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        userName: true,
        userRole: true,
        action: true,
        module: true,
        resourceId: true,
        payloadAfter: true,
        previousHash: true,
        integrityHash: true,
        ipAddress: true,
      },
    });

    return logs.map((l: any) => ({
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      userName: l.userName,
      role: l.userRole,
      action: l.action,
      module: l.module,
      resourceId: l.resourceId,
      details: formatAuditDetails(l.payloadAfter, l.action),
      previousHash: l.previousHash,
      integrityHash: l.integrityHash,
      ipAddress: l.ipAddress || '127.0.0.1',
    }));
  },

  async logAction(data: {
    userName: string;
    userRole: UserRole;
    action: string;
    module: string;
    resourceId?: string;
    payloadBefore?: any;
    payloadAfter?: any;
    ipAddress?: string;
  }) {
    if (!prisma) return null;

    try {
      const orgId = await getCachedOrgId();
      if (!orgId) return null;

      // Fast retrieval of previous hash
      let prevHash = lastIntegrityHash;
      if (!prevHash) {
        const lastLog = await prisma.auditLog.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          select: { integrityHash: true },
        });
        prevHash = lastLog?.integrityHash || 'GENESIS_BLOCK_0000000000000000';
      }

      const payloadStr = JSON.stringify({
        orgId,
        user: data.userName,
        role: data.userRole,
        action: data.action,
        module: data.module,
        resource: data.resourceId,
        after: data.payloadAfter,
      });

      const integrityHash = crypto.createHash('sha256').update(`${prevHash}:${payloadStr}`).digest('hex');
      lastIntegrityHash = integrityHash;

      // Invalidate audit logs cache tag
      serverCache.invalidateTags(['audit', 'dashboard']);

      // 1 single direct INSERT
      return await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userName: data.userName,
          userRole: data.userRole as any,
          action: data.action,
          module: data.module,
          resourceId: data.resourceId,
          payloadBefore: data.payloadBefore,
          payloadAfter: data.payloadAfter,
          ipAddress: data.ipAddress || '127.0.0.1',
          previousHash: prevHash,
          integrityHash: integrityHash,
        } as any,
      });
    } catch (e) {
      console.warn('Audit logging failed silently to preserve performance:', e);
      return null;
    }
  },
};
