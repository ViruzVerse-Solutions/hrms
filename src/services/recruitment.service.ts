import { prisma } from '@/lib/db/prisma';

export const recruitmentService = {
  async getRequisitionsAndCandidates() {
    if (!prisma) return { requisitions: [], candidates: [] };

    // Clean up duplicate requisition records from PostgreSQL DB
    const allReqs = await prisma.jobRequisition.findMany({ orderBy: { createdAt: 'desc' } });
    const seenKeys = new Set<string>();
    const duplicateIdsToDelete: string[] = [];
    for (const req of allReqs) {
      const key = `${req.title.trim().toLowerCase()}_${req.departmentId}`;
      if (seenKeys.has(key)) {
        duplicateIdsToDelete.push(req.id);
      } else {
        seenKeys.add(key);
      }
    }
    if (duplicateIdsToDelete.length > 0) {
      try {
        await prisma.jobRequisition.deleteMany({
          where: { id: { in: duplicateIdsToDelete } },
        });
      } catch (e) {
        console.error('Failed to purge duplicate requisitions:', e);
      }
    }

    const requisitions = await prisma.jobRequisition.findMany({
      include: {
        department: true,
        designation: true,
        candidates: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const candidates = await prisma.candidate.findMany({
      include: {
        jobRequisition: {
          select: { title: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate any consecutive double-inserted requisitions
    const uniqueReqs: any[] = [];
    for (const r of requisitions) {
      const isDuplicate = uniqueReqs.some((existing) => {
        const sameTitle = existing.title.toLowerCase() === r.title.toLowerCase();
        const sameDept = existing.departmentId === r.departmentId;
        const timeDiff = Math.abs(new Date(existing.createdAt).getTime() - new Date(r.createdAt).getTime());
        return sameTitle && sameDept && timeDiff < 15000;
      });
      if (!isDuplicate) {
        uniqueReqs.push(r);
      }
    }

    return {
      requisitions: uniqueReqs.map((r: any) => ({
        id: r.id,
        title: r.title,
        department: r.department.name,
        departmentId: r.departmentId,
        designation: r.designation.title,
        headcount: r.headcount,
        status: r.status,
        experienceMin: r.experienceMin,
        experienceMax: r.experienceMax,
        budgetMin: Number(r.budgetMin),
        budgetMax: Number(r.budgetMax),
        targetDate: r.createdAt.toISOString().split('T')[0],
        candidateCount: r.candidates.length,
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
        experienceYears: Number(c.experienceYears),
        currentCtc: c.currentCtc ? Number(c.currentCtc) : undefined,
        expectedCtc: c.expectedCtc ? Number(c.expectedCtc) : undefined,
        matchScore: c.matchScore,
        interviewDate: c.interviewDate ? c.interviewDate.toISOString().split('T')[0] : undefined,
      })),
    };
  },

  async createRequisition(data: any) {
    if (!prisma) throw new Error('Database unavailable');

    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organization not found');

    let deptId = data.departmentId;
    if (!deptId) {
      const dept = await prisma.department.findFirst({
        where: data.departmentName ? { name: { contains: data.departmentName, mode: 'insensitive' } } : undefined,
      });
      deptId = dept?.id || (await prisma.department.findFirst())?.id;
    }

    let desId = data.designationId;
    if (!desId) {
      const des = await prisma.designation.findFirst({
        where: data.positionTitle ? { title: { contains: data.positionTitle, mode: 'insensitive' } } : undefined,
      });
      desId = des?.id || (await prisma.designation.findFirst())?.id;
    }

    const title = (data.title || data.positionTitle || 'Open Position').trim();

    // Robust duplicate guard: check if identical title requisition already exists in DB
    const existingActive = await prisma.jobRequisition.findFirst({
      where: {
        organizationId: org.id,
        departmentId: deptId,
        title: { equals: title, mode: 'insensitive' },
      },
      include: {
        department: true,
        designation: true,
      },
    });
    if (existingActive) {
      return existingActive;
    }

    return prisma.jobRequisition.create({
      data: {
        organizationId: org.id,
        departmentId: deptId,
        designationId: desId,
        title: data.title || data.positionTitle || 'Open Position',
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
  },

  async updateCandidateStage(candidateId: string, stage: string) {
    if (!prisma) throw new Error('Database unavailable');

    return prisma.candidate.update({
      where: { id: candidateId },
      data: { stage: stage as any },
    });
  },
};
