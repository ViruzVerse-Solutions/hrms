import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'engagement_welfare');
    if (accessError) return accessError;

    let whereClause: any = {};
    let tickets: any[] = [];
    if (prisma) {
      if (userCtx.role === 'employee' && userCtx.employeeId) {
        const emp = await prisma.employee.findFirst({
          where: { OR: [{ id: userCtx.employeeId }, { employeeCode: userCtx.employeeId }] },
        });
        if (emp) {
          whereClause.employeeId = emp.id;
        }
      }

      tickets = await prisma.grievanceTicket.findMany({
        where: whereClause,
        include: {
          employee: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedTickets = tickets.map((t: any) => ({
      id: t.id,
      ticketNumber: `GRV-${t.id.slice(-5).toUpperCase()}`,
      employeeId: t.employeeId,
      employeeName: t.isAnonymous ? 'Anonymous Employee' : (t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : 'Employee'),
      category: t.category,
      subject: t.subject,
      description: t.description,
      isAnonymous: t.isAnonymous,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo || 'HR Operations Committee',
      createdAt: t.createdAt ? t.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));

    return apiSuccess({
      count: formattedTickets.length,
      grievances: formattedTickets,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch grievances', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'engagement_welfare');
    if (accessError) return accessError;

    const body = await req.json();

    let newTicket: any = null;
    if (prisma) {
      let empId = userCtx.employeeId;
      if (empId) {
        const emp = await prisma.employee.findFirst({
          where: { OR: [{ id: empId }, { employeeCode: empId }] },
        });
        if (emp) empId = emp.id;
      }

      const org = await prisma.organization.findFirst();
      if (!org) return apiError('Organization not found', 404);

      newTicket = await prisma.grievanceTicket.create({
        data: {
          organization: { connect: { id: org.id } },
          employee: (!body.isAnonymous && empId) ? { connect: { id: empId } } : undefined,
          category: body.category || 'work_environment',
          subject: body.subject || body.title || (body.description ? body.description.slice(0, 50) : 'Workplace Grievance Ticket'),
          description: body.description || 'No description provided.',
          isAnonymous: Boolean(body.isAnonymous),
          priority: (body.priority as any) || 'medium',
          status: 'open',
        } as any,
      });
    }

    return apiSuccess({ grievance: newTicket }, 'Grievance ticket created successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit grievance', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'engagement_welfare');
    if (accessError) return accessError;

    if (!['hr_head', 'managing_director', 'compliance_statutory'].includes(userCtx.role)) {
      return apiError('Only HR Head, MD, or Compliance Officer can update grievance status', 403);
    }

    const body = await req.json();
    const { ticketId, status, resolution } = body;

    if (!ticketId || !status) {
      return apiError('Missing required fields: ticketId, status', 400);
    }

    if (prisma) {
      await prisma.grievanceTicket.update({
        where: { id: ticketId },
        data: {
          status: status as any,
          resolution: resolution || undefined,
        },
      });
    }

    return apiSuccess({ ticketId, status, resolution }, 'Grievance ticket status updated successfully');
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update grievance ticket', 500);
  }
}
