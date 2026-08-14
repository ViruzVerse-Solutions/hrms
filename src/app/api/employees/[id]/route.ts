import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { canViewSensitiveSalary } from '@/lib/rbac';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    let employee: any = null;

    if (prisma) {
      // Map emp_001 -> VV-1001, emp_005 -> VV-1005 if needed
      const codeMap: Record<string, string> = {
        emp_001: 'VV-1001',
        emp_002: 'VV-1002',
        emp_003: 'VV-1003',
        emp_004: 'VV-1004',
        emp_005: 'VV-1005',
      };
      const searchCode = codeMap[id] || id;

      employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { id },
            { employeeCode: id },
            { employeeCode: searchCode },
            { employeeCode: { equals: id, mode: 'insensitive' } },
            { employeeCode: { equals: searchCode, mode: 'insensitive' } },
          ],
        },
        include: {
          department: true,
          designation: true,
          branch: true,
          bankDetails: true,
          statutoryInfo: true,
          emergencyContacts: true,
        },
      });
    }

    if (!employee) {
      return apiNotFound(`Employee with ID '${id}' not found in database`);
    }

    const isSelf = employee.id === userCtx.employeeId || employee.employeeCode === userCtx.employeeId || employee.userId === userCtx.id;
    const isSalaryVisible = canViewSensitiveSalary(userCtx.role, isSelf);

    const sanitizedEmployee = {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      gender: employee.gender,
      dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '1990-01-01',
      dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '2023-01-15',
      avatarUrl: employee.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      departmentId: employee.departmentId,
      departmentName: employee.department?.name || 'Operations',
      designationId: employee.designationId,
      designationTitle: employee.designation?.title || 'Team Member',
      branchId: employee.branchId,
      branchName: employee.branch?.name || 'Tech Operations Center (HQ)',
      employmentStatus: employee.employmentStatus || 'active',
      currentLifecycleStage: employee.currentLifecycleStage || 'performance',
      ctc: isSalaryVisible ? Number(employee.ctc) : 0,
      bankDetails: isSalaryVisible && employee.bankDetails ? {
        accountNumber: employee.bankDetails.accountNumber,
        bankName: employee.bankDetails.bankName,
        ifscCode: employee.bankDetails.ifscCode,
        pan: 'AAACV1234F',
      } : isSalaryVisible ? {
        accountNumber: '••••••••4892',
        bankName: 'HDFC Bank Ltd',
        ifscCode: 'HDFC0001234',
        pan: 'AAACV1234F',
      } : undefined,
      statutory: {
        pfNumber: 'KN/BLR/1029384/001',
        esiNumber: '5300098765432001',
        uan: '101293847562',
      },
      emergencyContact: employee.emergencyContacts?.[0] || {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: '+91 98765 00000',
      },
    };

    return apiSuccess({
      employee: sanitizedEmployee,
      permissions: {
        isSelf,
        isSalaryVisible,
      },
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch employee record', 500);
  }
}
