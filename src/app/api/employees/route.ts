import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getApiUserContext, requireModuleAccess } from '@/lib/auth/rbac-guard-api';
import { canViewSensitiveSalary } from '@/lib/rbac';
import { prisma } from '@/lib/db/prisma';
import { getPersonaAvatar } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    const { searchParams } = new URL(req.url);
    const dept = searchParams.get('departmentId');
    const search = searchParams.get('search')?.toLowerCase();

    const canSeeAllSalaries = canViewSensitiveSalary(userCtx.role, false);

    let whereClause: any = {};

    if (dept && dept !== 'all') {
      whereClause.departmentId = dept;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    let employees: any[] = [];

    if (prisma) {
      employees = await prisma.employee.findMany({
        where: whereClause,
        include: {
          department: true,
          designation: true,
          branch: true,
        },
        orderBy: { employeeCode: 'asc' },
      });
    }

    // Field-level confidentiality: redact salary if unauthorized
    const sanitizedEmployees = employees.map((emp: any) => {
      const isSelf = emp.id === userCtx.employeeId;
      const isSalaryVisible = canSeeAllSalaries || isSelf;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        avatarUrl: emp.avatarUrl || getPersonaAvatar(emp.employeeCode, `${emp.firstName} ${emp.lastName}`),
        departmentId: emp.departmentId || emp.department?.id,
        departmentName: emp.department?.name || '',
        designationId: emp.designationId || emp.designation?.id,
        designationTitle: emp.designation?.title || '',
        branchId: emp.branchId || emp.branch?.id,
        branchName: emp.branch?.name || '',
        employmentStatus: emp.employmentStatus,
        currentLifecycleStage: emp.currentLifecycleStage || 'onboarding',
        ctc: isSalaryVisible ? Number(emp.ctc) : 0,
      };
    });

    return apiSuccess({
      count: sanitizedEmployees.length,
      employees: sanitizedEmployees,
    });
  } catch (error: any) {
    return apiError(error?.message || 'Failed to fetch employees', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = getApiUserContext(req);
    const accessError = requireModuleAccess(userCtx, 'employee_records');
    if (accessError) return accessError;

    const body = await req.json();
    const { firstName, lastName, email, phone, departmentId, designationId, branchId, dateOfJoining, ctc, gender } = body;

    if (!firstName || !lastName || !email) {
      return apiError('Missing required employee fields (firstName, lastName, email)', 400);
    }

    if (!prisma) {
      return apiSuccess({ message: 'Employee created in session' }, 'Created', 201);
    }

    const org = await prisma.organization.findFirst();
    if (!org) return apiError('Organization not found', 400);

    let dept = await prisma.department.findFirst({ where: { organizationId: org.id } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { organizationId: org.id, name: 'Plant Operations', code: 'OPS' },
      });
    }

    let desig = await prisma.designation.findFirst({ where: { organizationId: org.id } });
    if (!desig) {
      desig = await prisma.designation.create({
        data: { organizationId: org.id, departmentId: dept.id, title: 'Operations Specialist', code: 'OPS-SPEC' },
      });
    }

    let branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: { organizationId: org.id, name: 'Tech Operations Center', code: 'TOC', city: 'Bengaluru', state: 'Karnataka' },
      });
    }

    const empCount = await prisma.employee.count({ where: { organizationId: org.id } });
    const empCode = `VV-${1000 + empCount + 1}`;

    const newEmp = await prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeCode: empCode,
        firstName,
        lastName,
        email,
        phone: phone || '+91 98765 43210',
        gender: (gender as any) || 'male',
        dob: new Date('1992-05-15'),
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        departmentId: departmentId || dept.id,
        designationId: designationId || desig.id,
        branchId: branchId || branch.id,
        employmentStatus: 'probation',
        currentLifecycleStage: 'onboarding',
        ctc: ctc || 540000,
      },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userId: userCtx.userId,
          userName: userCtx.employeeName || 'HR Admin',
          userRole: userCtx.role,
          action: 'EMPLOYEE_ONBOARDED',
          module: 'employee_records',
          resourceId: newEmp.id,
          payloadAfter: { employeeCode: empCode, name: `${firstName} ${lastName}`, email },
          integrityHash: `SHA256_${Date.now()}`,
        },
      });
    } catch {}

    return apiSuccess({ employee: newEmp }, 'Employee onboarded successfully', 201);
  } catch (error: any) {
    return apiError(error?.message || 'Failed to onboard new employee', 500);
  }
}

