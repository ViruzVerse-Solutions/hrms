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

    return prisma.jobRequisition.create({
      data: {
        organizationId: org.id,
        departmentId: data.departmentId,
        designationId: data.designationId,
        title: data.title,
        headcount: data.headcount || 1,
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
