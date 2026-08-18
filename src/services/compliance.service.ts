import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { serverCache } from '@/lib/server-cache';

let cachedOrgId: string | null = null;
async function getOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

export const complianceService = {
  async getPolicies() {
    if (!prisma) return { policies: [], totalEmployees: 0 };

    const [policies, totalEmployees] = await Promise.all([
      prisma.companyPolicy.findMany({
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.employee.count({
        where: { employmentStatus: { in: ['active', 'probation'] } },
      }).catch(() => 0),
    ]);

    return {
      policies: policies.map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        version: p.version,
        effectiveDate: p.effectiveDate.toISOString().split('T')[0],
        acknowledgedCount: p.acknowledgedCount,
        totalEmployees: totalEmployees,
        status: p.status,
        content: p.content || '',
        fileUrl: p.fileUrl || '',
        createdByName: p.createdByName,
        createdByRole: p.createdByRole,
      })),
      totalEmployees: totalEmployees,
    };
  },

  async createPolicy(data: {
    title: string;
    category: string;
    version: string;
    effectiveDate?: string;
    content?: string;
    fileUrl?: string;
    userId?: string;
    userName?: string;
    userRole?: UserRole;
  }) {
    if (!prisma) throw new Error('Database unavailable');

    const orgId = await getOrgId();
    if (!orgId) throw new Error('Organization not found');

    const created = await prisma.companyPolicy.create({
      data: {
        organizationId: orgId,
        title: data.title,
        category: data.category,
        version: data.version.startsWith('v') ? data.version : `v${data.version}`,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        content: data.content || '',
        fileUrl: data.fileUrl,
        createdById: data.userId,
        createdByName: data.userName || 'Compliance Officer',
        createdByRole: (data.userRole as any) || 'compliance_statutory',
        status: 'active',
      },
    });

    serverCache.invalidateTags(['compliance', 'dashboard']);

    return created;
  },

  async updatePolicy(id: string, data: any) {
    if (!prisma) throw new Error('Database unavailable');

    const updated = await prisma.companyPolicy.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.category && { category: data.category }),
        ...(data.version && { version: data.version }),
        ...(data.effectiveDate && { effectiveDate: new Date(data.effectiveDate) }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status && { status: data.status }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
      },
    });

    serverCache.invalidateTags(['compliance', 'dashboard']);

    return updated;
  },

  async deletePolicy(id: string) {
    if (!prisma) throw new Error('Database unavailable');

    const deleted = await prisma.companyPolicy.delete({
      where: { id },
    });

    serverCache.invalidateTags(['compliance', 'dashboard']);

    return deleted;
  },
};
