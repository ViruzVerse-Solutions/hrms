import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';

export const attendanceService = {
  async getRecords(role: UserRole, employeeId?: string, date?: string) {
    if (!prisma) return [];

    const where: any = {};
    if (role === 'employee' && employeeId) {
      where.OR = [{ employeeId }, { employee: { employeeCode: employeeId } }];
    } else if (employeeId && employeeId !== 'all') {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = new Date(date);
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return records.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department?.name || 'Operations',
      date: r.date.toISOString().split('T')[0],
      inTime: r.inTime ? r.inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      outTime: r.outTime ? r.outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      totalHours: Number(r.totalHours || 0),
      status: r.status,
      source: r.source,
      isRegularized: r.isRegularized,
      regularizationStatus: r.isRegularized ? 'Approved' : 'None',
    }));
  },

  async checkIn(employeeId: string, status: 'present' | 'half_day' = 'present') {
    if (!prisma) throw new Error('Database unavailable');

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeId },
          { employeeCode: employeeId },
          { email: { contains: employeeId } },
        ],
        employmentStatus: { not: 'terminated' },
      },
    });

    if (!emp) {
      emp = await prisma.employee.findFirst({ where: { employmentStatus: { not: 'terminated' } } });
    }

    if (!emp) throw new Error('Employee not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();
    const org = await prisma.organization.findFirst();
    const organizationId = org?.id || emp.organizationId;
    if (!organizationId) throw new Error('Organization not found');

    const record = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: today,
        },
      },
      create: {
        organizationId,
        employeeId: emp.id,
        date: today,
        inTime: now,
        status: status as any,
        source: 'web_checkin' as any,
        totalHours: 9.0,
      } as any,
      update: {
        outTime: now,
        status: status as any,
      },
    });

    return record;
  },

  async getLeaves(role: UserRole, employeeId?: string) {
    if (!prisma) return [];

    let emp = null;
    if (employeeId) {
      emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: employeeId },
            { employeeCode: employeeId },
            { employeeCode: { equals: employeeId, mode: 'insensitive' } },
          ],
        },
      });
    }

    const where: any = {};
    if (role === 'employee') {
      if (emp) {
        where.employeeId = emp.id;
      } else {
        return [];
      }
    }

    return prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { fromDate: 'desc' },
    });
  },

  async applyLeave(employeeId: string, data: any) {
    if (!prisma) throw new Error('Database unavailable');

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeId },
          { employeeCode: employeeId },
          { employeeCode: { equals: employeeId, mode: 'insensitive' } },
        ],
      },
    });

    if (!emp) {
      emp = await prisma.employee.findFirst({ where: { employmentStatus: { not: 'terminated' } } });
    }

    if (!emp) throw new Error('Employee not found');

    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const org = await prisma.organization.findFirst();
    const organizationId = org?.id || emp.organizationId;
    if (!organizationId) throw new Error('Organization not found');

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId: emp.id,
        leaveType: data.leaveType as any,
        fromDate: from,
        toDate: to,
        daysCount: diffDays,
        reason: data.reason,
        status: 'pending',
      } as any,
    });

    return leave;
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', approverId?: string, comment?: string) {
    if (!prisma) throw new Error('Database unavailable');

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as any,
        approverId,
        approverComment: comment,
        processedAt: new Date(),
      },
    });
  },
};
