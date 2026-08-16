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

    const org = await prisma.organization.findFirst();
    const organizationId = org?.id;
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

    const syncedResults: any[] = [];
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

      const saved = await prisma.attendanceRecord.upsert({
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
      });

      syncedResults.push(saved);
    }

    return {
      syncedCount: syncedResults.length,
      errorsCount: errors.length,
      errors,
      records: syncedResults,
    };
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

  async getLeaveAllocations(employeeId?: string) {
    if (!prisma) return [];

    let empId = employeeId;
    if (empId) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: empId },
            { employeeCode: empId },
            { employeeCode: { equals: empId, mode: 'insensitive' } },
          ],
        },
      });
      if (emp) empId = emp.id;
    }

    if (!empId) {
      const firstEmp = await prisma.employee.findFirst({ where: { employmentStatus: { not: 'terminated' } } });
      empId = firstEmp?.id;
    }

    if (!empId) return [];

    const dbAllocations = await prisma.leaveAllocation.findMany({
      where: { employeeId: empId, year: new Date().getFullYear() },
    });

    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId: empId },
    });

    const leaveTypes = ['casual', 'sick', 'earned'];
    return leaveTypes.map((type) => {
      const alloc = dbAllocations.find((a: any) => a.leaveType === type);
      const defaultQuota = type === 'casual' ? 12 : type === 'sick' ? 10 : 15;
      const allocatedDays = alloc ? Number(alloc.allocatedDays) : defaultQuota;

      const typeRequests = requests.filter((r: any) => r.leaveType === type);
      const usedDays = typeRequests
        .filter((r: any) => r.status === 'approved')
        .reduce((sum: number, r: any) => sum + Number(r.daysCount || 0), 0);
      const pendingDays = typeRequests
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, r: any) => sum + Number(r.daysCount || 0), 0);
      const balanceDays = Math.max(0, allocatedDays - usedDays);

      return {
        leaveType: type,
        allocatedDays,
        usedDays,
        pendingDays,
        balanceDays,
      };
    });
  },
};
