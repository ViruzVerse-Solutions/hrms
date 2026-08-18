import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess, requireActionPermission } from '@/lib/auth/rbac-guard-api';
import { recruitmentService } from '@/services/recruitment.service';
import { auditService } from '@/services/audit.service';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'recruitment');
    if (accessError) return accessError;

    const data = await serverCache.fetchWithCache(
      'recruitment_all_data',
      async () => {
        const raw = await recruitmentService.getRequisitionsAndCandidates();

        const formattedRequisitions = raw.requisitions.map((r: any) => ({
          id: r.id,
          positionTitle: r.title,
          departmentId: r.departmentId,
          departmentName: r.department,
          openingsCount: r.headcount,
          urgency: r.status === 'approved' ? 'high' : 'medium',
          minExperience: `${r.experienceMin}-${r.experienceMax} Years`,
          status: r.status || 'active',
          targetDate: r.targetDate,
          justification: `Approved headcount requirement for ${r.title}`,
          requestedById: r.requestedById || userCtx.employeeId || userCtx.userId,
          requestedByName: r.requestedByName || 'HR Head',
        }));

        const formattedCandidates = raw.candidates.map((c: any) => ({
          id: c.id,
          candidateCode: c.candidateCode,
          name: c.name,
          email: c.email,
          phone: c.phone,
          positionApplied: c.jobTitle || '',
          currentStage: c.stage,
          experienceYears: c.experienceYears,
          currentCtc: c.currentCtc || 0,
          expectedCtc: c.expectedCtc || 0,
          rating: c.rating || 0,
          matchScore: c.matchScore || 0,
          interviewDate: c.interviewDate,
        }));

        return {
          requisitions: formattedRequisitions,
          candidates: formattedCandidates,
        };
      },
      5 * 60 * 1000,
      ['recruitment']
    );

    return apiSuccess(data);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch recruitment data', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const permError = requireActionPermission(userCtx, 'recruitment', 'create');
    if (permError) return permError;

    const body = await req.json();

    if (body.action === 'update_candidate_stage') {
      const { candidateId, stage } = body;
      await recruitmentService.updateCandidateStage(candidateId, stage);

      await auditService.logAction({
        userName: userCtx.employeeName || 'HR Officer',
        userRole: userCtx.role,
        action: 'CANDIDATE_STAGE_UPDATED',
        module: 'recruitment',
        resourceId: candidateId,
        payloadAfter: { candidateId, stage },
      });

      serverCache.invalidateTags(['recruitment', 'dashboard']);

      return apiSuccess({ candidateId, stage }, 'Candidate stage updated successfully');
    }

    const newReq = await recruitmentService.createRequisition(body);

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Officer',
      userRole: userCtx.role,
      action: 'REQUISITION_CREATED',
      module: 'recruitment',
      resourceId: newReq.id,
      payloadAfter: { title: newReq.title, headcount: newReq.headcount },
    });

    serverCache.invalidateTags(['recruitment', 'dashboard', 'approvals']);

    return apiSuccess({ requisition: newReq }, 'Job requisition created successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process recruitment request', 500);
  }
}
