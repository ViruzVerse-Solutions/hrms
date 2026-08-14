import { NextRequest } from 'next/server';
import { UserRole, ModuleKey } from '@/types';
import { getModulePermission, canPerformAction } from '@/lib/rbac';
import { apiForbidden } from '@/lib/api-response';

export interface AuthenticatedUserContext {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

/**
 * Extracts user context from headers / session cookie.
 * For MVP demo simulation, reads `x-user-role` and `x-user-id` or falls back to active session.
 */
export function getApiUserContext(req: NextRequest): AuthenticatedUserContext {
  const roleHeader = req.headers.get('x-user-role') as UserRole | null;
  const userHeader = req.headers.get('x-user-id') || 'usr_hr_admin';
  const employeeHeader = req.headers.get('x-employee-id') || 'emp_001';

  const validRoles: UserRole[] = [
    'super_admin',
    'hr_admin',
    'hr_executive',
    'payroll_officer',
    'reporting_manager',
    'employee',
  ];

  const role: UserRole = roleHeader && validRoles.includes(roleHeader) ? roleHeader : 'hr_admin';

  return {
    id: userHeader,
    name: 'Authenticated User',
    email: 'user@viruzverse.com',
    role,
    employeeId: employeeHeader,
  };
}

/**
 * Validates whether the calling role has minimum module permission.
 */
export function requireModuleAccess(user: AuthenticatedUserContext, module: ModuleKey) {
  const perm = getModulePermission(user.role, module);
  if (perm === 'NONE') {
    return apiForbidden(`Role '${user.role}' has NO permission to access module '${module}'`);
  }
  return null;
}

/**
 * Validates specific action permission (create, read, update, delete, approve, self).
 */
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
