import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { formatAuditDetails } from '@/lib/utils';
import crypto from 'crypto';

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

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
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

    const org = await prisma.organization.findFirst();
    if (!org) return null;

    // Retrieve previous log entry in the cryptographic chain
    const lastLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    const prevHash = lastLog?.integrityHash || 'GENESIS_BLOCK_0000000000000000';
    const payloadStr = JSON.stringify({
      orgId: org.id,
      user: data.userName,
      role: data.userRole,
      action: data.action,
      module: data.module,
      resource: data.resourceId,
      after: data.payloadAfter,
    });

    const integrityHash = crypto.createHash('sha256').update(`${prevHash}:${payloadStr}`).digest('hex');

    const user = await prisma.user.findFirst({
      where: { OR: [{ name: data.userName }, { activeRole: data.userRole }] },
    });

    return prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user?.id,
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
    }).catch(() => null);
  },
};
