import { prisma } from '@/lib/db/prisma';
import { serverCache } from '@/lib/server-cache';

let cachedOrgId: string | null = null;
async function getOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

export const recruitmentService = {
  async getRequisitionsAndCandidates() {
    if (!prisma) return { requisitions: [], candidates: [] };

    // Parallel fetch for requisitions and candidates
    const [requisitions, candidates] = await Promise.all([
      prisma.jobRequisition.findMany({
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
          candidates: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.candidate.findMany({
        include: {
          jobRequisition: {
            select: { title: true, department: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Fast in-memory deduplication of duplicate titles if any
    const seenMap = new Map<string, any>();
    for (const r of requisitions) {
      const key = `${r.title.trim().toLowerCase()}_${r.departmentId}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, r);
      }
    }
    const uniqueReqs = Array.from(seenMap.values());

    return {
      requisitions: uniqueReqs.map((r: any) => ({
        id: r.id,
        title: r.title,
        department: r.department?.name || 'General',
        departmentId: r.departmentId,
        designation: r.designation?.title || 'Staff',
        headcount: r.headcount,
        status: r.status,
        experienceMin: r.experienceMin,
        experienceMax: r.experienceMax,
        budgetMin: Number(r.budgetMin || 0),
        budgetMax: Number(r.budgetMax || 0),
        targetDate: r.createdAt ? r.createdAt.toISOString().split('T')[0] : '2026-08-01',
        candidateCount: r.candidates?.length || 0,
      })),
      candidates: candidates.map((c: any) => ({
        id: c.id,
        candidateCode: c.candidateCode,
        name: c.name,
        email: c.email,
        phone: c.phone,
        stage: c.stage,
        currentStage: c.stage,
        jobRequisitionId: c.jobRequisitionId,
        jobTitle: c.jobRequisition?.title,
        experienceYears: Number(c.experienceYears || 0),
        currentCtc: c.currentCtc ? Number(c.currentCtc) : undefined,
        expectedCtc: c.expectedCtc ? Number(c.expectedCtc) : undefined,
        matchScore: c.matchScore,
        interviewDate: c.interviewDate ? c.interviewDate.toISOString().split('T')[0] : undefined,
      })),
    };
  },

  async createRequisition(data: any) {
    if (!prisma) throw new Error('Database unavailable');

    const orgId = await getOrgId();
    if (!orgId) throw new Error('Organization not found');

    let deptId = data.departmentId;
    if (!deptId) {
      const dept = await prisma.department.findFirst({
        where: data.departmentName ? { name: { contains: data.departmentName, mode: 'insensitive' } } : undefined,
        select: { id: true },
      });
      deptId = dept?.id || (await prisma.department.findFirst({ select: { id: true } }))?.id;
    }

    let desId = data.designationId;
    if (!desId) {
      const des = await prisma.designation.findFirst({
        where: data.positionTitle ? { title: { contains: data.positionTitle, mode: 'insensitive' } } : undefined,
        select: { id: true },
      });
      desId = des?.id || (await prisma.designation.findFirst({ select: { id: true } }))?.id;
    }

    const title = (data.title || data.positionTitle || 'Open Position').trim();

    // Check if identical active requisition exists
    const existingActive = await prisma.jobRequisition.findFirst({
      where: {
        organizationId: orgId,
        departmentId: deptId,
        title: { equals: title, mode: 'insensitive' },
      },
      include: {
        department: true,
        designation: true,
      },
    });

    if (existingActive) {
      serverCache.invalidateTags(['recruitment', 'dashboard']);
      return existingActive;
    }

    const newReq = await prisma.jobRequisition.create({
      data: {
        organizationId: orgId,
        departmentId: deptId,
        designationId: desId,
        title,
        headcount: data.headcount || data.openingsCount || 1,
        budgetMin: data.budgetMin || 500000,
        budgetMax: data.budgetMax || 1000000,
        experienceMin: data.experienceMin || 2,
        experienceMax: data.experienceMax || 5,
        status: 'active',
      },
      include: {
        department: true,
        designation: true,
      },
    });

    // Invalidate server cache tags
    serverCache.invalidateTags(['recruitment', 'dashboard']);

    return newReq;
  },

  async updateCandidateStage(candidateId: string, stage: string) {
    if (!prisma) throw new Error('Database unavailable');

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: { stage: stage as any },
    });

    // Invalidate server cache tags
    serverCache.invalidateTags(['recruitment', 'dashboard']);

    return updated;
  },
};
