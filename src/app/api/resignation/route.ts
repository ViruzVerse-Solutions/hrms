import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'resignation_exit');
    if (accessError) return accessError;

    let exitCase: any = null;

    if (prisma) {
      // Find employee
      let empId = userCtx.employeeId;
      let emp = null;

      if (userCtx.role === 'employee') {
        emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { id: empId || '' },
              { employeeCode: empId || '' },
              { employeeCode: 'VV-1005' },
              { email: userCtx.email },
            ],
          },
        });
      } else {
        emp = await prisma.employee.findFirst({
          where: { employeeCode: 'VV-1005' },
        });
      }

      if (emp) {
        exitCase = await prisma.resignationExitCase.findFirst({
          where: { employeeId: emp.id },
          include: { employee: true },
        });
      }
    }

    if (!exitCase) {
      return apiSuccess({ exitCase: null });
    }

    const formattedCase = {
      id: exitCase.id,
      employeeId: exitCase.employeeId,
      employeeName: `${exitCase.employee.firstName} ${exitCase.employee.lastName}`,
      resignationDate: typeof exitCase.resignationDate === 'string' ? exitCase.resignationDate : exitCase.resignationDate.toISOString().split('T')[0],
      requestedLwd: typeof exitCase.lastWorkingDay === 'string' ? exitCase.lastWorkingDay : exitCase.lastWorkingDay.toISOString().split('T')[0],
      approvedLwd: typeof exitCase.lastWorkingDay === 'string' ? exitCase.lastWorkingDay : exitCase.lastWorkingDay.toISOString().split('T')[0],
      noticePeriodDays: exitCase.noticePeriodDays,
      reason: exitCase.reason,
      status: 'clearance_in_progress',
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
    };

    return apiSuccess({ exitCase: formattedCase });
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

    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: userCtx.employeeId || '' },
          { employeeCode: userCtx.employeeId || '' },
          { employeeCode: 'VV-1005' },
          { email: userCtx.email },
        ],
      },
    });

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
          fnfAmount: 239000,
        },
      });
    }

    return apiSuccess({ exitCase: exitRecord });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to submit resignation notice', 500);
  }
}
