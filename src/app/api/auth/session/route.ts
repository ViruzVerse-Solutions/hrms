import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { CORE_PERSONAS, getPersonaAvatar } from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);

    let user: any = null;

    if (prisma) {
      try {
        user = await prisma.user.findFirst({
          where: {
            activeRole: userCtx.role as any,
          },
          include: {
            employee: {
              include: {
                department: true,
                designation: true,
              },
            },
          },
        });
      } catch (dbErr) {
        console.log('Database query notice:', dbErr);
      }
    }

    if (!user) {
      user = CORE_PERSONAS.find((u) => u.activeRole === userCtx.role) || CORE_PERSONAS[1];
    }

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatarUrl || user.avatar || getPersonaAvatar(user.email, user.name),
        activeRole: userCtx.role,
        roles: user.roles,
        employeeId: user.employeeId || user.employee?.id,
        departmentName: user.employee?.department?.name,
        designationTitle: user.employee?.designation?.title,
      },
      activeRole: userCtx.role,
      availableRoles: user.roles,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch session', 500);
  }
}
