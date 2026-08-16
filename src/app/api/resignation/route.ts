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
            ...(userCtx.employeeId ? [{ id: userCtx.employeeId }, { employeeCode: userCtx.employeeId }] : []),
            ...(userCtx.email ? [{ email: userCtx.email }] : []),
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
      ffSettlement: (() => {
        const ctc = Number(exitCase.employee?.ctc || 0);
        const monthlyGross = Math.round(ctc / 12);
        const pendingSalary = Math.round(monthlyGross * 0.9);
        const leaveEncashment = Math.round((monthlyGross / 30) * 12);
        const bonusGratuity = Math.round((monthlyGross / 26) * 15 * 0.5);
        const netTotal = Number(exitCase.fnfAmount) || (pendingSalary + leaveEncashment + bonusGratuity);
        return {
          pendingSalary,
          leaveEncashment,
          bonusGratuity,
          noticeShortfallDeduction: 0,
          assetDeduction: 0,
          totalNetSettlement: netTotal,
          status: exitCase.fnfStatus || 'draft',
        };
      })(),
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
          ...(body.employeeId || userCtx.employeeId ? [{ id: body.employeeId || userCtx.employeeId }, { employeeCode: body.employeeId || userCtx.employeeId }] : []),
          ...(userCtx.email ? [{ email: userCtx.email }] : []),
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

    const defaultLwdObj = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const lwdDate = (body.lastWorkingDay || body.requestedLwd) ? new Date(body.lastWorkingDay || body.requestedLwd) : defaultLwdObj;
    const calcFnfAmount = body.fnfAmount ? Number(body.fnfAmount) : Math.round((Number(emp.ctc || 0) / 12) * 1.5);

    let exitRecord;
    if (existing) {
      exitRecord = await prisma.resignationExitCase.update({
        where: { id: existing.id },
        data: {
          lastWorkingDay: lwdDate,
          reason: body.reason || '',
        },
      });
    } else {
      const org = await prisma.organization.findFirst();
      if (!org) return apiError('Organization not found', 404);

      exitRecord = await prisma.resignationExitCase.create({
        data: {
          organization: { connect: { id: org.id } },
          employee: { connect: { id: emp.id } },
          resignationDate: new Date(),
          lastWorkingDay: lwdDate,
          reason: body.reason || '',
          noticePeriodDays: 60,
          fnfAmount: calcFnfAmount,
          fnfStatus: 'pending',
          itClearanceStatus: 'pending',
          deptClearanceStatus: 'pending',
          financeClearanceStatus: 'pending',
        } as any,
      });
    }

    return apiSuccess({ exitCase: exitRecord }, 'Resignation notice submitted cleanly into database', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit resignation notice', 500);
  }
}
