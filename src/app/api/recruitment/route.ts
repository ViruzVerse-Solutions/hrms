import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'recruitment');
    if (accessError) return accessError;

    let requisitions: any[] = [];
    let candidates: any[] = [];

    if (prisma) {
      requisitions = await prisma.jobRequisition.findMany({
        include: {
          department: true,
          designation: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      candidates = await prisma.candidate.findMany({
        include: {
          jobRequisition: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedRequisitions = requisitions.map((r: any) => ({
      id: r.id,
      positionTitle: r.title,
      departmentId: r.departmentId,
      departmentName: r.department?.name || 'Department',
      openingsCount: r.headcount,
      urgency: r.status === 'approved' ? 'high' : 'medium',
      minExperience: `${r.experienceMin}-${r.experienceMax} Years`,
      status: r.status || 'pending_approval',
      targetDate: r.updatedAt ? r.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      justification: `Approved headcount requirement for ${r.title}`,
      requestedById: userCtx.employeeId || userCtx.userId,
      requestedByName: 'Eleanor Vance (HR Head)',
    }));

    const formattedCandidates = candidates.map((c: any) => ({
      id: c.id,
      candidateCode: c.candidateCode,
      name: c.name,
      email: c.email,
      phone: c.phone,
      positionApplied: c.jobRequisition?.title || 'Open Position',
      currentStage: c.stage,
      experienceYears: Number(c.experienceYears),
      currentCtc: c.currentCtc ? Number(c.currentCtc) : 0,
      expectedCtc: c.expectedCtc ? Number(c.expectedCtc) : 0,
      rating: c.rating ? Number(c.rating) : 4.0,
      matchScore: c.matchScore || 85,
      appliedDate: c.createdAt ? c.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      interviewDate: c.interviewDate ? c.interviewDate.toISOString().split('T')[0] : undefined,
      interviewerName: c.interviewerName || undefined,
    }));

    return apiSuccess({
      requisitions: formattedRequisitions,
      candidates: formattedCandidates,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch recruitment data', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'recruitment');
    if (accessError) return accessError;

    const body = await req.json();

    if (body.action === 'update_candidate_stage') {
      const { candidateId, stage } = body;
      if (prisma) {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { stage },
        });
      }
      return apiSuccess({ candidateId, stage }, 'Candidate stage updated successfully');
    }

    if (body.action === 'approve_requisition') {
      const { requisitionId } = body;
      if (prisma) {
        await prisma.jobRequisition.update({
          where: { id: requisitionId },
          data: { status: 'approved' },
        });
      }
      return apiSuccess({ requisitionId, status: 'approved' }, 'Requisition approved by Executive Management');
    }

    // Default: Create new Job Requisition in pending_approval status
    let newReq: any = null;
    if (prisma) {
      const defaultDept = await prisma.department.findFirst();
      const defaultDesig = await prisma.designation.findFirst();

      const isExecutive = ['managing_director', 'chairman'].includes(userCtx.role);
      const status = isExecutive ? 'approved' : 'pending_approval';

      newReq = await prisma.jobRequisition.create({
        data: {
          organizationId: (await prisma.organization.findFirst())?.id || 'org_vv',
          departmentId: body.departmentId || defaultDept?.id,
          designationId: defaultDesig?.id,
          title: body.positionTitle || 'New Position',
          headcount: body.openingsCount || 1,
          status,
          budgetMin: 800000,
          budgetMax: 1500000,
        },
      });
    }

    return apiSuccess(
      { requisition: newReq },
      userCtx.role === 'hr_head'
        ? 'Job requisition created and submitted to Managing Director for budget approval'
        : 'Job requisition created and approved',
      201
    );
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process recruitment action', 500);
  }
}
