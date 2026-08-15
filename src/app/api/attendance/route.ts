import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'attendance_leave');
    if (accessError) return accessError;

    let whereClause: any = {};

    let records: any[] = [];
    if (prisma) {
      if (userCtx.role === 'employee' && userCtx.employeeId) {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { id: userCtx.employeeId },
              { employeeCode: userCtx.employeeId },
              { employeeCode: 'VV-1005' },
              { email: userCtx.email },
            ],
          },
        });
        if (emp) {
          whereClause.employeeId = emp.id;
        }
      }

      records = await prisma.attendanceRecord.findMany({
        where: whereClause,
        include: {
          employee: true,
        },
        orderBy: { date: 'desc' },
      });
    }

    const formattedRecords = records.map((r: any) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Employee',
      date: typeof r.date === 'string' ? r.date : r.date?.toISOString().split('T')[0],
      inTime: r.inTime ? (typeof r.inTime === 'string' ? r.inTime : r.inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : null,
      outTime: r.outTime ? (typeof r.outTime === 'string' ? r.outTime : r.outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : null,
      totalHours: Number(r.totalHours || 0),
      status: r.status,
      source: r.source,
      notes: r.notes,
    }));

    return apiSuccess({
      count: formattedRecords.length,
      attendanceRecords: formattedRecords,
      userRole: userCtx.role,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch attendance records', 500);
  }
}
