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

      newTicket = await prisma.grievanceTicket.create({
        data: {
          employeeId: body.isAnonymous ? null : empId,
          category: body.category || 'work_environment',
          subject: body.subject || body.title || (body.description ? body.description.slice(0, 50) : 'Workplace Grievance Ticket'),
          description: body.description || 'No description provided.',
          isAnonymous: Boolean(body.isAnonymous),
          priority: body.priority || 'medium',
          status: 'open',
          assignedTo: 'HR Operations Committee',
        },
      });
    }

    return apiSuccess({ grievance: newTicket }, 'Grievance ticket created successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit grievance', 500);
  }
}
