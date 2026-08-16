import { prisma } from '@/lib/db/prisma';

export const recruitmentService = {
  async getRequisitionsAndCandidates() {
    if (!prisma) return { requisitions: [], candidates: [] };

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

    return {
      requisitions: requisitions.map((r: any) => ({
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
