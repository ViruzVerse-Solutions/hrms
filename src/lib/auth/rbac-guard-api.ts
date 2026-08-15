import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UserRole, ModuleKey } from '@/types';
import { getModulePermission, canPerformAction } from '@/lib/rbac';
import { apiForbidden } from '@/lib/api-response';

const prisma = new PrismaClient();

export interface AuthenticatedUserContext {
  userId: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  email: string;
  role: UserRole;
}

export async function getApiUserContextAsync(req: NextRequest): Promise<AuthenticatedUserContext> {
  const roleHeader = req.headers.get('x-user-role') as UserRole | null;
  const employeeHeader = req.headers.get('x-employee-id');

  const validRoles: UserRole[] = [
    'chairman',
    'managing_director',
    'hr_head',
    'internal_audit_head',
    'compliance_statutory',
    'employee',
  ];

  const role: UserRole = roleHeader && validRoles.includes(roleHeader) ? roleHeader : 'hr_head';

  try {
    // 1. If explicit employeeId / code header passed
    if (employeeHeader) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: employeeHeader },
            { employeeCode: employeeHeader },
          ],
        },
        include: { user: true },
      });
      if (emp) {
        return {
          userId: emp.user?.id || emp.id,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          role: (emp.user?.activeRole as UserRole) || role,
        };
      }
    }

    // 2. Lookup by role in database
    const user = await prisma.user.findFirst({
      where: { activeRole: role },
      include: { employee: true },
    });

    if (user) {
      return {
        userId: user.id,
        employeeId: user.employee?.id || user.employeeId || undefined,
        employeeCode: user.employee?.employeeCode,
        employeeName: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.name,
        email: user.email,
        role: user.activeRole as UserRole,
      };
    }

    // 3. Dynamic DB fallback to first employee
    const firstEmp = await prisma.employee.findFirst({ include: { user: true } });
    if (firstEmp) {
      return {
        userId: firstEmp.user?.id || firstEmp.id,
        employeeId: firstEmp.id,
        employeeCode: firstEmp.employeeCode,
        employeeName: `${firstEmp.firstName} ${firstEmp.lastName}`,
        email: firstEmp.email,
        role,
      };
    }
  } catch (error) {
    console.error('Database context resolution warning:', error);
  }

  return {
    userId: 'usr_default',
    employeeName: 'Authenticated User',
    email: 'user@viruzverse.com',
    role,
  };
}

export function getApiUserContext(req: NextRequest): AuthenticatedUserContext {
  const roleHeader = req.headers.get('x-user-role') as UserRole | null;
  const validRoles: UserRole[] = [
    'chairman',
    'managing_director',
    'hr_head',
    'internal_audit_head',
    'compliance_statutory',
    'employee',
  ];
  const role: UserRole = roleHeader && validRoles.includes(roleHeader) ? roleHeader : 'hr_head';
  return {
    userId: 'usr_default',
    email: 'user@viruzverse.com',
    role,
  };
}

export async function authenticateApiRequest(
  req: NextRequest,
  module: ModuleKey,
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self' = 'read'
) {
  const userCtx = await getApiUserContextAsync(req);
  if (!canPerformAction(userCtx.role, module, action)) {
    return {
      authorized: false,
      error: `Role '${userCtx.role}' lacks '${action}' permission for module '${module}'`,
      status: 403,
      userCtx,
    };
  }
  return {
    authorized: true,
    userCtx,
    status: 200,
  };
}

export function requireModuleAccess(user: AuthenticatedUserContext, module: ModuleKey) {
  const perm = getModulePermission(user.role, module);
  if (perm === 'NONE') {
    return apiForbidden(`Role '${user.role}' has NO permission to access module '${module}'`);
  }
  return null;
}

export function requireActionPermission(
  user: AuthenticatedUserContext,
  module: ModuleKey,
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'self'
) {
  if (!canPerformAction(user.role, module, action)) {
    return apiForbidden(`Role '${user.role}' cannot perform '${action}' on '${module}'`);
  }
  return null;
}
