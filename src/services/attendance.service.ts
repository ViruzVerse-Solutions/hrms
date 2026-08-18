import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { serverCache } from '@/lib/server-cache';

let cachedOrgId: string | null = null;
async function getOrgId(): Promise<string | null> {
  if (cachedOrgId) return cachedOrgId;
  if (!prisma) return null;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (org) cachedOrgId = org.id;
  return cachedOrgId;
}

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
      select: {
        id: true,
        employeeId: true,
        date: true,
        inTime: true,
        outTime: true,
        totalHours: true,
        status: true,
        source: true,
        isRegularized: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return records.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Employee',
      employeeCode: r.employee?.employeeCode || '',
      department: r.employee?.department?.name || 'Operations',
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

  async syncExcelAttendance(records: Array<{
    employeeCode: string;
    date: string;
    inTime?: string;
    outTime?: string;
    totalHours?: number;
    status?: 'present' | 'absent' | 'half_day' | 'on_leave';
    machineId?: string;
  }>) {
    if (!prisma) throw new Error('Database unavailable');

    const organizationId = await getOrgId();
    if (!organizationId) throw new Error('Organization not found');

    const employees = await prisma.employee.findMany({
      select: { id: true, employeeCode: true },
    });

    const empCodeMap = new Map<string, string>();
    for (const emp of employees) {
      if (emp.employeeCode) {
        empCodeMap.set(emp.employeeCode.trim().toUpperCase(), emp.id);
      }
    }

    const upsertOperations: any[] = [];
    const errors: string[] = [];

    for (const row of records) {
      const code = (row.employeeCode || '').trim().toUpperCase();
      const employeeId = empCodeMap.get(code);
      if (!employeeId) {
        errors.push(`Employee code '${row.employeeCode}' not found`);
        continue;
      }

      const recordDate = new Date(row.date);
      recordDate.setHours(0, 0, 0, 0);

      let inDateTime: Date | null = null;
      if (row.inTime) {
        const parts = row.inTime.split(':').map(Number);
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          inDateTime = new Date(recordDate);
          inDateTime.setHours(parts[0], parts[1], 0, 0);
        }
      }

      let outDateTime: Date | null = null;
      if (row.outTime) {
        const parts = row.outTime.split(':').map(Number);
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          outDateTime = new Date(recordDate);
          outDateTime.setHours(parts[0], parts[1], 0, 0);
        }
      }

      let hours = row.totalHours;
      if (hours === undefined || isNaN(hours)) {
        if (inDateTime && outDateTime) {
          const diffMs = outDateTime.getTime() - inDateTime.getTime();
          hours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));
        } else if (row.status === 'present') {
          hours = 8.5;
        } else if (row.status === 'half_day') {
          hours = 4.5;
        } else {
          hours = 0;
        }
      }

      const status = row.status || (hours >= 8 ? 'present' : hours >= 4 ? 'half_day' : 'absent');

      upsertOperations.push(
        prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId,
              date: recordDate,
            },
          },
          create: {
            organizationId,
            employeeId,
            date: recordDate,
            inTime: inDateTime || (status === 'present' ? new Date(recordDate.getTime() + 9 * 3600000) : null),
            outTime: outDateTime || (status === 'present' ? new Date(recordDate.getTime() + 18 * 3600000) : null),
            totalHours: hours,
            status: status as any,
            source: 'biometric' as any,
          } as any,
          update: {
            inTime: inDateTime || undefined,
            outTime: outDateTime || undefined,
            totalHours: hours,
            status: status as any,
            source: 'biometric' as any,
          },
        })
      );
    }

    // Execute all upserts in a single high-speed database transaction
    const syncedResults = upsertOperations.length > 0
      ? await prisma.$transaction(upsertOperations)
      : [];

    // Invalidate attendance & dashboard cache tags
    serverCache.invalidateTags(['attendance', 'dashboard', 'reports']);

    return {
      syncedCount: syncedResults.length,
      errorsCount: errors.length,
      errors,
      records: syncedResults,
    };
  },

  async getLeaves(role: UserRole, employeeId?: string) {
    if (!prisma) return [];

    const where: any = {};
    if (role === 'employee') {
      let targetEmpId = employeeId;
      if (targetEmpId) {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { id: targetEmpId },
              { employeeCode: targetEmpId },
              { email: targetEmpId },
            ],
          },
          select: { id: true },
        });
        if (emp) targetEmpId = emp.id;
      }

      if (!targetEmpId) {
        const firstEmp = await prisma.employee.findFirst({
          where: { employmentStatus: { not: 'terminated' } },
          select: { id: true },
        });
        targetEmpId = firstEmp?.id;
      }

      if (targetEmpId) {
        where.OR = [
          { employeeId: targetEmpId },
          { employee: { employeeCode: targetEmpId } },
        ];
      }
    }

    const records = await prisma.leaveRequest.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        leaveType: true,
        fromDate: true,
        toDate: true,
        daysCount: true,
        reason: true,
        status: true,
        approverComment: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return records.map((l: any) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee',
      employeeCode: l.employee?.employeeCode || '',
      department: l.employee?.department?.name || 'Operations',
      leaveType: l.leaveType,
      fromDate: l.fromDate instanceof Date ? l.fromDate.toISOString().split('T')[0] : String(l.fromDate).split('T')[0],
      toDate: l.toDate instanceof Date ? l.toDate.toISOString().split('T')[0] : String(l.toDate).split('T')[0],
      daysCount: Number(l.daysCount || 1),
      reason: l.reason || '',
      status: l.status,
      approverComment: l.approverComment,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
    }));
  },

  async applyLeave(employeeId: string, data: any) {
    if (!prisma) throw new Error('Database unavailable');

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeId },
          { employeeCode: employeeId },
          { email: employeeId },
        ],
      },
      select: { id: true, organizationId: true },
    });

    if (!emp) {
      emp = await prisma.employee.findFirst({
        where: { employmentStatus: { not: 'terminated' } },
        select: { id: true, organizationId: true },
      });
    }

    if (!emp) throw new Error('No active employee record found');

    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const organizationId = emp.organizationId || (await getOrgId());
    if (!organizationId) throw new Error('Organization not found');

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId: emp.id,
        leaveType: data.leaveType as any,
        fromDate: from,
        toDate: to,
        daysCount: diffDays,
        reason: data.reason || 'Leave requested',
        status: 'pending',
      } as any,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Invalidate leaves and dashboard cache tags
    serverCache.invalidateTags(['leaves', 'dashboard', 'approvals', 'reports']);

    return {
      ...leave,
      employeeName: leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Employee',
      employeeCode: leave.employee?.employeeCode || '',
      department: leave.employee?.department?.name || 'Operations',
      fromDate: leave.fromDate instanceof Date ? leave.fromDate.toISOString().split('T')[0] : String(leave.fromDate).split('T')[0],
      toDate: leave.toDate instanceof Date ? leave.toDate.toISOString().split('T')[0] : String(leave.toDate).split('T')[0],
      createdAt: leave.createdAt instanceof Date ? leave.createdAt.toISOString() : String(leave.createdAt),
    };
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', approverId?: string, comment?: string) {
    if (!prisma) throw new Error('Database unavailable');

    let validApproverId: string | null = null;
    if (approverId) {
      const approverEmp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: approverId },
            { employeeCode: approverId },
            { email: approverId },
          ],
        },
        select: { id: true },
      });
      if (approverEmp) validApproverId = approverEmp.id;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as any,
        approverId: validApproverId,
        approverComment: comment,
        processedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Keep leave allocation balances synchronized (for actual leaves, not Outdoor Duty)
    const isOd = updated.reason?.startsWith('[ON DUTY') || updated.reason?.includes('[OD]');
    if (!isOd) {
      try {
        const year = updated.fromDate ? new Date(updated.fromDate).getFullYear() : new Date().getFullYear();
        const alloc = await prisma.leaveAllocation.findFirst({
          where: {
            employeeId: updated.employeeId,
            leaveType: updated.leaveType,
            year,
          },
        });

        if (alloc) {
          if (status === 'approved') {
            const newUsed = Number(alloc.usedDays) + Number(updated.daysCount);
            const newPending = Math.max(0, Number(alloc.pendingDays) - Number(updated.daysCount));
            const newBalance = Math.max(0, Number(alloc.allocatedDays) - newUsed);
            await prisma.leaveAllocation.update({
              where: { id: alloc.id },
              data: { usedDays: newUsed, pendingDays: newPending, balanceDays: newBalance },
            });
          } else if (status === 'rejected') {
            const newPending = Math.max(0, Number(alloc.pendingDays) - Number(updated.daysCount));
            const newBalance = Math.max(0, Number(alloc.allocatedDays) - Number(alloc.usedDays));
            await prisma.leaveAllocation.update({
              where: { id: alloc.id },
              data: { pendingDays: newPending, balanceDays: newBalance },
            });
          }
        }
      } catch {}
    }

    // Invalidate leaves and dashboard cache tags
    serverCache.invalidateTags(['leaves', 'dashboard', 'approvals', 'reports']);

    return {
      ...updated,
      employeeName: updated.employee ? `${updated.employee.firstName} ${updated.employee.lastName}` : 'Employee',
      employeeCode: updated.employee?.employeeCode || '',
      department: updated.employee?.department?.name || 'Operations',
      fromDate: updated.fromDate instanceof Date ? updated.fromDate.toISOString().split('T')[0] : String(updated.fromDate).split('T')[0],
      toDate: updated.toDate instanceof Date ? updated.toDate.toISOString().split('T')[0] : String(updated.toDate).split('T')[0],
    };
  },

  async getLeaveAllocations(employeeId?: string) {
    if (!prisma) return [];

    let targetEmpId = employeeId;
    if (targetEmpId) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: targetEmpId },
            { employeeCode: targetEmpId },
          ],
        },
        select: { id: true },
      });
      if (emp) targetEmpId = emp.id;
    }

    if (!targetEmpId) {
      const firstEmp = await prisma.employee.findFirst({
        where: { employmentStatus: { not: 'terminated' } },
        select: { id: true },
      });
      targetEmpId = firstEmp?.id;
    }

    if (!targetEmpId) return [];

    const [dbAllocations, requests] = await Promise.all([
      prisma.leaveAllocation.findMany({
        where: { employeeId: targetEmpId, year: new Date().getFullYear() },
      }),
      prisma.leaveRequest.findMany({
        where: { employeeId: targetEmpId },
        select: { leaveType: true, status: true, daysCount: true, reason: true },
      }),
    ]);

    const defaultQuotas: Record<string, number> = {
      casual: 12,
      sick: 12,
      earned: 15,
    };

    const leaveTypes = ['casual', 'sick', 'earned'];
    return leaveTypes.map((type) => {
      const alloc = dbAllocations.find((a: any) => a.leaveType === type);
      const allocatedDays = alloc ? Number(alloc.allocatedDays) : (defaultQuotas[type] || 12);

      const typeRequests = requests.filter((r: any) => r.leaveType === type && !r.reason?.startsWith('[ON DUTY') && !r.reason?.includes('[OD]'));
      const usedDays = typeRequests
        .filter((r: any) => r.status === 'approved')
        .reduce((sum: number, r: any) => sum + Number(r.daysCount || 0), 0);
      const pendingDays = typeRequests
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, r: any) => sum + Number(r.daysCount || 0), 0);
      const balanceDays = Math.max(0, allocatedDays - usedDays);

      return {
        id: alloc?.id || `alloc_${type}_${targetEmpId}`,
        employeeId: targetEmpId,
        leaveType: type,
        allocatedDays,
        usedDays,
        pendingDays,
        balanceDays,
        year: new Date().getFullYear(),
      };
    });
  },
};
