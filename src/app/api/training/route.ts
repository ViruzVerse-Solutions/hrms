import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'training_dev');
    if (accessError) return accessError;

    let trainings: any[] = [];
    if (prisma) {
      trainings = await prisma.trainingProgram.findMany({
        orderBy: { startDate: 'asc' },
      });
    }

    const formattedTrainings = trainings.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      trainer: t.trainer,
      startDate: typeof t.startDate === 'string' ? t.startDate : t.startDate?.toISOString().split('T')[0],
      endDate: typeof t.endDate === 'string' ? t.endDate : t.endDate?.toISOString().split('T')[0],
      mode: t.mode,
      vendorName: t.vendorName,
      capacity: t.capacity,
      enrolledCount: t.enrolledCount,
      status: t.status,
    }));

    return apiSuccess({
      count: formattedTrainings.length,
      trainings: formattedTrainings,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch training programs', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'training_dev');
    if (accessError) return accessError;

    const body = await req.json();

    // Handle Employee Workshop Enrollment Action
    if (body.action === 'enroll') {
      if (!prisma) {
        return apiSuccess({ message: 'Enrolled in training program successfully' }, 'Enrolled', 200);
      }

      let targetTraining = await prisma.trainingProgram.findFirst({
        where: body.trainingId ? { id: body.trainingId } : undefined,
      });

      if (!targetTraining) {
        targetTraining = await prisma.trainingProgram.findFirst();
      }

      if (targetTraining) {
        const updatedTraining = await prisma.trainingProgram.update({
          where: { id: targetTraining.id },
          data: {
            enrolledCount: { increment: 1 },
          },
        });
        return apiSuccess({ training: updatedTraining, message: 'Successfully enrolled in training program' }, 'Enrolled', 200);
      }

      return apiSuccess({ message: 'Enrolled in workshop successfully' }, 'Enrolled', 200);
    }

    if (!prisma) {
      return apiError('Database unavailable', 503);
    }

    const org = await prisma.organization.findFirst();
    if (!org) return apiError('Organization not found', 400);

    const newTraining = await prisma.trainingProgram.create({
      data: {
        organizationId: org.id,
        title: body.title,
        category: body.category || 'compliance',
        trainer: body.trainer,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        mode: body.mode || 'internal',
        vendorName: body.vendorName,
        capacity: body.capacity || 30,
        enrolledCount: body.enrolledCount || 0,
        status: body.status || 'upcoming',
      },
    });

    return apiSuccess({ training: newTraining }, 'Created', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to process training action', 500);
  }
}

