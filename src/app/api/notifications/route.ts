import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    if (!prisma) {
      return apiSuccess({ notifications: [] });
    }

    // Find matching user by role or employeeId/userId
    let userWhere: any = {};
    if (userCtx.employeeId) {
      userWhere.OR = [
        { employeeId: userCtx.employeeId },
        { id: userCtx.userId },
        { roles: { has: userCtx.role as any } }
      ];
    } else {
      userWhere.roles = { has: userCtx.role as any };
    }

    const matchedUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true }
    });

    const userIds = matchedUsers.map((u: any) => u.id);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: { in: userIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = notifications.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link || null,
      read: n.read,
      createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
    }));

    return apiSuccess({ notifications: formatted });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch notifications', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (!prisma) {
      return apiSuccess({ updated: true });
    }

    if (markAll) {
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
    }

    return apiSuccess({ updated: true }, 'Notifications updated successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update notification status', 500);
  }
}
