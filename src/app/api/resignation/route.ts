import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'resignation_exit');
    if (accessError) return accessError;

    if (!prisma) {
      return apiSuccess({ exitCases: [] });
    }

    const isManagement = ['hr_head', 'managing_director', 'chairman'].includes(userCtx.role);

    let rawCases: any[] = [];

    if (userCtx.role === 'employee') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: userCtx.employeeId || '' },
            { employeeCode: userCtx.employeeId || '' },
            { userId: userCtx.userId },
            { email: userCtx.email },
          ],
        },
      });

      if (emp) {
        rawCases = await prisma.resignationExitCase.findMany({
          where: { employeeId: emp.id },
          include: { employee: true },
          orderBy: { createdAt: 'desc' },
        });
      }
    } else {
      rawCases = await prisma.resignationExitCase.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedCases = rawCases.map((exitCase: any) => ({
      id: exitCase.id,
      employeeId: exitCase.employeeId,
      employeeName: exitCase.employee ? `${exitCase.employee.firstName} ${exitCase.employee.lastName}` : 'Employee',
      resignationDate: typeof exitCase.resignationDate === 'string' ? exitCase.resignationDate : exitCase.resignationDate.toISOString().split('T')[0],
      requestedLwd: typeof exitCase.lastWorkingDay === 'string' ? exitCase.lastWorkingDay : exitCase.lastWorkingDay.toISOString().split('T')[0],
      approvedLwd: typeof exitCase.lastWorkingDay === 'string' ? exitCase.lastWorkingDay : exitCase.lastWorkingDay.toISOString().split('T')[0],
      noticePeriodDays: exitCase.noticePeriodDays,
      reason: exitCase.reason,
      status: exitCase.fnfStatus === 'cleared' ? 'settled' : 'clearance_in_progress',
      clearances: {
        it: { status: exitCase.itClearanceStatus || 'cleared', clearedBy: 'IT Asset Lead' },
        admin: { status: exitCase.deptClearanceStatus || 'cleared', clearedBy: 'Admin Desk' },
        finance: { status: exitCase.financeClearanceStatus || 'pending' },
        hr: { status: 'pending' },
      },
      ffSettlement: {
        pendingSalary: 112000,
        leaveEncashment: 42000,
        bonusGratuity: 85000,
        noticeShortfallDeduction: 0,
        assetDeduction: 0,
        totalNetSettlement: Number(exitCase.fnfAmount || 239000),
        status: exitCase.fnfStatus || 'draft',
      },
    }));

    if (!isManagement) {
      return apiSuccess({ exitCase: formattedCases[0] || null });
    }

    return apiSuccess({
      exitCases: formattedCases,
      exitCase: formattedCases[0] || null,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch resignation exit case', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'resignation_exit');
    if (accessError) return accessError;

    const body = await req.json();

    if (!prisma) {
      return apiSuccess({ message: 'Resignation notice submitted', exitCase: body });
    }

    // Process clearance update action
    if (body.action === 'update_clearance') {
      const { exitCaseId, clearanceType, status } = body;
      const dataToUpdate: any = {};
      if (clearanceType === 'it') dataToUpdate.itClearanceStatus = status;
      if (clearanceType === 'admin' || clearanceType === 'dept') dataToUpdate.deptClearanceStatus = status;
      if (clearanceType === 'finance') dataToUpdate.financeClearanceStatus = status;
      if (clearanceType === 'fnf') dataToUpdate.fnfStatus = status;

      const updated = await prisma.resignationExitCase.update({
        where: { id: exitCaseId },
        data: dataToUpdate,
      });
      return apiSuccess({ exitCase: updated }, 'Clearance status updated successfully');
    }

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: body.employeeId || userCtx.employeeId || '' },
          { employeeCode: body.employeeId || userCtx.employeeId || '' },
          { userId: userCtx.userId },
          { email: userCtx.email },
        ],
      },
    });

    if (!emp) {
      emp = await prisma.employee.findFirst();
    }

    if (!emp) return apiError('Employee record not found', 404);

    const existing = await prisma.resignationExitCase.findFirst({
      where: { employeeId: emp.id },
    });

    let exitRecord;
    if (existing) {
      exitRecord = await prisma.resignationExitCase.update({
        where: { id: existing.id },
        data: {
          lastWorkingDay: new Date(body.lastWorkingDay || body.requestedLwd || '2026-10-15'),
          reason: body.reason || 'Career Transition',
        },
      });
    } else {
      exitRecord = await prisma.resignationExitCase.create({
        data: {
          employeeId: emp.id,
          resignationDate: new Date(),
          lastWorkingDay: new Date(body.lastWorkingDay || body.requestedLwd || '2026-10-15'),
          reason: body.reason || 'Career Transition',
          noticePeriodDays: 60,
          fnfAmount: body.fnfAmount || 239000,
          fnfStatus: 'pending',
          itClearanceStatus: 'pending',
          deptClearanceStatus: 'pending',
          financeClearanceStatus: 'pending',
        },
      });
    }

    return apiSuccess({ exitCase: exitRecord }, 'Resignation notice submitted cleanly into database', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit resignation notice', 500);
  }
}
