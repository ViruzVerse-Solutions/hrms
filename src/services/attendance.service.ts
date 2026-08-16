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

    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeCode: employeeId }] },
    });

    if (!emp) throw new Error('Employee not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();

    const record = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: today,
        },
      },
      create: {
        organizationId: emp.organizationId,
        employeeId: emp.id,
        date: today,
        inTime: now,
        status: status as any,
        source: 'web_checkin' as any,
        totalHours: 9.0,
      },
      update: {
        outTime: now,
        status: status as any,
      },
    });

    return record;
  },

  async getLeaves(role: UserRole, employeeId?: string) {
    if (!prisma) return [];

    const where: any = {};
    if (role === 'employee' && employeeId) {
      where.OR = [{ employeeId }, { employee: { employeeCode: employeeId } }];
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { fromDate: 'desc' },
    });

    return leaves.map((l: any) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
      department: l.employee.department?.name || 'General',
      leaveType: l.leaveType,
      fromDate: l.fromDate.toISOString().split('T')[0],
      toDate: l.toDate.toISOString().split('T')[0],
      daysCount: Number(l.daysCount),
      reason: l.reason,
      status: l.status,
      approverComment: l.approverComment,
    }));
  },

  async applyLeave(employeeId: string, data: { leaveType: string; fromDate: string; toDate: string; reason: string }) {
    if (!prisma) throw new Error('Database unavailable');

    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeCode: employeeId }] },
    });

    if (!emp) throw new Error('Employee not found');

    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: emp.organizationId,
        employeeId: emp.id,
        leaveType: data.leaveType as any,
        fromDate: from,
        toDate: to,
        daysCount: diffDays,
        reason: data.reason,
        status: 'pending',
      },
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
